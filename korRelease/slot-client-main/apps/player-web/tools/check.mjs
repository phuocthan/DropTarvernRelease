import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, sourceFiles } from './files.mjs';

const files = await sourceFiles();
const failures = [];
for (const file of files) {
  const source = await readFile(path.join(ROOT, file), 'utf8');
  if (source.split('\n').some(line => line.trimEnd() !== line)) failures.push(`${file}: trailing whitespace`);
  if (/-----BEGIN .*PRIVATE KEY-----|(?:mongodb(?:\+srv)?|postgres(?:ql)?):\/\/[^\s]+@|xox[baprs]-/.test(source)) failures.push(`${file}: secret pattern`);
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|navigator\.sendBeacon|localStorage|document\.cookie|serviceWorker/.test(source)) failures.push(`${file}: forbidden mock network/shared storage`);
  if (file.endsWith('.js') && spawnSync(process.execPath, ['--check', path.join(ROOT, file)]).status !== 0) failures.push(`${file}: syntax`);
}
console.log(JSON.stringify({ files: files.length, failures }));
if (failures.length) process.exitCode = 1;
