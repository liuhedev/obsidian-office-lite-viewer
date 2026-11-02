import { CFB as untypedCFB } from 'xlsx';

import { Unzip, UnzipInflate } from 'fflate';
import { SaxesParser } from 'saxes';
import { MAX_BYTES, type DocumentData } from './model';

// SheetJS exposes CFB as any; constrain the two APIs used by this parser.
const CFB = untypedCFB as {
  read(bytes: Uint8Array, options: { type: 'array' }): unknown;
  find(compound: unknown, path: string): { content?: Uint8Array | number[] } | null;
};

const MAX_TEXT = 2_000_000;
const WORD_NS = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main']);
export const isCompound = (bytes: Uint8Array): boolean =>
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, i) => bytes[i] === value);

export function readCompound(bytes: Uint8Array): unknown {
  try { return CFB.read(bytes, { type: 'array' }); }
  catch { throw new Error('Invalid or truncated compound Office file.'); }
}

export function compoundStream(compound: unknown, name: string): Uint8Array | undefined {
  const entry = CFB.find(compound, '/' + name);
  return entry?.content ? new Uint8Array(entry.content) : undefined;
}

function result(text: string, format: string): DocumentData {
  return { kind: 'text', text, sheets: [], warnings: [],
    details: `${format} · Body text only; no layout, images, headers, footnotes or comments. Hidden/revised text may appear.` };
}

// MS-DOC: Fib, Clx, PlcPcd and FcCompressed. Only the main story is read.
// https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/
export function doc(bytes: Uint8Array): DocumentData {
  if (!isCompound(bytes)) throw new Error('Not a binary Word 97–2003 DOC file. RTF, HTML and older Word formats are not supported.');
  const compound = readCompound(bytes);
  const stream = (name: string): Uint8Array => {
    const content = compoundStream(compound, name);
    if (!content) throw new Error(`Invalid DOC: missing ${name} stream.`);
    return content;
  };
  if (CFB.find(compound, '/EncryptedPackage')) throw new Error('Encrypted documents are not supported.');
  const word = stream('WordDocument');
  const view = new DataView(word.buffer, word.byteOffset, word.byteLength);
  if (word.length < 0x1aa || view.getUint16(0, true) !== 0xa5ec) throw new Error('Invalid or truncated DOC header.');
  if (![0xc1, 0xd9, 0x101, 0x10c].includes(view.getUint16(2, true))) throw new Error('Unsupported DOC version; use Word 97–2003 or DOCX.');
  const flags = view.getUint16(10, true);
  if (flags & 0x8100) throw new Error('Encrypted DOC files are not supported.');
  const count = view.getUint32(0x4c, true);
  if (count > MAX_TEXT) throw new Error('Word body exceeds the 2,000,000 character preview limit.');
  const table = stream(flags & 0x200 ? '1Table' : '0Table');
  const tv = new DataView(table.buffer, table.byteOffset, table.byteLength);
  let pos = view.getUint32(0x1a2, true);
  const end = pos + view.getUint32(0x1a6, true);
  const invalid = (): never => { throw new Error('Invalid or truncated DOC piece table.'); };
  if (end > table.length || pos >= end) invalid();
  while (table[pos] === 1) {
    if (pos + 3 > end) invalid();
    pos += 3 + tv.getUint16(pos + 1, true);
    if (pos >= end) invalid();
  }
  if (table[pos++] !== 2 || pos + 4 > end) invalid();
  const size = tv.getUint32(pos, true); pos += 4;
  if (size < 4 || (size - 4) % 12 || pos + size > end) invalid();
  const pieces = (size - 4) / 12;
  if (tv.getUint32(pos, true) !== 0) invalid();
  const parts: string[] = [];
  let previous = 0;
  for (let i = 0; i < pieces; i++) {
    const next = tv.getUint32(pos + (i + 1) * 4, true);
    if (next < previous) invalid();
    const length = Math.max(0, Math.min(next, count) - previous);
    const fc = tv.getUint32(pos + (pieces + 1) * 4 + i * 8 + 2, true);
    if (fc & 0x80000000) invalid();
    const compressed = !!(fc & 0x40000000);
    const offset = compressed ? (fc & 0x3fffffff) / 2 : fc;
    const limit = offset + (next - previous) * (compressed ? 1 : 2);
    if (!Number.isInteger(offset) || limit > word.length) invalid();
    if (length) parts.push(new TextDecoder(compressed ? 'windows-1252' : 'utf-16le').decode(word.subarray(offset, offset + length * (compressed ? 1 : 2))));
    previous = next;
  }
  if (previous < count) invalid();
  // Field instructions (e.g. hyperlink targets) are not body text. Keep saved results.
  const fields: boolean[] = [];
  let instructions = 0;
  const clean: string[] = [];
  for (const char of parts.join('')) {
    if (char === '\x13') { fields.push(false); instructions++; continue; }
    if (char === '\x14') {
      if (fields.length && !fields[fields.length - 1]) { fields[fields.length - 1] = true; instructions--; }
      continue;
    }
    if (char === '\x15') { if (fields.pop() === false) instructions--; continue; }
    if (instructions) continue;
    if (char === '\r' || char === '\x0b' || char === '\x0c') clean.push('\n');
    else if (char === '\x07') clean.push('\t');
    else if (char === '\t' || char === '\n' || char.charCodeAt(0) >= 32) clean.push(char);
  }
  return result(clean.join(''), 'DOC');
}

