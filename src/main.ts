import { Component, FileSystemAdapter, FileView, FuzzySuggestModal, MarkdownRenderChild, Notice, Platform, Plugin, TFile, normalizePath, setIcon, type App, type WorkspaceLeaf } from 'obsidian';
import { MAX_BYTES, type Encoding, type ParseOptions } from './model';
import { DocumentReader } from './reader';
import { SpreadsheetGrid } from './grid';
import { JsonPreview } from './json-view';
import { WordPreview } from './word-view';
import { HtmlPreview } from './html-view';

const VIEW_TYPE = 'office-lite-viewer';
const EXTENSIONS = ['csv', 'xls', 'xlsx', 'doc', 'docx', 'json', 'html', 'htm'];
const supported = (file: TFile) => EXTENSIONS.includes(file.extension.toLowerCase());

class Preview extends Component {
  private reader = new DocumentReader();
  private grid?: SpreadsheetGrid | JsonPreview | WordPreview | HtmlPreview;
  private generation = 0;
  private options: ParseOptions = { encoding: 'auto', delimiter: '' };
  private gridHost!: HTMLElement;
  private details!: HTMLElement;
  private controls!: HTMLElement;
  constructor(private app: App, private host: HTMLElement, private file: TFile) { super(); }
  onload(): void {
    this.host.classList.add('office-lite-viewer'); this.host.replaceChildren();
    const bar = this.host.createDiv({ cls: 'ov-filebar' });
    bar.createSpan({ cls: 'ov-filename', text: this.file.name });
    const options = bar.createEl('details', { cls: 'ov-options' });
    const trigger = options.createEl('summary', { text: '⋯', attr: { 'aria-label': 'Preview options', title: 'Preview options' } });
    this.registerDomEvent(this.host.ownerDocument, 'pointerdown', event => {
      if (!event.composedPath().includes(options)) options.open = false;
    });
    this.registerDomEvent(options, 'keydown', event => {
      if (event.key === 'Escape') { options.open = false; trigger.focus(); event.stopPropagation(); }
    });
    const controls = this.controls = options.createDiv({ cls: 'ov-options-panel' });
    controls.createSpan({ cls: 'ov-readonly', text: 'Read only' });
    if (this.file.extension.toLowerCase() === 'csv') {
      this.select(controls, 'Encoding', [['auto', 'Auto encoding'], ['utf-8', 'UTF-8'], ['gb18030', 'GB18030 / GBK'], ['utf-16le', 'UTF-16 LE'], ['utf-16be', 'UTF-16 BE']], value => { this.options.encoding = value as Encoding; void this.refresh(); });
      this.select(controls, 'Delimiter', [['', 'Auto delimiter'], [',', 'Comma'], ['\t', 'Tab'], [';', 'Semicolon'], ['|', 'Pipe']], value => { this.options.delimiter = value; void this.refresh(); });
    }
    const paths = controls.createEl('details', { cls: 'ov-copy-path' });
    this.registerDomEvent(options, 'toggle', () => { if (!options.open) paths.open = false; });
    const copy = paths.createEl('summary', { cls: 'ov-action' });
    setIcon(copy.createSpan({ cls: 'ov-action-icon' }), 'copy');
    copy.createSpan({ text: 'Copy path' });
    setIcon(copy.createSpan({ cls: 'ov-action-chevron' }), 'chevron-right');
    const choices = paths.createDiv({ cls: 'ov-path-choices' });
    const copyPath = async (value: string) => {
      try { await navigator.clipboard.writeText(value); options.open = false; new Notice('Path copied'); }
      catch { new Notice('Unable to copy the path to the clipboard.'); }
    };
    this.action(choices, 'Obsidian URL', 'link', () => copyPath(`obsidian://open?vault=${encodeURIComponent(this.app.vault.getName())}&file=${encodeURIComponent(this.file.path)}`));
    this.action(choices, 'Vault-relative path', 'folder', () => copyPath(this.file.path));
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) this.action(choices, 'Absolute path', 'hard-drive', () => copyPath(adapter.getFullPath(this.file.path)));
    this.action(controls, 'Reload', 'refresh-cw', () => { options.open = false; void this.refresh(); });
    const systemApp = this.app as App & { openWithDefaultApp?: (path: string) => Promise<void> | void };
    if (Platform.isDesktopApp && typeof systemApp.openWithDefaultApp === 'function') {
      const open = this.action(controls, 'Open in default app', 'external-link', async () => {
        open.disabled = true;
        try { await systemApp.openWithDefaultApp?.(this.file.path); options.open = false; }
        catch { new Notice('Unable to open this file. Check that a default application is configured for this file type.'); }
        finally { open.disabled = false; }
      });
    }
    this.details = controls.createDiv({ cls: 'ov-details' });
    this.gridHost = this.host.createDiv({ cls: 'ov-grid' });
    this.registerEvent(this.app.vault.on('modify', file => { if (file === this.file) void this.refresh(); }));
    void this.refresh();
  }
  private action(host: HTMLElement, text: string, icon: string, callback: () => void | Promise<void>): HTMLButtonElement {
    const button = host.createEl('button', { cls: 'ov-action', attr: { type: 'button' } });
    const symbol = button.createSpan({ cls: 'ov-action-icon', attr: { 'aria-hidden': 'true' } });
    setIcon(symbol, icon); button.createSpan({ text });
    this.registerDomEvent(button, 'click', () => void callback());
    return button;
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
      if (buffer.byteLength > MAX_BYTES) throw new Error('File exceeds the 20 MiB preview limit.');
      if (['html', 'htm'].includes(this.file.extension.toLowerCase())) {
        const html = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        this.details.textContent = 'UTF-8 HTML · isolated preview';
        this.grid = new HtmlPreview(this.gridHost, html);
        return;
      }
      const data = await this.reader.parse(buffer, this.file.extension.toLowerCase(), this.options);
      if (generation !== this.generation) return;
      this.details.textContent = data.details;
      this.grid = data.kind === 'json' ? new JsonPreview(this.gridHost, data)
        : data.kind === 'text' ? new WordPreview(this.gridHost, data)
        : new SpreadsheetGrid(this.gridHost, data, this.controls);
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
  canAcceptExtension(extension: string): boolean { return EXTENSIONS.includes(extension.toLowerCase()); }
  async onLoadFile(file: TFile): Promise<void> {
    if (this.preview) this.removeChild(this.preview);
    this.preview = new Preview(this.app, this.contentEl, file); this.addChild(this.preview);
  }
  async onUnloadFile(): Promise<void> { if (this.preview) this.removeChild(this.preview); this.preview = undefined; }
}

