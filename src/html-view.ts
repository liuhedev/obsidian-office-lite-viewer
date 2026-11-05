// HTML stays in an opaque-origin iframe, never in the Obsidian document.
export class HtmlPreview {
  private source = false;
  private scripts = false;
  private external = false;
  private frame?: HTMLIFrameElement;
  private url?: string;
  private body: HTMLElement;
  constructor(private host: HTMLElement, private html: string) {
    host.replaceChildren();
    const toolbar = host.createDiv({ cls: 'ov-html-toolbar' });
    const toggle = toolbar.createEl('button', { text: 'Show source', attr: { 'aria-pressed': 'false' } });
    const restore = toolbar.createEl('button', { text: 'Back to file', attr: { title: 'Return to the original HTML file after navigation; resets page state' } });
    restore.addEventListener('click', () => {
      this.source = false;
      toggle.textContent = 'Show source';
      toggle.setAttribute('aria-pressed', 'false');
      this.render();
    });
    toggle.addEventListener('click', () => {
      this.source = !this.source;
      toggle.textContent = this.source ? 'Show preview' : 'Show source';
      toggle.setAttribute('aria-pressed', String(this.source));
      this.render();
    });
    const scripts = toolbar.createEl('button', { text: 'Scripts: OFF', attr: { 'aria-pressed': 'false', title: 'Enable JavaScript for this trusted preview only' } });
    const external = toolbar.createEl('button', { text: 'External resources: OFF', attr: { 'aria-pressed': 'false', title: 'Allow HTTP(S) resources and connections for this preview' } });
    const note = toolbar.createSpan({ text: 'Static, offline preview', cls: 'ov-html-note' });
    const update = () => {
      scripts.textContent = `Scripts: ${this.scripts ? 'ON' : 'OFF'}`;
      scripts.setAttribute('aria-pressed', String(this.scripts));
      external.textContent = `External resources: ${this.external ? 'ON' : 'OFF'}`;
      external.setAttribute('aria-pressed', String(this.external));
      note.textContent = this.scripts ? 'Trusted HTML only · isolated scripts' : 'Static preview';
      if (this.external) note.textContent += ' · HTTP(S) allowed';
      this.render();
    };
    scripts.addEventListener('click', () => { this.scripts = !this.scripts; update(); });
    external.addEventListener('click', () => { this.external = !this.external; update(); });
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
        const tag = element.tagName.toUpperCase();
        if (['IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'BASE', 'META', 'PORTAL', 'ANIMATE', 'ANIMATEMOTION', 'ANIMATETRANSFORM', 'SET'].includes(tag) ||
          (tag === 'SCRIPT' && !this.scripts) ||
          (tag === 'LINK' && (!this.external || element.getAttribute('rel')?.toLowerCase() !== 'stylesheet'))) {
          element.remove(); continue;
        }
        for (const attribute of Array.from(element.attributes)) {
          const name = attribute.name.toLowerCase();
          if ((name.startsWith('on') && !this.scripts) || ['srcdoc', 'srcset', 'action', 'formaction', 'target', 'ping', 'download', 'autofocus'].includes(name)) {
            element.removeAttribute(attribute.name);
          } else if (['href', 'xlink:href', 'src', 'poster', 'background', 'data'].includes(name)) {
            const value = attribute.value.trim();
            const fragment = (name === 'href' || name === 'xlink:href') && value.startsWith('#');
            const image = (name === 'src' || name === 'poster') && /^data:image\/(?:png|jpeg|gif|webp|avif);base64,/i.test(value);
            const remote = this.external && /^(?:https?:)?\/\//i.test(value) &&
              ((name === 'src' && ['IMG', 'SCRIPT', 'AUDIO', 'VIDEO', 'SOURCE', 'TRACK'].includes(tag)) ||
                (name === 'poster' && tag === 'VIDEO') || (name === 'href' && tag === 'LINK'));
            if (!fragment && !image && !remote) {
              element.removeAttribute(attribute.name);
            } else if (remote && value.startsWith('//')) {
              element.setAttribute(attribute.name, `https:${value}`);
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
    frame.setAttribute('sandbox', this.scripts ? 'allow-scripts' : '');
    frame.referrerPolicy = 'no-referrer';
    // The first policy is controlled by the viewer and cannot be relaxed by the file.
    const remote = this.external ? 'https: http:' : '';
    const scripts = this.scripts ? `'unsafe-inline' ${remote}` : "'none'";
    const policy = `default-src 'none'; script-src ${scripts}; style-src 'unsafe-inline' ${remote}; img-src data: ${remote}; font-src ${remote || "'none'"}; media-src ${remote || "'none'"}; connect-src ${remote || "'none'"}; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
    const documentHtml = '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + policy + '"><style>html{color-scheme:light}body{margin:16px;background:white;color:#222}img{max-width:100%}</style>' + template.innerHTML;
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
