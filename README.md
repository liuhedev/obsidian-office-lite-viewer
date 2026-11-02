# Office View for Obsidian

Open a spreadsheet without leaving your notes. Office View previews **CSV and XLSX** files directly in Obsidian, using your vault's theme. All parsing happens on your device; the plugin makes no network requests and never writes to source documents.

**Status:** 0.1.0, an early read-only release. Not yet listed in Obsidian's Community Plugins directory.

[中文说明](README.zh-CN.md)

## Features

- Open `.csv` and `.xlsx` from the file explorer, a file's context menu, or **Office View: Open spreadsheet**.
- Switch Excel worksheets. Display stored number/date formats and cached formula results.
- Search across the loaded rows of the current sheet, sort columns, and page through 100 rows at a time.
- Sticky column headers and source row numbers; toggle whether the first row is a header.
- CSV: UTF-8, UTF-16 LE/BE and GB18030/GBK; automatic or manual delimiter selection (comma, tab, semicolon, pipe). Text identifiers keep leading zeroes.
- Embed a spreadsheet preview inside a note.
- Background parsing with a timeout and explicit preview limits. Reload automatically when the source file changes.

## Install

Download `office-view-0.1.0.zip` from [Releases](https://github.com/liuhedev/obsidian-office-view/releases). Extract its `office-view` directory into `<vault>/.obsidian/plugins/`, then reload Obsidian and enable **Office View** in Settings → Community plugins.

The installed folder should contain `main.js`, `manifest.json`, and `styles.css`. If another CSV/XLSX plugin already owns the file extension, disable that plugin to make Office View the default, or use the **Open in Office View** file menu / **Open spreadsheet** command.

## Embed in a note

Use a vault path, or a link path relative to the current note:

````markdown
```office-view
data/budget.xlsx
```
````

The embed provides the same sheet tabs, search, sorting and CSV controls as a full tab.

## Preview boundaries

- Read-only. Sorting, searching, and changing the encoding/delimiter affect the preview only.
- Maximum 20 MiB per input, 10,000 source rows per sheet (including headers), 100 columns, 20 sheets, and 500,000 cells across the workbook. Warnings identify truncated previews. Search and sort cover **loaded data only**, not omitted rows or sheets.
- Parsing runs in a worker with a 15-second timeout. Limits reduce resource use; they are not a guarantee that every complex workbook will fit in device memory.
- Formulas are not calculated or executed. A formula without a saved result is shown as formula text. Macros and external links are not executed or fetched.
- Charts, images, comments, merged-cell layout, Excel styles, pivot tables, editing, password-protected workbooks, `.xls`, `.doc` and `.docx` are not supported in this release. A hidden worksheet may be visible in the preview; visibility is not an access control.
- CSV auto encoding uses UTF-8 (or a UTF-16 BOM), then falls back to GB18030. Choose the encoding manually if detection is wrong.
- Desktop is the initial validation target. The plugin uses browser APIs and is enabled for mobile, but mobile compatibility has not yet been verified on a device.

## Development

Requires Node.js 22+ and npm.

```sh
npm ci
npm run build
npm run package
```

`npm run dev` watches the UI sources. Restart the watcher after changing `parser.worker.ts` or its imports. Copy the three install files into a **test vault**, enable the plugin, and reload it after building. Try the files in [`examples/`](examples/), both in a tab and in an `office-view` code block. See [CONTRIBUTING.md](CONTRIBUTING.md) for validation guidance.

CSV parsing uses Papa Parse. XLSX parsing uses SheetJS Community Edition from its [official distribution](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), pinned in `package-lock.json`. Dependencies are bundled, so the release needs no runtime downloads. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Roadmap

1. Validate the spreadsheet preview on more Obsidian themes and mobile devices.
2. Add DOCX text/document preview as a separate file view.
3. Consider editing only with explicit save, undo, and format-preservation requirements.

## License

MIT — see [LICENSE](LICENSE). This project is independent of Obsidian and Microsoft Office.
