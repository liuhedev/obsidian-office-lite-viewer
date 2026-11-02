import type { DocumentData } from './model';
import { SpreadsheetGrid } from './grid';

function node(tag: string, text = ''): HTMLElement {
  const el = document.createElement(tag); el.textContent = text; return el;
}

export class JsonPreview {
  private grid?: SpreadsheetGrid;
  private rendered = 0;
  private readonly body = node('div');
  private readonly abort = new AbortController();
  constructor(private host: HTMLElement, private data: DocumentData) {
    const toolbar = node('div'); toolbar.className = 'ov-json-toolbar';
    this.body.className = 'ov-json-body';
    host.replaceChildren(toolbar, this.body);
    if (data.sheets.length) {
      const select = document.createElement('select'); select.setAttribute('aria-label', 'JSON view');
      for (const mode of ['Tree', 'Table']) { const option = document.createElement('option'); option.value = mode; option.textContent = mode; select.append(option); }
      select.addEventListener('change', () => { this.grid?.destroy(); this.grid = undefined; this.body.replaceChildren();
        if (select.value === 'Table') this.grid = new SpreadsheetGrid(this.body, data);
        else this.tree();
      }, { signal: this.abort.signal });
      toolbar.append(select);
    } else toolbar.hidden = true;
    this.tree();
  }
  private tree(): void { this.rendered = 0; this.body.replaceChildren(this.branch('$', this.data.json, 0)); }
  private branch(key: string, value: unknown, depth: number): HTMLElement {
    if (++this.rendered > 10_000) return node('div', 'Tree display limit reached (10,000 nodes).');
    if (value === null || typeof value !== 'object') {
      const line = node('div'); line.className = 'ov-json-value';
      line.append(node('span', `${key}: `), node('code', JSON.stringify(value) ?? 'null')); return line;
    }
    const array = Array.isArray(value);
    const keys = array ? null : Object.keys(value);
    const count = array ? value.length : keys!.length;
    const group = document.createElement('details'); group.className = 'ov-json-node';
    const summary = document.createElement('summary'); summary.textContent = `${key} ${array ? `[${count}]` : `{${count}}`}`;
    group.append(summary);
    let loaded = false;
    group.addEventListener('toggle', () => {
      if (!group.open || loaded) return; loaded = true;
      if (depth >= 64) { group.append(node('div', 'Tree depth limit reached (64 levels).')); return; }
      const children = node('div'); children.className = 'ov-json-children'; group.append(children);
      let index = 0;
      const more = document.createElement('button'); more.textContent = 'Show more';
      const batch = () => {
        more.remove(); const end = Math.min(index + 100, count);
        for (; index < end && this.rendered < 10_000; index++) {
          const childKey = keys ? keys[index]! : String(index);
          children.append(this.branch(childKey, (value as Record<string, unknown>)[childKey], depth + 1));
        }
        if (index < count) {
          if (this.rendered >= 10_000) children.append(node('div', 'Tree display limit reached (10,000 nodes).'));
          else children.append(more);
        }
      };
      more.addEventListener('click', batch, { signal: this.abort.signal }); batch();
    }, { signal: this.abort.signal });
    if (depth === 0) group.open = true;
    return group;
  }
  destroy(): void { this.abort.abort(); this.grid?.destroy(); this.host.replaceChildren(); }
}
