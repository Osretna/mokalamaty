import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface PeerInfo {
  id: string;
  name: string;
  role: 'student' | 'user';
  lastSeen: number;
  ws?: WebSocket;
}

export interface SignalingMessage {
  type: 'register' | 'peers' | 'call_request' | 'call_accepted' | 'call_rejected' | 'offer' | 'answer' | 'ice_candidate' | 'end_call' | 'ping' | 'pong';
  from?: string;
  fromName?: string;
  to?: string;
  callId?: string;
  sdp?: any;
  candidate?: any;
  reason?: string;
  role?: 'student' | 'user';
  name?: string;
  peers?: { id: string; name: string; role: 'student' | 'user' }[];
}

// In-memory registry of online peers
const peers = new Map<string, PeerInfo>();
// In-memory message box for HTTP polling fallback
const httpMailboxes = new Map<string, SignalingMessage[]>();

export function setupSignalingServer(httpServer: any) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname === '/ws-signaling' || url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('[Signaling Upgrade Error]:', err);
    }
  });

  function broadcastPeersList() {
    const list = Array.from(peers.values()).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
    }));
    const msg = JSON.stringify({ type: 'peers', peers: list });
    for (const p of peers.values()) {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        try {
          p.ws.send(msg);
        } catch (e) {
          console.error('[Send Error]:', e);
        }
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    let currentUserId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const data: SignalingMessage = JSON.parse(raw.toString());

        if (data.type === 'register' && data.from) {
          currentUserId = data.from;
          peers.set(currentUserId, {
            id: currentUserId,
            name: data.name || (data.role === 'student' ? 'الطالب' : 'المستخدم'),
            role: data.role || 'student',
            lastSeen: Date.now(),
            ws,
          });
          broadcastPeersList();
          return;
        }

        if (data.type === 'ping') {
          if (currentUserId && peers.has(currentUserId)) {
            peers.get(currentUserId)!.lastSeen = Date.now();
          }
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Direct routed messages to target peer: call_request, call_accepted, call_rejected, offer, answer, ice_candidate, end_call
        if (data.to) {
          const target = peers.get(data.to);
          if (target && target.ws && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify(data));
          } else {
            // Also store in HTTP mailbox if target is on HTTP fallback
            if (!httpMailboxes.has(data.to)) {
              httpMailboxes.set(data.to, []);
            }
            httpMailboxes.get(data.to)!.push(data);
          }
        }
      } catch (err) {
        console.error('[Signaling Message Error]:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId && peers.has(currentUserId)) {
        peers.delete(currentUserId);
        broadcastPeersList();
      }
    });

    ws.on('error', (err) => {
      console.error('[WS Error]:', err);
    });
  });

  // Periodic cleanup of stale peers (older than 45s)
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of peers.entries()) {
      if (now - peer.lastSeen > 45000) {
        peers.delete(id);
        changed = true;
      }
    }
    if (changed) {
      broadcastPeersList();
    }
  }, 15000);
}

// HTTP handler for fallback polling & API checks
export function handleSignalingHttp(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  
  if (url.pathname === '/api/signaling/peers') {
    const list = Array.from(peers.values()).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ peers: list }));
    return true;
  }

  if (url.pathname === '/api/signaling/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data: SignalingMessage = JSON.parse(body);
        if (data.type === 'register' && data.from) {
          peers.set(data.from, {
            id: data.from,
            name: data.name || 'مستخدم',
            role: data.role || 'student',
            lastSeen: Date.now(),
          });
        }
        if (data.to) {
          const target = peers.get(data.to);
          if (target && target.ws && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify(data));
          } else {
            if (!httpMailboxes.has(data.to)) {
              httpMailboxes.set(data.to, []);
            }
            httpMailboxes.get(data.to)!.push(data);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid json' }));
      }
    });
    return true;
  }

  if (url.pathname === '/api/signaling/poll' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'userId required' }));
      return true;
    }
    if (peers.has(userId)) {
      peers.get(userId)!.lastSeen = Date.now();
    }
    const msgs = httpMailboxes.get(userId) || [];
    httpMailboxes.set(userId, []);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ messages: msgs }));
    return true;
  }

  return false;
}
