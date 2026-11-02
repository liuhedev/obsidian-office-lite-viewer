import { columnName, type DocumentData, type Sheet } from './model';

const PAGE_SIZE = 100;
function element<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = cls;
  node.textContent = text;
  return node;
}

export class SpreadsheetGrid {
  private sheetIndex = 0;
  private query = '';
  private header = true;
  private page = 0;
  private sort: { column: number; direction: 1 | -1 } | null = null;
  private filtered: number[] = [];
  private readonly collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  private readonly tableArea = element('div', 'ov-table-area');
  private readonly footer = element('div', 'ov-footer');
  private readonly notes = element('div', 'ov-notes');
  private readonly tabs = element('div', 'ov-sheets');
  private readonly abort = new AbortController();

  constructor(private host: HTMLElement, private data: DocumentData, optionsHost?: HTMLElement) {
    const toolbar = element('div', 'ov-grid-toolbar');
    const search = element('input', 'ov-search');
    search.type = 'search'; search.placeholder = 'Search this sheet…'; search.setAttribute('aria-label', 'Search this sheet');
    search.addEventListener('input', () => { this.query = search.value; this.page = 0; this.updateRows(); }, { signal: this.abort.signal });
    const label = element('label', 'ov-header-toggle');
    const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = true;
    checkbox.addEventListener('change', () => { this.header = checkbox.checked; this.page = 0; this.updateRows(); }, { signal: this.abort.signal });
    label.append(checkbox, document.createTextNode('First row is header'));
    const options = element('details', 'ov-grid-options');
    const summary = element('summary', '', '⋯');
    summary.setAttribute('aria-label', 'Table options'); summary.title = 'Table options';
    options.append(summary, label);
    if (optionsHost) {
      optionsHost.querySelector('.ov-header-toggle')?.remove();
      optionsHost.append(label);
      toolbar.append(search);
    } else toolbar.append(search, options);
    this.tabs.setAttribute('role', 'group'); this.tabs.setAttribute('aria-label', 'Worksheets');
    this.tableArea.tabIndex = 0; this.tableArea.setAttribute('aria-label', 'Spreadsheet preview');
    this.host.replaceChildren(toolbar, this.notes, this.tableArea, this.footer, this.tabs);
    this.updateRows();
  }
  destroy(): void { this.abort.abort(); this.host.replaceChildren(); }
  private get sheet(): Sheet { return this.data.sheets[this.sheetIndex] ?? { name: '', rows: [], columns: 0, warnings: [] }; }
  private updateRows(): void {
    const sheet = this.sheet;
    const query = this.query.toLocaleLowerCase();
    this.filtered = [];
    for (let i = this.header ? 1 : 0; i < sheet.rows.length; i++) {
      if (!query || sheet.rows[i]!.some(cell => cell.toLocaleLowerCase().includes(query))) this.filtered.push(i);
    }
    const sort = this.sort;
    if (sort) this.filtered.sort((a, b) => sort.direction * this.collator.compare(sheet.rows[a]?.[sort.column] ?? '', sheet.rows[b]?.[sort.column] ?? '') || a - b);
    this.notes.textContent = [...this.data.warnings, ...sheet.warnings].join(' ');
    this.notes.hidden = !this.notes.textContent;
    this.render();
  }
  private render(): void {
    const sheet = this.sheet;
    const pages = Math.max(1, Math.ceil(this.filtered.length / PAGE_SIZE));
    this.page = Math.min(this.page, pages - 1);
    const table = element('table', 'ov-table');
    const caption = element('caption', 'ov-sr-only', `${sheet.name} — read-only preview`);
    table.append(caption);
    const head = table.createTHead().insertRow();
    const corner = element('th', 'ov-row-number', '#'); corner.scope = 'col'; head.append(corner);
    for (let c = 0; c < sheet.columns; c++) {
      const th = element('th'); th.scope = 'col';
      th.setAttribute('aria-sort', this.sort?.column === c ? (this.sort.direction === 1 ? 'ascending' : 'descending') : 'none');
      const name = this.header ? sheet.rows[0]?.[c] || columnName(c) : columnName(c);
      const button = element('button', 'ov-sort', name);
      button.title = `Sort by ${name}. Click again to reverse, then restore source order.`;
      if (this.sort?.column === c) button.append(document.createTextNode(this.sort.direction === 1 ? ' ↑' : ' ↓'));
      button.addEventListener('click', () => {
        this.sort = this.sort?.column !== c ? { column: c, direction: 1 } : this.sort.direction === 1 ? { column: c, direction: -1 } : null;
        this.page = 0; this.updateRows();
      });
      th.append(button); head.append(th);
    }
    const body = table.createTBody();
    for (const index of this.filtered.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE)) {
      const row = body.insertRow();
      const number = element('th', 'ov-row-number', String(index + 1)); number.scope = 'row'; row.append(number);
      for (let c = 0; c < sheet.columns; c++) {
        const value = sheet.rows[index]?.[c] ?? '';
        const cell = row.insertCell(); cell.textContent = value; cell.title = value;
      }
    }
    this.tableArea.replaceChildren(table);
    if (!this.filtered.length) this.tableArea.append(element('p', 'ov-empty', sheet.rows.length ? 'No matching rows.' : 'This worksheet is empty.'));
    this.tableArea.scrollTop = 0;
    const info = element('span', 'ov-count', `${this.filtered.length.toLocaleString()} rows · ${sheet.columns} columns`);
    const paging = element('div', 'ov-paging');
    const previous = element('button', '', 'Previous'); previous.disabled = this.page === 0;
    const next = element('button', '', 'Next'); next.disabled = this.page >= pages - 1;
    previous.addEventListener('click', () => { this.page--; this.render(); });
    next.addEventListener('click', () => { this.page++; this.render(); });
    paging.append(previous, element('span', '', `${this.page + 1} / ${pages}`), next);
    paging.hidden = pages <= 1;
    this.footer.replaceChildren(info, paging);
    this.tabs.hidden = this.data.sheets.length <= 1;
    this.tabs.replaceChildren();
    this.data.sheets.forEach((entry, index) => {
      const tab = element('button', 'ov-sheet', entry.name);
      tab.setAttribute('aria-pressed', String(index === this.sheetIndex));
      tab.addEventListener('click', () => { this.sheetIndex = index; this.page = 0; this.sort = null; this.updateRows(); });
      this.tabs.append(tab);
    });
  }
}
