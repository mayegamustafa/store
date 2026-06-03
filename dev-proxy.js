#!/usr/bin/env node
/**
 * TotalStore Dev Proxy
 * ─────────────────────────────────────────────────
 * Serves all apps on a single port so you only
 * ever open one URL during development.
 *
 * Usage:
 *   node dev-proxy.js          (default port 8080)
 *   PORT=3000 node dev-proxy.js
 *
 * Routes:
 *   localhost:PORT/           → Web buyer app     (localhost:3000)
 *   localhost:PORT/admin      → Admin panel        (localhost:3002)
 *   localhost:PORT/seller     → Seller dashboard   (localhost:3003)
 *   localhost:PORT/api        → Backend API        (localhost:3001)
 *
 * Prerequisites – start your apps first:
 *   npm run dev   (starts all via turborepo)
 *   — or individually —
 *   cd apps/web    && npm run dev  (port 3000)
 *   cd apps/admin  && npm run dev  (port 3002, set NEXT_PUBLIC_BASE_PATH=/admin)
 *   cd apps/seller && npm run dev  (port 3003, set NEXT_PUBLIC_BASE_PATH=/seller)
 *   cd apps/api    && npm run dev  (port 3001)
 *
 * No extra npm packages required – pure Node.js built-ins only.
 */

const http = require('http');
const net  = require('net');
const fs   = require('fs');
const path = require('path');

const PROXY_PORT = parseInt(process.env.PORT || '8080', 10);
const DOWNLOADS_DIR = path.join(__dirname, 'public', 'downloads');

/** Route map: path prefix → upstream target */
const TARGETS = [
  { prefix: '/admin',     host: 'localhost', port: 3002 },
  { prefix: '/seller',    host: 'localhost', port: 3003 },
  { prefix: '/api',       host: 'localhost', port: 3001 },
  { prefix: '/uploads',   host: 'localhost', port: 3001 },
  { prefix: '/socket.io', host: 'localhost', port: 3001 },
  { prefix: '/',          host: 'localhost', port: 3000 }, // must be last (catch-all)
];

function resolveTarget(url) {
  for (const t of TARGETS) {
    if (url === t.prefix || url.startsWith(t.prefix + '/') || url.startsWith(t.prefix + '?')) {
      return t;
    }
  }
  return TARGETS[TARGETS.length - 1]; // fallback → web
}

// ── HTTP proxy ────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Serve static APK downloads directly
  if (req.url && req.url.startsWith('/downloads/')) {
    const fileName = path.basename(req.url.split('?')[0]);
    // Sanitize: only allow alphanumeric, dash, dot, underscore
    if (!/^[\w.\-]+$/.test(fileName)) {
      res.writeHead(400); res.end('Bad request'); return;
    }
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    if (!filePath.startsWith(DOWNLOADS_DIR)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(fileName).toLowerCase();
      const mime = ext === '.apk' ? 'application/vnd.android.package-archive' : 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stats.size,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });
      fs.createReadStream(filePath).pipe(res);
    });
    return;
  }

  const target  = resolveTarget(req.url || '/');
  const options = {
    hostname: target.host,
    port:     target.port,
    path:     req.url,
    method:   req.method,
    headers:  {
      ...req.headers,
      host: `${target.host}:${target.port}`,
      'x-forwarded-host':  req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PROXY_PORT}`,
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
      'x-forwarded-for':   req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[proxy] → ${target.host}:${target.port}${req.url} ERROR: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/html' });
      res.end(`
        <h2>502 – ${target.host}:${target.port} not reachable</h2>
        <p>Make sure <strong>${describeTarget(target)}</strong> is running.</p>
      `);
    }
  });

  req.pipe(proxyReq, { end: true });
});

// ── WebSocket / HMR proxy (Next.js fast-refresh) ──────────────────────────────
server.on('upgrade', (req, socket, head) => {
  const target = resolveTarget(req.url || '/');

  const conn = net.connect(target.port, target.host, () => {
    // Replay the HTTP upgrade handshake to the upstream
    const upgradeHeaders =
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n';

    conn.write(upgradeHeaders);
    if (head && head.length) conn.write(head);

    socket.pipe(conn, { end: true });
    conn.pipe(socket, { end: true });
  });

  socket.on('error',  () => conn.destroy());
  conn.on('error',    () => socket.destroy());
  socket.on('end',    () => conn.destroy());
  conn.on('end',      () => socket.destroy());
});

function describeTarget(t) {
  if (t.port === 3000) return 'Web app  (cd apps/web    && npm run dev)';
  if (t.port === 3002) return 'Admin    (cd apps/admin  && NEXT_PUBLIC_BASE_PATH=/admin npm run dev)';
  if (t.port === 3003) return 'Seller   (cd apps/seller && NEXT_PUBLIC_BASE_PATH=/seller npm run dev)';
  if (t.port === 3001) return 'API      (cd apps/api    && npm run dev)';
  return `port ${t.port}`;
}

server.listen(PROXY_PORT, () => {
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log(`│  TotalStore Dev Proxy  →  http://localhost:${PROXY_PORT}     │`);
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  /            Web buyer app      (port 3000)        │`);
  console.log(`│  /admin       Admin panel         (port 3002)        │`);
  console.log(`│  /seller      Seller dashboard    (port 3003)        │`);
  console.log(`│  /api         Backend API         (port 3001)        │`);
  console.log('└─────────────────────────────────────────────────────┘\n');
});
