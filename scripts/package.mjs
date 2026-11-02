import { mkdir, copyFile, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const { id, version } = JSON.parse(await readFile('manifest.json', 'utf8'));
await rm('dist', { recursive: true, force: true });
await mkdir(`dist/${id}`, { recursive: true });
for (const file of ['main.js', 'manifest.json', 'styles.css', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(file, `dist/${id}/${file}`);
}
execFileSync('zip', ['-qr', `${id}-${version}.zip`, id], { cwd: 'dist' });
console.log(`Created dist/${id}-${version}.zip`);
