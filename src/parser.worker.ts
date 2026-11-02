import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { MAX_BYTES, MAX_CELLS, MAX_COLS, MAX_ROWS, MAX_SHEETS, type DocumentData, type ParseOptions, type ParseReply, type Sheet } from './model';

function decode(bytes: Uint8Array, encoding: ParseOptions['encoding']): { text: string; label: string } {
  let label: string = encoding;
  if (encoding === 'auto') {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) label = 'utf-16le';
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) label = 'utf-16be';
    else {
      try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), label: 'utf-8' }; }
      catch { label = 'gb18030'; }
    }
  }
  return { text: new TextDecoder(label, { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''), label };
}

function csv(bytes: Uint8Array, options: ParseOptions): DocumentData {
  const { text, label } = decode(bytes, options.encoding);
  const result = Papa.parse<string[]>(text, {
    delimiter: options.delimiter, delimitersToGuess: [',', '\t', ';', '|'],
    dynamicTyping: false, preview: MAX_ROWS + 1, skipEmptyLines: false,
  });
  const warnings = result.errors.filter(e => e.code !== 'UndetectableDelimiter')
    .slice(0, 3).map(e => `CSV ${e.row === undefined ? '' : `row ${e.row + 1}: `}${e.message}`);
  const rows = result.data;
  // Papa represents a final newline as an extra empty record.
  if (/[\r\n]$/.test(text) && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '') rows.pop();
  if (rows.length > MAX_ROWS || result.meta.truncated) warnings.push(`Preview limited to ${MAX_ROWS.toLocaleString()} rows.`);
  const columns = Math.min(MAX_COLS, rows.reduce((max, row) => Math.max(max, row.length), 0));
  if (rows.some(row => row.length > MAX_COLS)) warnings.push(`Preview limited to ${MAX_COLS} columns.`);
  const rowLimit = Math.min(MAX_ROWS, Math.floor(MAX_CELLS / Math.max(columns, 1)));
  if (rows.length > rowLimit && rowLimit < MAX_ROWS) warnings.push(`Preview limited to ${MAX_CELLS.toLocaleString()} cells.`);
  return { sheets: [{ name: 'CSV', rows: rows.slice(0, rowLimit).map(row => row.slice(0, columns)), columns, warnings }],
    details: `${label.toUpperCase()} · ${result.meta.delimiter === '\t' ? 'Tab' : result.meta.delimiter || ','} delimiter`, warnings: [] };
}

function xlsx(bytes: Uint8Array): DocumentData {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('This is not an XLSX workbook. Re-export it as .xlsx and try again.');
  const workbook = XLSX.read(bytes, { type: 'array', dense: true, sheetRows: MAX_ROWS, cellHTML: false, cellFormula: true, cellStyles: false, bookVBA: false });
  let budget = MAX_CELLS;
  const sheets: Sheet[] = [];
  const warnings: string[] = [];
  if (workbook.SheetNames.length > MAX_SHEETS) warnings.push(`Preview limited to ${MAX_SHEETS} worksheets.`);
  for (const name of workbook.SheetNames.slice(0, MAX_SHEETS)) {
    if (budget <= 0) { warnings.push('Workbook cell limit reached; remaining worksheets are not shown.'); break; }
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const notes: string[] = [];
    const ref = sheet['!fullref'] || sheet['!ref'];
    if (!ref) { sheets.push({ name, rows: [], columns: 0, warnings: [] }); continue; }
    const range = XLSX.utils.decode_range(ref);
    const columns = Math.min(MAX_COLS, range.e.c + 1);
    const rowLimit = Math.min(MAX_ROWS, Math.floor(budget / Math.max(columns, 1)));
    if (rowLimit < 1) { warnings.push('Workbook cell limit reached.'); break; }
    if (range.e.r >= rowLimit) notes.push(`Preview limited to ${rowLimit.toLocaleString()} rows.`);
    if (range.e.c >= MAX_COLS) notes.push(`Preview limited to ${MAX_COLS} columns.`);
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1, raw: false, defval: '', blankrows: true,
      range: { s: { r: 0, c: 0 }, e: { r: Math.min(range.e.r, rowLimit - 1), c: columns - 1 } },
    });
    // Formula cells without cached values have no result to display.
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < columns; c++) {
      const cell = (sheet['!data'] as XLSX.CellObject[][] | undefined)?.[r]?.[c];
      if (cell?.f && cell.v == null) rows[r]![c] = `=${cell.f}`;
    }
    budget -= rows.length * columns;
    sheets.push({ name, rows, columns, warnings: notes });
  }
  return { sheets, details: 'XLSX · Cached values; formulas are not recalculated', warnings };
}

function json(bytes: Uint8Array): DocumentData {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Invalid JSON. Check syntax (JSON comments and trailing commas are not supported).'); }
  const sheets: Sheet[] = [];
  if (Array.isArray(value) && value.length && value.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) {
    const keys: string[] = []; const seen = new Set<string>();
    let truncated = value.length >= MAX_ROWS;
    for (const item of value.slice(0, MAX_ROWS - 1)) for (const key of Object.keys(item)) {
      if (!seen.has(key)) { if (keys.length >= MAX_COLS) { truncated = true; continue; } seen.add(key); keys.push(key); }
    }
    const limit = Math.min(MAX_ROWS - 1, Math.floor(MAX_CELLS / Math.max(1, keys.length)) - 1);
    if (value.length > limit) truncated = true;
    const rows = [keys, ...value.slice(0, limit).map(item => keys.map(key => {
      if (!Object.prototype.hasOwnProperty.call(item, key)) return '';
      const cell = item[key];
      if (typeof cell === 'string') return cell;
      try { return JSON.stringify(cell); } catch { return '[Nested value too deep for table; use Tree]'; }
    }))];
    sheets.push({ name: 'JSON', rows, columns: keys.length, warnings: truncated ? ['Table preview truncated by row, column or cell limits. Use Tree to inspect other data.'] : [] });
  }
  return { kind: 'json', json: value, sheets, details: 'JSON · UTF-8 · Numbers use JavaScript precision', warnings: [] };
}

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; extension: string; options: ParseOptions }>) => {
  let reply: ParseReply;
  try {
    const { buffer, extension, options } = event.data;
    if (buffer.byteLength > MAX_BYTES) throw new Error('File exceeds the 20 MiB preview limit.');
    const bytes = new Uint8Array(buffer);
    const data = extension === 'json' ? json(bytes) : extension === 'csv' ? csv(bytes, options) : xlsx(bytes);
    reply = { ok: true, data };
  } catch (error) { reply = { ok: false, error: error instanceof Error ? error.message : 'Unable to read this file.' }; }
  self.postMessage(reply);
};
