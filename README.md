English · [中文](README.zh-CN.md)

# Office Lite Viewer

Preview **CSV, XLS/XLSX, DOC/DOCX, JSON and HTML/HTM** in Obsidian. Source files stay read-only. Office/JSON previews stay local; HTML scripts and HTTP(S) resources are optional.

- **CSV / XLS / XLSX:** search, sort, pagination and worksheet tabs. CSV supports UTF-8, UTF-16 and GBK.
- **DOC / DOCX:** selectable body text with paragraph breaks; no office software required.
- **JSON:** formatted, selectable text; original numbers and string escapes are preserved.
- **HTML / HTM:** rendered preview and selectable source, isolated from Obsidian. Full-document language, body styles and script-mode load handlers are preserved. Enable **Scripts** for trusted buttons, sliders, Canvas and charts; enable **External resources** separately for HTTP(S) scripts, CSS, images, fonts and fetch requests.
- Open a file directly, choose **Open in Office Lite Viewer** from its menu, or run **Office Lite Viewer: Open document**.

## Install

[Community listing](https://community.obsidian.md/plugins/office-lite-viewer) · [Download ZIP](https://github.com/liuhedev/obsidian-office-lite-viewer/releases/latest).

For manual installation, extract `office-lite-viewer/` into `<vault>/.obsidian/plugins/`, reload Obsidian and enable **Office Lite Viewer**.

## Embed

````markdown
```office-lite-viewer
data/budget.xlsx
```
````

For HTML, **Back to file** restores the original document if a script navigates the preview away. It resets page state while retaining the current script/resource switches; it is not browser Back history.

On desktop, choose **⋯ → Open in default app** to open the file with its system-associated application.

## Limits

- No editing or macro execution. XLS (Excel 97–2003 BIFF8) / XLSX show saved values without recalculating formulas; styles, charts, images and merged-cell layout are not reproduced. Hidden sheets may be shown. Encrypted files are unsupported.
- DOC (Word 97–2003 binary) / DOCX: body text only, up to 2,000,000 characters; no layout, formatting, images, headers/footers, footnotes or comments. Tables become text. Hidden/revised text may appear; this is not a final-revision or redaction viewer. Older DOC, RTF/HTML renamed to DOC and UTF-16 DOCX XML are unsupported. DOCX body XML is limited to 20 MiB expanded and 256 nesting levels.
- Up to 20 MiB per file; spreadsheets: 10,000 rows/sheet, 100 columns, 20 sheets, 500,000 cells/workbook. Search and sort cover loaded data only. Parsing stops after 15 seconds.
- JSON: standard UTF-8 JSON; formatted output up to 40 MiB, indentation capped at 40 levels. CSV encoding can be changed in **⋯** if detection is wrong.
- HTML: UTF-8 only. Scripts and external resources are OFF by default and reset on file reload or reopen. Inline styles, SVG and embedded raster images work without either switch. Enable scripts only for trusted documents; external resources permit HTTP(S) requests, subject to server CORS and Obsidian/browser restrictions. Script-off mode removes inline event handlers; script-on mode preserves them. Pages cannot access the Obsidian DOM, Node/Electron or localStorage; forms, popups, downloads, embedded frames and top-level navigation remain disabled. Local relative image/CSS/JS files and persistent browser storage are not supported. Script mode is not an offline security boundary: trusted JavaScript may navigate its own iframe even when subresource requests are disabled. File modifications reload the preview and reset both switches.
- Mobile has not been verified on a device.

## Development

Node.js 22+: `npm ci` → `npm run build` → `npm run package`.

[Contributing](CONTRIBUTING.md) · [MIT](LICENSE) · [Third-party licenses](THIRD_PARTY_NOTICES.md)
