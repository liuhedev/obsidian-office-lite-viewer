import { mkdir, copyFile, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
await rm('dist', { recursive: true, force: true });
await mkdir('dist/office-view', { recursive: true });
for (const file of ['main.js', 'manifest.json', 'styles.css', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(file, `dist/office-view/${file}`);
}
execFileSync('zip', ['-qr', `office-view-${version}.zip`, 'office-view'], { cwd: 'dist' });
console.log(`Created dist/office-view-${version}.zip`);