class OfficePicker extends FuzzySuggestModal<TFile> {
  constructor(app: App, private openFile: (file: TFile) => void) { super(app); this.setPlaceholder('Open a CSV, XLS, XLSX, DOC, DOCX, JSON or HTML file…'); }
  getItems(): TFile[] { return this.app.vault.getFiles().filter(supported); }
  getItemText(file: TFile): string { return file.path; }
  onChooseItem(file: TFile): void { this.openFile(file); }
}

export default class OfficeLiteViewerPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => new OfficeFileView(leaf));
    for (const extension of EXTENSIONS) {
      try { this.registerExtensions([extension], VIEW_TYPE); }
      catch { new Notice(`Office Lite Viewer: another plugin handles .${extension}. Use “Open document” or the file menu.`); }
    }
    const open = (file: TFile) => { void this.app.workspace.getLeaf('tab').setViewState({ type: VIEW_TYPE, state: { file: file.path }, active: true }); };
    this.addCommand({ id: 'open-spreadsheet', name: 'Open document', callback: () => new OfficePicker(this.app, open).open() });
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (file instanceof TFile && supported(file)) menu.addItem(item => item.setTitle('Open in Office Lite Viewer').setIcon('sheet').onClick(() => open(file)));
    }));
    this.registerMarkdownCodeBlockProcessor('office-lite-viewer', (source, host, context) => {
      const path = source.trim();
      const file = this.app.metadataCache.getFirstLinkpathDest(path, context.sourcePath)
        ?? this.app.vault.getAbstractFileByPath(normalizePath(path));
      if (!(file instanceof TFile) || !supported(file)) {
        host.createEl('p', { text: 'Office Lite Viewer: enter the path to an existing CSV, XLS, XLSX, DOC, DOCX, JSON or HTML file.' }); return;
      }
      const child = new MarkdownRenderChild(host);
      child.addChild(new Preview(this.app, host, file)); context.addChild(child);
    });
  }
}
