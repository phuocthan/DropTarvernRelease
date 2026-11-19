import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, DIST, sourceFiles, outputPath, HOSTING_STATUS } from './files.mjs';

if (process.argv[2] !== '--profile=mock' || process.argv.length !== 3) {
  console.error('Build refused: only explicit --profile=mock is implemented. Live adapter and contract approval are required.');
  process.exitCode = 1;
} else {
  // Validate the complete allowlist before replacing this app's generated directory.
  const inputs = await sourceFiles();
  const contents = new Map(await Promise.all(inputs.map(async file => [outputPath(file), await readFile(path.join(ROOT, file))])));
  contents.set('hosting-status.json', Buffer.from(JSON.stringify(HOSTING_STATUS) + '\n'));
  contents.set('robots.txt', Buffer.from('User-agent: *\nDisallow: /\n'));
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  const files = [];
  for (const [file, bytes] of contents) {
    await mkdir(path.dirname(path.join(DIST, file)), { recursive: true });
    await writeFile(path.join(DIST, file), bytes);
    files.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const manifest = { profile: 'mock', liveEnabled: false, contractVersion: 'mock-player-v1', files };
  await writeFile(path.join(DIST, 'artifact-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ profile: 'mock', files: files.length, bytes: files.reduce((sum, f) => sum + f.bytes, 0), directory: DIST }));
}
