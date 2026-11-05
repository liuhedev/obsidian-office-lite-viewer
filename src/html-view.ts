// HTML stays in an opaque-origin iframe, never in the Obsidian document.
export class HtmlPreview {
  private source = false;
  private frame?: HTMLIFrameElement;
  private url?: string;
  private body: HTMLElement;
  constructor(private host: HTMLElement, private html: string) {
    host.replaceChildren();
    const toolbar = host.createDiv({ cls: 'ov-html-toolbar' });
    const toggle = toolbar.createEl('button', { text: 'Show source', attr: { 'aria-pressed': 'false' } });
    toggle.addEventListener('click', () => {
      this.source = !this.source;
      toggle.textContent = this.source ? 'Show preview' : 'Show source';
      toggle.setAttribute('aria-pressed', String(this.source));
      this.render();
    });
    toolbar.createSpan({ text: 'Static preview · scripts and external resources disabled', cls: 'ov-html-note' });
    this.body = host.createDiv({ cls: 'ov-html-body' });
    this.render();
  }
  private render(): void {
    this.frame?.remove(); this.frame = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
    this.body.replaceChildren();
    if (this.source) {
      const pre = this.body.createEl('pre', { cls: 'ov-json-text' });
      pre.tabIndex = 0;
      pre.setAttribute('aria-label', 'HTML source');
      pre.createEl('code', { text: this.html });
      return;
    }
    // Template contents are inert: parsing does not run scripts or load images.
    const template = document.createElement('template');
    template.innerHTML = this.html;
    const clean = (root: DocumentFragment) => {
      for (const element of Array.from(root.querySelectorAll('*'))) {
        if (['SCRIPT', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'BASE', 'META', 'LINK', 'PORTAL', 'ANIMATE', 'ANIMATEMOTION', 'ANIMATETRANSFORM', 'SET'].includes(element.tagName.toUpperCase())) {
          element.remove(); continue;
        }
        for (const attribute of Array.from(element.attributes)) {
          const name = attribute.name.toLowerCase();
          if (name.startsWith('on') || ['srcdoc', 'srcset', 'action', 'formaction', 'target', 'ping', 'download', 'autofocus'].includes(name)) {
            element.removeAttribute(attribute.name);
          } else if (['href', 'xlink:href', 'src', 'poster', 'background', 'data'].includes(name)) {
            const value = attribute.value.trim();
            // Only same-document anchors and embedded raster images survive.
            if (!((name === 'href' || name === 'xlink:href') && value.startsWith('#')) &&
              !((name === 'src' || name === 'poster') && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,/i.test(value))) {
              element.removeAttribute(attribute.name);
            }
          }
        }
        if (element instanceof HTMLTemplateElement) clean(element.content);
      }
    };
    clean(template.content);
    const frame = this.frame = document.createElement('iframe');
    frame.className = 'ov-html-frame';
    frame.title = 'HTML preview';
    frame.setAttribute('sandbox', '');
    frame.referrerPolicy = 'no-referrer';
    // The first policy is controlled by the viewer and cannot be relaxed by the file.
    const documentHtml = '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src \'none\'; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><style>html{color-scheme:light}body{margin:16px;background:white;color:#222}img{max-width:100%}</style>' + template.innerHTML;
    this.url = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html' }));
    frame.src = this.url;
    this.body.append(frame);
  }
  destroy(): void {
    this.frame?.remove(); this.frame = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
    this.host.replaceChildren();
  }
}
