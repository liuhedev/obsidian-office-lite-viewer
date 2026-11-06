# Contributing

Keep each change focused on a supported document format or a concrete preview problem. Open an issue describing the desired behavior before expanding to another Office format.

## Local validation

Run `npm ci` and `npm run build`. Load the generated plugin in an Obsidian test vault and use synthetic files without personal or company data.

Check CSV quoted commas, embedded newlines, Unicode, leading zeroes, delimiters, and encoding selection. Check XLSX multiple/empty sheets, cached and uncached formulas, dates, formatted numbers, and preview limits. Check empty/malformed files, opening a second file while loading, note embeds, external modifications, theme contrast, keyboard access, and plugin unload/reload. Confirm the input hashes are unchanged.

Do not add or change unit tests under the current project policy. Use type checks, builds, and targeted integration checks of the parser worker and Obsidian view. Do not commit temporary harnesses, raw machine logs, credentials, or real document contents.

## Security and data

Render cell values as text. Office/JSON content must stay text-only. HTML previews may render markup only inside an opaque-origin sandboxed iframe with restrictive CSP; strip embedded frames and unsafe navigation, and strip document scripts/handlers unless Scripts is on. The Scripts switch also enables HTTP(S) resources. Static mode permits only the viewer-owned nonce-authorized link bridge. Web-link messages must come from the current frame, match its token, use HTTP(S) and require user activation. Never grant same-origin access, execute Office formulas/macros, or fetch workbook relationships. No telemetry, remote document conversion, or credentials. Keep parser timeouts, cancellation, size limits, and notices accurate. A worker is for responsiveness, not a security sandbox.

Dependencies must be pinned by the lockfile, include license notices, and come from their official source. Report security issues privately via the repository's Security tab if private reporting is available; otherwise report a minimal issue without sensitive attachments or exploit documents.
