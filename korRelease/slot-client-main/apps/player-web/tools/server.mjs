import http from 'node:http';
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ROOT, DIST, sourceFiles, outputPath, HOSTING_STATUS, CSP } from './files.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

export async function startServer({ port = 4318, dist = false } = {}) {
  const allow = new Map((await sourceFiles()).map(file => ['/' + outputPath(file), dist ? path.join(DIST, outputPath(file)) : path.join(ROOT, file)]));
  allow.set('/', allow.get('/index.html'));
  allow.set('/3x3/', allow.get('/apps/board-sample/index.html'));
  const server = http.createServer(async (req, res) => {
    const headers = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { ...headers, 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return send(403, 'Loopback host only');
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Read-only mock frontend');
    let pathname;
    try {
      pathname = decodeURIComponent((req.url || '/').split('?')[0]);
      if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.')) || pathname.includes('\0')) return send(404, 'Not found');
    } catch { return send(400, 'Invalid path'); }
    if (pathname === '/hosting-status.json') return send(200, JSON.stringify(HOSTING_STATUS), TYPES['.json']);
    if (pathname === '/robots.txt') return send(200, 'User-agent: *\nDisallow: /\n');
    const file = allow.get(pathname);
    if (!file) return send(404, 'Not found');
    try {
      const resolved = await realpath(file);
      if (resolved !== file) return send(404, 'Not found');
      return send(200, await readFile(file), TYPES[path.extname(file)]);
    } catch { return send(404, 'Not found'); }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.SLOT_DEV_PORT || 4318);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid SLOT_DEV_PORT');
  const server = await startServer({ port, dist: process.argv.includes('--dist') });
  console.log(`Tavern mock frontend: http://127.0.0.1:${server.address().port} (loopback only)`);
}
