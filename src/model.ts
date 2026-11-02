export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_ROWS = 10_000;
export const MAX_COLS = 100;
export const MAX_SHEETS = 20;
export const MAX_CELLS = 500_000;
export type Encoding = 'auto' | 'utf-8' | 'gb18030' | 'utf-16le' | 'utf-16be';
export interface ParseOptions { encoding: Encoding; delimiter: string }
export interface Sheet { name: string; rows: string[][]; columns: number; warnings: string[] }
export interface DocumentData { kind?: 'json' | 'text'; json?: unknown; text?: string; sheets: Sheet[]; details: string; warnings: string[] }
export type ParseReply = { ok: true; data: DocumentData } | { ok: false; error: string };
export function columnName(index: number): string {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + (n - 1) % 26) + label;
  }
  return label;
}
