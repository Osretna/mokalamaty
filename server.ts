import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupSignalingServer, handleSignalingHttp } from './src/server/signaling.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Setup WebSockets
setupSignalingServer(server);

// Middleware for Signaling HTTP fallback
app.use((req, res, next) => {
  if (req.url && (req.url.startsWith('/api/signaling') || req.url.startsWith('/ws-signaling'))) {
    const handled = handleSignalingHttp(req, res);
    if (handled) return;
  }
  next();
});

// Serve static frontend in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Listening on http://0.0.0.0:${PORT}`);
});
