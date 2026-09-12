#!/usr/bin/env node
/**
 * DOSYA AMACI: Bir portal build'ini (`out-<platform>/`) `/game/1/` alt
 * dizininden ve bir iframe test sayfası içinden sunan minik bir statik sunucu.
 * Portalların gerçek dağıtım şeklini (bilinmeyen alt dizin + iframe) yerelde
 * doğrulamak için — gerçek göreli yol/iframe hatalarını erken yakalar.
 * Kullanım: `node scripts/portal/serve-portal.mjs crazygames [port]`.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PLATFORM = process.argv[2];
const PORT = Number(process.argv[3]) || 4300;
if (PLATFORM !== 'crazygames' && PLATFORM !== 'gamedistribution') {
  console.error('Kullanım: node scripts/portal/serve-portal.mjs <crazygames|gamedistribution> [port]');
  process.exit(1);
}

const ROOT = process.cwd();
const GAME_DIR = join(ROOT, `out-${PLATFORM}`);
const MOUNT = '/game/1/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const HOST_PAGE = `<!doctype html>
<html><head><title>Portal test — ${PLATFORM}</title>
<style>html,body{margin:0;height:100%;background:#111}iframe{width:100%;height:100%;border:0}</style>
</head><body>
<iframe src="${MOUNT}" allow="autoplay"></iframe>
</body></html>`;

createServer(async (req, res) => {
  const url = req.url ?? '/';

  if (url === '/' || url === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HOST_PAGE);
    return;
  }

  if (!url.startsWith(MOUNT)) {
    res.writeHead(404);
    res.end('Not found (mount dışı — portal her şeyi göreli yoldan yüklemeli)');
    return;
  }

  let relPath = url.slice(MOUNT.length).split('?')[0];
  if (relPath === '' || relPath.endsWith('/')) relPath += 'index.html';

  const filePath = join(GAME_DIR, decodeURIComponent(relPath));
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end(`Not found: ${relPath}`);
  }
}).listen(PORT, () => {
  console.log(`✓ ${PLATFORM} portal build'i http://localhost:${PORT}/ adresinde (iframe, ${MOUNT} alt dizininden)`);
  console.log(`  Doğrudan: http://localhost:${PORT}${MOUNT}`);
});