export function docx(bytes: Uint8Array): DocumentData {
  if (isCompound(bytes)) throw new Error('Encrypted or binary document; encrypted DOCX is not supported. For binary Word files use .doc.');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Not a DOCX ZIP package.');
  // Require a complete, single-disk ZIP directory (ZIP64 is unnecessary at this input limit).
  const zip = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let directory = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (zip.getUint32(i, true) === 0x06054b50 && i + 22 + zip.getUint16(i + 20, true) === bytes.length) { directory = i; break; }
  }
  if (directory < 0 || zip.getUint32(directory + 4, true) !== 0
    || zip.getUint16(directory + 8, true) !== zip.getUint16(directory + 10, true)
    || !zip.getUint16(directory + 10, true)
    || zip.getUint32(directory + 16, true) + zip.getUint32(directory + 12, true) !== directory) {
    throw new Error('Invalid or truncated DOCX ZIP directory.');
  }
  const parts: string[] = [];
  let chars = 0; let xmlBytes = 0; let found = false; let completed = false;
  let depth = 0; let body = false; let sawBody = false; let root = false; let textDepth = 0;
  const append = (value: string) => {
    chars += value.length;
    if (chars > MAX_TEXT) throw new Error('Word body exceeds the 2,000,000 character preview limit.');
    parts.push(value);
  };
  const xml = new SaxesParser({ xmlns: true });
  xml.on('doctype', () => { throw new Error('DOCX XML document types are not supported.'); });
  xml.on('opentag', tag => {
    if (++depth > 256) throw new Error('DOCX XML nesting limit exceeded.');
    const word = WORD_NS.has(tag.uri);
    if (depth === 1) {
      if (!word || tag.local !== 'document') throw new Error('Invalid DOCX document root.');
      root = true;
    }
    if (word && tag.local === 'body') {
      if (depth !== 2 || sawBody) throw new Error('Invalid DOCX body structure.');
      body = true; sawBody = true;
    }
    if (!body || !word) return;
    if (tag.local === 't') textDepth = depth;
    else if (tag.local === 'tab') append('\t');
    else if (tag.local === 'br' || tag.local === 'cr') append('\n');
  });
  xml.on('text', value => { if (textDepth) append(value); });
  xml.on('cdata', value => { if (textDepth) append(value); });
  xml.on('closetag', tag => {
    if (body && WORD_NS.has(tag.uri)) {
      if (tag.local === 'p') append('\n');
      if (tag.local === 'tc') append('\t');
      if (tag.local === 'body') body = false;
    }
    if (depth === textDepth) textDepth = 0;
    depth--;
  });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const unzip = new Unzip(file => {
    if (file.name !== 'word/document.xml') return;
    if (found) throw new Error('Duplicate DOCX body entry.');
    found = true;
    file.ondata = (error, data, final) => {
      if (error) throw error;
      xmlBytes += data.length;
      if (xmlBytes > MAX_BYTES) throw new Error('DOCX body XML exceeds the 20 MiB expanded limit.');
      xml.write(decoder.decode(data, { stream: !final }));
      if (final) { xml.close(); completed = true; }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Small compressed chunks bound transient inflation, even for hostile ZIP input.
  for (let offset = 0; offset < bytes.length; offset += 1024) unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
  if (!found || !completed || !root || !sawBody) throw new Error('Invalid or truncated DOCX: missing complete body XML.');
  return result(parts.join(''), 'DOCX');
}
