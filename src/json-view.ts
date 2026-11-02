import type { DocumentData } from './model';

export class JsonPreview {
  constructor(private host: HTMLElement, data: DocumentData) {
    const pre = createEl('pre');
    pre.className = 'ov-json-text';
    pre.tabIndex = 0;
    pre.setAttribute('aria-label', 'JSON preview');
    const code = createEl('code');
    code.textContent = typeof data.json === 'string' ? data.json : '';
    pre.append(code);
    host.replaceChildren(pre);
  }
  destroy(): void { this.host.replaceChildren(); }
}
