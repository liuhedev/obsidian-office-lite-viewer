import type { DocumentData } from './model';

export class WordPreview {
  constructor(private host: HTMLElement, data: DocumentData) {
    const body = createEl('div');
    body.className = 'ov-word-text';
    body.tabIndex = 0;
    body.setAttribute('role', 'document');
    body.setAttribute('aria-label', 'Word body text preview');
    // One text node preserves paragraphs without thousands of DOM elements.
    body.textContent = data.text || '(No body text)';
    host.replaceChildren(body);
  }
  destroy(): void { this.host.replaceChildren(); }
}
