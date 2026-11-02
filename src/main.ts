import { Component, FileView, FuzzySuggestModal, MarkdownRenderChild, Notice, Plugin, TFile, normalizePath, type App, type WorkspaceLeaf } from 'obsidian';
import { MAX_BYTES, type Encoding, type ParseOptions } from './model';
import { DocumentReader } from './reader';
import { SpreadsheetGrid } from './grid';

const VIEW_TYPE = 'office-view';
const supported = (file: TFile) => ['csv', 'xlsx'].includes(file.extension.toLowerCase());

class Preview extends Component {
  private reader = new DocumentReader();
  private grid?: SpreadsheetGrid;
  private generation = 0;
  private options: ParseOptions = { encoding: 'auto', delimiter: '' };
  private gridHost!: HTMLElement;
  private details!: HTMLElement;
  constructor(private app: App, private host: HTMLElement, private file: TFile) { super(); }
  onload(): void {
    this.host.classList.add('office-view'); this.host.replaceChildren();
    const bar = this.host.createDiv({ cls: 'ov-filebar' });
    bar.createSpan({ cls: 'ov-filename', text: this.file.name });
    bar.createSpan({ cls: 'ov-readonly', text: 'Read only' });
    if (this.file.extension.toLowerCase() === 'csv') {
      this.select(bar, 'Encoding', [['auto', 'Auto encoding'], ['utf-8', 'UTF-8'], ['gb18030', 'GB18030 / GBK'], ['utf-16le', 'UTF-16 LE'], ['utf-16be', 'UTF-16 BE']], value => { this.options.encoding = value as Encoding; void this.refresh(); });
      this.select(bar, 'Delimiter', [['', 'Auto delimiter'], [',', 'Comma'], ['\t', 'Tab'], [';', 'Semicolon'], ['|', 'Pipe']], value => { this.options.delimiter = value; void this.refresh(); });
    }
    const reload = bar.createEl('button', { text: 'Reload', attr: { title: 'Reload from disk' } });
    this.registerDomEvent(reload, 'click', () => void this.refresh());
    this.details = this.host.createDiv({ cls: 'ov-details' });
    this.gridHost = this.host.createDiv({ cls: 'ov-grid' });
    this.registerEvent(this.app.vault.on('modify', file => { if (file === this.file) void this.refresh(); }));
    void this.refresh();
  }
  private select(host: HTMLElement, label: string, choices: string[][], change: (value: string) => void): void {
    const select = host.createEl('select', { attr: { 'aria-label': label } });
    for (const [value, text] of choices) select.createEl('option', { value, text });
    this.registerDomEvent(select, 'change', () => change(select.value));
  }
  private async refresh(): Promise<void> {
    const generation = ++this.generation;
    this.reader.dispose(); this.grid?.destroy(); this.grid = undefined;
    this.gridHost.textContent = 'Loading preview…'; this.details.textContent = '';
    try {
      if (this.file.stat.size > MAX_BYTES) throw new Error('File exceeds the 20 MiB preview limit. Open a smaller file.');
      const buffer = await this.app.vault.readBinary(this.file);
      if (generation !== this.generation) return;
      const data = await this.reader.parse(buffer, this.file.extension.toLowerCase(), this.options);
      if (generation !== this.generation) return;
      this.details.textContent = data.details;
      this.grid = new SpreadsheetGrid(this.gridHost, data);
    } catch (error) {
      if (generation !== this.generation) return;
      this.gridHost.replaceChildren();
      this.gridHost.createEl('p', { cls: 'ov-error', text: error instanceof Error ? error.message : 'Unable to preview this file.' });
    }
  }
  onunload(): void { this.generation++; this.reader.dispose(); this.grid?.destroy(); this.host.replaceChildren(); }
}

class OfficeFileView extends FileView {
  private preview?: Preview;
  getViewType(): string { return VIEW_TYPE; }
  getIcon(): string { return 'sheet'; }
  canAcceptExtension(extension: string): boolean { return ['csv', 'xlsx'].includes(extension.toLowerCase()); }
  async onLoadFile(file: TFile): Promise<void> {
    if (this.preview) this.removeChild(this.preview);
    this.preview = new Preview(this.app, this.contentEl, file); this.addChild(this.preview);
  }
  async onUnloadFile(): Promise<void> { if (this.preview) this.removeChild(this.preview); this.preview = undefined; }
}

class OfficePicker extends FuzzySuggestModal<TFile> {
  constructor(app: App, private openFile: (file: TFile) => void) { super(app); this.setPlaceholder('Open a CSV or XLSX file…'); }
  getItems(): TFile[] { return this.app.vault.getFiles().filter(supported); }
  getItemText(file: TFile): string { return file.path; }
  onChooseItem(file: TFile): void { this.openFile(file); }
}

export default class OfficeViewPlugin extends Plugin {
  onunload(): void { this.app.workspace.detachLeavesOfType(VIEW_TYPE); }
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => new OfficeFileView(leaf));
    for (const extension of ['csv', 'xlsx']) {
      try { this.registerExtensions([extension], VIEW_TYPE); }
      catch { new Notice(`Office View: another plugin handles .${extension}. Use “Open spreadsheet” or the file menu.`); }
    }
    const open = (file: TFile) => { void this.app.workspace.getLeaf('tab').setViewState({ type: VIEW_TYPE, state: { file: file.path }, active: true }); };
    this.addCommand({ id: 'open-spreadsheet', name: 'Open spreadsheet', callback: () => new OfficePicker(this.app, open).open() });
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (file instanceof TFile && supported(file)) menu.addItem(item => item.setTitle('Open in Office View').setIcon('sheet').onClick(() => open(file)));
    }));
    this.registerMarkdownCodeBlockProcessor('office-view', (source, host, context) => {
      const path = source.trim();
      const file = this.app.metadataCache.getFirstLinkpathDest(path, context.sourcePath)
        ?? this.app.vault.getAbstractFileByPath(normalizePath(path));
      if (!(file instanceof TFile) || !supported(file)) {
        host.createEl('p', { text: 'Office View: enter the path to an existing CSV or XLSX file.' }); return;
      }
      const child = new MarkdownRenderChild(host);
      child.addChild(new Preview(this.app, host, file)); context.addChild(child);
    });
  }
}
