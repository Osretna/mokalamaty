/**
 * Resilient multi-layer signaling client:
 * 1. Primary: WebSocket connection (/ws-signaling)
 * 2. Cross-Tab: BroadcastChannel ('sawtak_signaling_v2')
 * 3. Fallback: HTTP Polling & REST (/api/signaling)
 */
export interface SignalingPeer {
  id: string;
  name: string;
  role: 'student' | 'user';
}

export type SignalingEvent =
  | { type: 'peers'; peers: SignalingPeer[] }
  | { type: 'incoming_call'; from: string; fromName: string; callId: string; role?: 'student' | 'user' }
  | { type: 'call_accepted'; from: string; callId: string }
  | { type: 'call_rejected'; from: string; callId: string; reason?: string }
  | { type: 'offer'; from: string; sdp: RTCSessionDescriptionInit; callId: string }
  | { type: 'answer'; from: string; sdp: RTCSessionDescriptionInit; callId: string }
  | { type: 'ice_candidate'; from: string; candidate: RTCIceCandidateInit; callId: string }
  | { type: 'end_call'; from: string; callId: string; reason?: string };

type EventListener = (event: SignalingEvent) => void;

class SignalingClient {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: any = null;
  private pingInterval: any = null;
  private listeners: Set<EventListener> = new Set();
  private myUserId: string = '';
  private myDisplayName: string = '';
  private myRole: 'student' | 'user' = 'student';
  private isConnected: boolean = false;
  private onStatusChangeCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor() {
    // Initialize BroadcastChannel for rock-solid local cross-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('sawtak_signaling_v2');
        this.broadcastChannel.onmessage = (e) => {
          if (e.data && e.data.to === this.myUserId) {
            this.handleIncomingRaw(e.data);
          } else if (e.data && e.data.type === 'broadcast_query') {
            // Respond to peer discovery query
            this.broadcastSelf();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }
  }

  init(userId: string, displayName: string, role: 'student' | 'user') {
    this.myUserId = userId;
    this.myDisplayName = displayName;
    this.myRole = role;

    this.connectWebSocket();
    this.startHttpPolling();
    this.broadcastSelf();
  }

  updateProfile(displayName: string, role: 'student' | 'user') {
    this.myDisplayName = displayName;
    this.myRole = role;
    this.register();
    this.broadcastSelf();
  }

  onStatusChange(cb: (connected: boolean) => void) {
    this.onStatusChangeCallbacks.add(cb);
    cb(this.isConnected);
    return () => this.onStatusChangeCallbacks.delete(cb);
  }

  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setConnected(status: boolean) {
    if (this.isConnected !== status) {
      this.isConnected = status;
      this.onStatusChangeCallbacks.forEach(cb => cb(status));
    }
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-signaling`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setConnected(true);
        this.register();

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping', from: this.myUserId }));
          }
        }, 12000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingRaw(data);
        } catch (err) {
          console.error('[Signaling JSON error]:', err);
        }
      };

      this.ws.onclose = () => {
        this.setConnected(false);
        // Attempt reconnection after 3 seconds
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {
        this.setConnected(false);
      };
    } catch (err) {
      console.warn('WS not directly available, relying on BroadcastChannel & HTTP:', err);
      this.setConnected(true); // Active via fallbacks
    }
  }

  private register() {
    const payload = {
      type: 'register',
      from: this.myUserId,
      name: this.myDisplayName,
      role: this.myRole,
    };
    this.sendRaw(payload);
  }

  private broadcastSelf() {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'peer_announce',
        peer: {
          id: this.myUserId,
          name: this.myDisplayName,
          role: this.myRole,
        },
      });
    }
  }

  private startHttpPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Initial check
    this.pollMailbox();

    this.pollInterval = setInterval(() => {
      // Only poll if WebSocket is not OPEN or as backup
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.pollMailbox();
      }
    }, 2500);
  }

  private async pollMailbox() {
    if (!this.myUserId) return;
    try {
      const res = await fetch(`/api/signaling/poll?userId=${encodeURIComponent(this.myUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            this.handleIncomingRaw(msg);
          }
        }
        this.setConnected(true);
      }
    } catch (e) {
      // Fallback silent fail
    }
  }

  private handleIncomingRaw(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'call_request') {
      this.dispatch({
        type: 'incoming_call',
        from: data.from,
        fromName: data.fromName || (data.role === 'student' ? 'الطالب' : 'المستخدم'),
        callId: data.callId,
        role: data.role,
      });
    } else if (data.type === 'call_accepted') {
      this.dispatch({
        type: 'call_accepted',
        from: data.from,
        callId: data.callId,
      });
    } else if (data.type === 'call_rejected') {
      this.dispatch({
        type: 'call_rejected',
        from: data.from,
        callId: data.callId,
        reason: data.reason,
      });
    } else if (data.type === 'offer') {
      this.dispatch({
        type: 'offer',
        from: data.from,
        sdp: data.sdp,
        callId: data.callId,
      });
    } else if (data.type === 'answer') {
      this.dispatch({
        type: 'answer',
        from: data.from,
        sdp: data.sdp,
        callId: data.callId,
      });
    } else if (data.type === 'ice_candidate') {
      this.dispatch({
        type: 'ice_candidate',
        from: data.from,
        candidate: data.candidate,
        callId: data.callId,
      });
    } else if (data.type === 'end_call') {
      this.dispatch({
        type: 'end_call',
        from: data.from,
        callId: data.callId,
        reason: data.reason,
      });
    } else if (data.type === 'peers') {
      this.dispatch({
        type: 'peers',
        peers: data.peers || [],
      });
    }
  }

  private dispatch(evt: SignalingEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(evt);
      } catch (err) {
        console.error('[Signaling Dispatch Error]:', err);
      }
    });
  }

  sendRaw(data: any) {
    // 1. Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (e) {}
    }

    // 2. Send via BroadcastChannel for local cross-tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch (e) {}
    }

    // 3. Send via HTTP POST if target peer specified and WS closed
    if (data.to && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      fetch('/api/signaling/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    }
  }

  /**
   * High level actions
   */
  requestCall(targetId: string, callId: string) {
    this.sendRaw({
      type: 'call_request',
      from: this.myUserId,
      fromName: this.myDisplayName,
      to: targetId,
      callId,
      role: this.myRole,
    });
  }

  acceptCall(callerId: string, callId: string) {
    this.sendRaw({
      type: 'call_accepted',
      from: this.myUserId,
      to: callerId,
      callId,
    });
  }

  rejectCall(callerId: string, callId: string, reason?: string) {
    this.sendRaw({
      type: 'call_rejected',
      from: this.myUserId,
      to: callerId,
      callId,
      reason: reason || 'مرفوض',
    });
  }

  sendOffer(targetId: string, sdp: RTCSessionDescriptionInit, callId: string) {
    this.sendRaw({
      type: 'offer',
      from: this.myUserId,
      to: targetId,
      sdp,
      callId,
    });
  }

  sendAnswer(targetId: string, sdp: RTCSessionDescriptionInit, callId: string) {
    this.sendRaw({
      type: 'answer',
      from: this.myUserId,
      to: targetId,
      sdp,
      callId,
    });
  }

  sendIceCandidate(targetId: string, candidate: RTCIceCandidateInit, callId: string) {
    this.sendRaw({
      type: 'ice_candidate',
      from: this.myUserId,
      to: targetId,
      candidate,
      callId,
    });
  }

  endCall(targetId: string, callId: string, reason?: string) {
    this.sendRaw({
      type: 'end_call',
      from: this.myUserId,
      to: targetId,
      callId,
      reason,
    });
  }

  cleanup() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch {}
    }
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
  }
}

export const signalingClient = new SignalingClient();
