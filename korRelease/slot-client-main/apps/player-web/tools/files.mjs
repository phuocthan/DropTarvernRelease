import { lstat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
export const APP = path.join(ROOT, 'apps/player-web');
export const DIST = path.join(APP, 'dist');
const FILES = [
  "apps/board-sample/contract.js",
  "apps/board-sample/index.html",
  "apps/board-sample/main.js",
  "apps/board-sample/recorded.js",
  "apps/board-sample/renderer.js",
  "apps/board-sample/styles.css",
  "apps/player-web/index.html",
  "apps/player-web/src/adapters/mock-adapter.js",
  "apps/player-web/src/audio.js",
  "apps/player-web/src/contract.js",
  "apps/player-web/src/main.js",
  "apps/player-web/src/round-controller.js",
  "apps/player-web/src/snapshot-revisions.js",
  "apps/player-web/src/wallet-balance.js",
  "apps/player-web/styles.css",
  "fixtures/rounds/slot-001-frontend/scenarios.js",
  "games/slot-001/client/renderer.js",
  "games/slot-001/client/symbols.svg",
  "games/slot-001/spec/rules.js"
];
export async function sourceFiles() {
  for (const name of FILES) {
    const file = path.join(ROOT, name);
    if (!(await lstat(file)).isFile() || await realpath(file) !== file) throw new Error('Unsafe static file: ' + name);
  }
  return [...FILES];
}
export const outputPath = file => file === 'apps/player-web/index.html' ? 'index.html' : file;
export const HOSTING_STATUS = { status: 'ok', component: 'slot-client-mock', build: 'development-seed-v1', apiConnected: false, mockOnly: true };
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
