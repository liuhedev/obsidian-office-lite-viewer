import { build, context } from 'esbuild';

// Bundle the parser as a self-contained worker; no CDN or network is used at runtime.
const parser = await build({
  entryPoints: ['src/parser.worker.ts'], bundle: true, write: false,
  format: 'iife', platform: 'browser', target: 'es2020', minify: true,
});
const options = {
  entryPoints: ['src/main.ts'], bundle: true, outfile: 'main.js',
  format: 'cjs', platform: 'browser', target: 'es2020', minify: true,
  external: ['obsidian'], define: { __PARSER_WORKER__: JSON.stringify(parser.outputFiles[0].text) },
  banner: { js: '/* Office View | MIT | Includes SheetJS CE (Apache-2.0) and Papa Parse (MIT). See THIRD_PARTY_NOTICES.md. */' },
};
if (process.argv.includes('--watch')) {
  // Re-run npm run dev after changing parser.worker.ts.
  await (await context(options)).watch();
} else {
  await build(options);
}
