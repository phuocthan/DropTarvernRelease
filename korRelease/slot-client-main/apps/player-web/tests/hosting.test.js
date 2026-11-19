import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer } from '../tools/server.mjs';
import { sourceFiles, outputPath } from '../tools/files.mjs';

test('loopback host serves both boards and exact static files, with no docs, metadata or API', async t => {
  const server = await startServer({ port: 0 });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/3x3/', ...(await sourceFiles()).map(n => '/' + outputPath(n))]) {
    const r = await fetch(base + route); assert.equal(r.status, 200, route);
    assert.match(r.headers.get('content-security-policy'), /connect-src 'none'/); await r.text();
  }
  for (const route of ['/api', '/.env', '/.git/config', '/README.md', '/docs/DEVELOPMENT.md', '/SNAPSHOT_MANIFEST.json', '/contracts/player-draft-v2/examples/catalog.json', '/missing.js', '/apps/player-web/src/adapters/rgs-adapter.js']) {
    const r = await fetch(base + route); assert.equal(r.status, 404, route); await r.text();
  }
  assert.equal((await fetch(base, { method: 'POST', body: '{}' })).status, 405);
  assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
  const status = await (await fetch(base + '/hosting-status.json')).json();
  assert.equal(status.mockOnly, true); assert.equal(status.apiConnected, false);
  const badHost = await new Promise((resolve, reject) => {
    const r = http.get(base, { headers: { Host: 'unrelated.example' } }, response => { response.resume(); resolve(response.statusCode); }); r.on('error', reject);
  });
  assert.equal(badHost, 403);
});
