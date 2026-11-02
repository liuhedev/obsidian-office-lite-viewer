English · [中文](README.zh-CN.md)

# Office View

Preview **CSV, XLSX and JSON** in Obsidian. Read-only, local, no network requests.

- **CSV / XLSX:** search, sort, pagination and worksheet tabs. CSV supports UTF-8, UTF-16 and GBK.
- **JSON:** formatted, selectable text; original numbers and string escapes are preserved.
- Open a file directly, choose **Open in Office View** from its menu, or run **Office View: Open document**.

## Install

Not yet listed in Community Plugins. Download the ZIP from [Releases](https://github.com/liuhedev/obsidian-office-view/releases), extract `office-view/` into `<vault>/.obsidian/plugins/`, reload Obsidian and enable **Office View**. If another plugin handles the extension, use the file menu to open it.

## Embed

````markdown
```office-view
data/budget.xlsx
```
````

## Limits

- No editing. XLSX shows saved values without recalculating formulas; workbook styles, charts, images and merged-cell layout are not reproduced. XLS, DOC/DOCX and encrypted workbooks are unsupported. Hidden sheets may be shown.
- Up to 20 MiB per file; spreadsheets: 10,000 rows/sheet, 100 columns, 20 sheets, 500,000 cells/workbook. Search and sort cover loaded data only. Parsing stops after 15 seconds.
- JSON: standard UTF-8 JSON; formatted output up to 40 MiB, indentation capped at 40 levels. CSV encoding can be changed in **⋯** if detection is wrong.
- Mobile has not been verified on a device.

## Development

Node.js 22+: `npm ci` → `npm run build` → `npm run package`.

[Contributing](CONTRIBUTING.md) · [MIT](LICENSE) · [Third-party licenses](THIRD_PARTY_NOTICES.md)
