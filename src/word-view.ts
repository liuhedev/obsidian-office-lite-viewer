import type { DocumentData } from './model';

export class WordPreview {
  constructor(private host: HTMLElement, data: DocumentData) {
    host.replaceChildren();
    const body = host.createDiv({ cls: 'ov-word-text' });
    body.tabIndex = 0;
    body.setAttribute('role', 'document');
    body.setAttribute('aria-label', 'Word body text preview');
    // One text node preserves paragraphs without thousands of DOM elements.
    body.textContent = data.text || '(No body text)';
  }
  destroy(): void { this.host.replaceChildren(); }
}
