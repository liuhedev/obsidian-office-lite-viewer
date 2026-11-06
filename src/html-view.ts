// HTML stays in an opaque-origin iframe, never in the Obsidian document.
export class HtmlPreview {
  private source = false;
  private scripts = false;
  private frame?: HTMLIFrameElement;
  private url?: string;
  private token = '';
  private body: HTMLElement;
  private onMessage = (event: MessageEvent): void => {
    if (!this.frame || event.source !== this.frame.contentWindow || event.data?.type !== 'ov-open-external' ||
      event.data.token !== this.token || typeof event.data.url !== 'string' || !navigator.userActivation.isActive) return;
    try {
      const url = new URL(event.data.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') this.openExternal(url.href);
    } catch { /* Ignore malformed links. */ }
  };
  constructor(private host: HTMLElement, private html: string,
    private openExternal: (url: string) => void = url => { window.open(url, '_blank', 'noopener,noreferrer'); }) {
    host.replaceChildren();
    window.addEventListener('message', this.onMessage);
    const toolbar = host.createDiv({ cls: 'ov-html-toolbar' });
    const toggle = toolbar.createEl('button', { text: 'Show source', attr: { 'aria-pressed': 'false' } });
    toggle.addEventListener('click', () => {
      this.source = !this.source;
      toggle.textContent = this.source ? 'Show preview' : 'Show source';
      toggle.setAttribute('aria-pressed', String(this.source));
      this.render();
    });
    const scripts = toolbar.createEl('button', { text: 'Scripts: OFF', attr: { 'aria-pressed': 'false', title: 'Enable JavaScript and HTTP(S) resources for this trusted preview only' } });
    const note = toolbar.createSpan({ text: 'Static preview · web links open externally', cls: 'ov-html-note' });
    const update = () => {
      scripts.textContent = `Scripts: ${this.scripts ? 'ON' : 'OFF'}`;
      scripts.setAttribute('aria-pressed', String(this.scripts));
      note.textContent = this.scripts ? 'Trusted HTML only · scripts and HTTP(S) resources enabled' : 'Static preview · web links open externally';
      this.render();
    };
    scripts.addEventListener('click', () => { this.scripts = !this.scripts; update(); });
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
          (tag === 'LINK' && (!this.scripts || element.getAttribute('rel')?.toLowerCase() !== 'stylesheet'))) {
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
            const link = ['A', 'AREA'].includes(tag) && ['href', 'xlink:href'].includes(name) && /^(?:https?:)?\/\//i.test(value);
            const remote = this.scripts && /^(?:https?:)?\/\//i.test(value) &&
              ((name === 'src' && ['IMG', 'SCRIPT', 'AUDIO', 'VIDEO', 'SOURCE', 'TRACK'].includes(tag)) ||
                (name === 'poster' && tag === 'VIDEO') || (name === 'href' && tag === 'LINK'));
            if (!fragment && !image && !remote && !link) {
              element.removeAttribute(attribute.name);
            } else if ((remote || link) && value.startsWith('//')) {
              element.setAttribute(attribute.name, `https:${value}`);
            }
          }
        }
        if (element instanceof HTMLTemplateElement) clean(element.content);
      }
    };
    clean(template.content);
    // Fragment parsing omits html/body attributes. Recover their start tags,
    // skipping comments and raw-text elements, then use the same sanitization.
    const attributes: Record<string, string> = { html: '', body: '' };
    const seen = new Set<string>();
    const tags = /<!--[\s\S]*?-->|<(script|style|textarea|title)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<![^>]*>|<(html|body)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi;
    for (const match of this.html.matchAll(tags)) {
      if (!match[2]) continue;
      const tag = match[2].toLowerCase();
      if (seen.has(tag)) continue;
      seen.add(tag);
      const holder = document.createElement('template');
      holder.innerHTML = `<div${match[3]}></div>`;
      clean(holder.content);
      const element = holder.content.firstElementChild;
      if (element) attributes[tag] = Array.from(element.attributes, attribute =>
        ` ${attribute.name}="${attribute.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"`).join('');
    }
    const frame = this.frame = document.createElement('iframe');
    frame.className = 'ov-html-frame';
    frame.title = 'HTML preview';
    // Only the viewer's nonce-authorized link bridge runs in static mode.
    // Document scripts remain removed and blocked by CSP until enabled.
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.referrerPolicy = 'no-referrer';
    // The first policy is controlled by the viewer and cannot be relaxed by the file.
    this.token = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const remote = this.scripts ? 'https: http:' : '';
    const scripts = this.scripts ? `'unsafe-inline' ${remote}` : `'nonce-${this.token}'`;
    const policy = `default-src 'none'; script-src ${scripts}; style-src 'unsafe-inline' ${remote}; img-src data: ${remote}; font-src ${remote || "'none'"}; media-src ${remote || "'none'"}; connect-src ${remote || "'none'"}; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
    const bridge = `<script nonce="${this.token}">document.addEventListener('click',function(event){if(!event.isTrusted||event.button!==0)return;const target=event.target instanceof Element?event.target.closest('a,area'):null;if(!target)return;const href=target.getAttribute('href')||target.getAttribute('xlink:href')||'';if(!href.toLowerCase().startsWith('https://')&&!href.toLowerCase().startsWith('http://'))return;event.preventDefault();event.stopImmediatePropagation();parent.postMessage({type:'ov-open-external',token:'${this.token}',url:href},'*');},true);</script>`;
    const documentHtml = '<!doctype html><html' + attributes.html + '><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + policy + '"><style>html{color-scheme:light}body{margin:16px;background:white;color:#222}img{max-width:100%}</style>' + bridge + '</head><body' + attributes.body + '>' + template.innerHTML + '</body></html>';
    this.url = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html' }));
    frame.src = this.url;
    this.body.append(frame);
  }
  destroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.frame?.remove(); this.frame = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = undefined;
    this.host.replaceChildren();
  }
}
