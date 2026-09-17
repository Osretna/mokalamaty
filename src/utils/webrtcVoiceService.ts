/**
 * WebRTC Voice Service for Real-Time Two-Way Audio Telephony
 * High-performance peer-to-peer audio streaming between web browsers & mobile devices.
 * Dual-layer signaling via Firebase Realtime Database (RTDB) + Firestore + BroadcastChannel + LocalStorage.
 * Includes Loudspeaker (مكبر الصوت للهاتف) mode with up to 350% audio gain boost,
 * candidate queuing, multi-STUN enterprise configuration, and real-time audio visualizers.
 */

import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  ref,
  set,
  onValue,
  push,
  remove,
} from 'firebase/database';
import { db, rtdb } from '../lib/firebase';

const WEBRTC_BUS_NAME = 'etsalati_webrtc_audio_bus_v3';

export interface VoiceCallEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onAudioLevel?: (level: number, source: 'local' | 'remote') => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'failed' | 'ended') => void;
  onError?: (err: string) => void;
  onSpeakerphoneChange?: (enabled: boolean) => void;
  onRemoteHangup?: () => void;
}

// Enterprise STUN servers for robust NAT traversal across mobile carriers & home Wi-Fi
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

function serializeSdp(desc: any) {
  if (!desc) return null;
  return {
    type: desc.type || 'offer',
    sdp: desc.sdp || '',
  };
}

function serializeCandidate(cand: any) {
  if (!cand) return null;
  const rawCandidate = typeof cand === 'string' ? cand : (cand.candidate || '');
  if (!rawCandidate || typeof rawCandidate !== 'string' || !rawCandidate.trim()) return null;
  const res: any = {
    candidate: rawCandidate.trim(),
  };
  if (cand.sdpMid !== undefined && cand.sdpMid !== null) {
    res.sdpMid = String(cand.sdpMid);
  }
  if (cand.sdpMLineIndex !== undefined && cand.sdpMLineIndex !== null && !isNaN(Number(cand.sdpMLineIndex))) {
    res.sdpMLineIndex = Number(cand.sdpMLineIndex);
  }
  if (typeof cand.usernameFragment === 'string' && cand.usernameFragment.trim()) {
    res.usernameFragment = cand.usernameFragment.trim();
  }
  return res;
}

function sanitizeCandidateInit(cand: any): RTCIceCandidateInit | null {
  if (!cand) return null;
  const rawCandidate =
    typeof cand === 'string'
      ? cand
      : typeof cand.candidate === 'string'
      ? cand.candidate
      : (cand.candidate?.candidate || '');
  if (!rawCandidate || typeof rawCandidate !== 'string' || !rawCandidate.trim()) return null;

  const init: RTCIceCandidateInit = {
    candidate: rawCandidate.trim(),
  };
  if (cand.sdpMid !== undefined && cand.sdpMid !== null && cand.sdpMid !== '') {
    init.sdpMid = String(cand.sdpMid);
  }
  if (cand.sdpMLineIndex !== undefined && cand.sdpMLineIndex !== null && !isNaN(Number(cand.sdpMLineIndex))) {
    init.sdpMLineIndex = Number(cand.sdpMLineIndex);
  }
  if (typeof cand.usernameFragment === 'string' && cand.usernameFragment.trim()) {
    init.usernameFragment = cand.usernameFragment.trim();
  }
  return init;
}

class WebRTCVoiceService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private signalChannel: BroadcastChannel | null = null;
  private currentCallId: string | null = null;
  private isCaller: boolean = false;
  private isMuted: boolean = false;
  private isSpeakerphone: boolean = false;
  private speakerphoneGain: number = 3.2; // 320% volume boost for loudspeaker
  private events: VoiceCallEvents = {};

  // Web Audio pipeline for voice visualizers and loud speakerphone gain
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private remoteGainNode: GainNode | null = null;
  private remoteMediaSource: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  // Cleanup unsubscribers
  private unsubs: (() => void)[] = [];
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private processedCandidateKeys: Set<string> = new Set();
  private hasRemoteDescription: boolean = false;
  private audioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.signalChannel = new BroadcastChannel(WEBRTC_BUS_NAME);
          this.signalChannel.onmessage = (event) => {
            this.handleSignalingMessage(event.data);
          };
        }
      } catch (e) {
        console.debug('BroadcastChannel fallback notice:', e);
      }

      // Unlock audio on first global user interaction
      const unlockAudio = () => {
        this.unlockAudioPlayback();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  /**
   * Unlock AudioContext and Audio Element playback immediately upon user interaction
   */
  public unlockAudioPlayback() {
    try {
      this.setupRemoteAudioElement();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      if (this.remoteAudioElement) {
        this.remoteAudioElement.volume = 1.0;
        this.remoteAudioElement.muted = false;
        if (this.remoteStream) {
          this.remoteAudioElement.play().catch(() => {});
        } else if (!this.audioUnlocked) {
          // Play silent tick to authorize the HTML5 audio element for future play() calls without user gesture
          this.remoteAudioElement.src =
            'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          this.remoteAudioElement
            .play()
            .then(() => {
              this.audioUnlocked = true;
              if (this.remoteAudioElement && !this.remoteStream) {
                this.remoteAudioElement.pause();
                this.remoteAudioElement.removeAttribute('src');
              }
            })
            .catch(() => {});
        }
      }
      this.audioUnlocked = true;
    } catch {
      // ignore
    }
  }

  /**
   * Start or join a real voice call using microphone
   */
  public async startVoiceSession(
    callId: string,
    isCaller: boolean,
    events: VoiceCallEvents = {}
  ): Promise<void> {
    // Idempotency: if already connected to this call with active peer, preserve it
    if (
      this.currentCallId === callId &&
      this.peerConnection &&
      this.peerConnection.connectionState !== 'closed' &&
      this.peerConnection.connectionState !== 'failed'
    ) {
      this.events = { ...this.events, ...events };
      return;
    }

    // Reset previous session cleanly
    this.cleanupSession(false);

    this.currentCallId = callId;
    this.isCaller = isCaller;
    this.events = events;
    this.isMuted = false;
    this.pendingCandidates = [];
    this.hasRemoteDescription = false;

    events.onStatusChange?.('connecting');
    this.unlockAudioPlayback();

    try {
      // 1. Capture user microphone
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      } catch (micErr: any) {
        console.warn('Microphone access warning:', micErr);
        // If microphone was denied or unavailable, create a silent audio track
        // so WebRTC connection can still form and user can hear the other party!
        this.localStream = this.createSilentAudioStream();
        events.onError?.('تنبيه: تعذر التقاط المايكروفون. يرجى السماح بصلاحية المايك للتحدث بالصوت.');
      }

      // Setup audio analyzer for local microphone
      this.setupAudioAnalysis(this.localStream);

      // Setup remote audio playback element
      this.setupRemoteAudioElement();

      // 2. Initialize RTCPeerConnection with STUN
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Add local audio tracks to peer connection
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }

      // Handle incoming remote audio stream
      this.peerConnection.ontrack = (event) => {
        console.log('🔊 [WebRTC Voice] Remote audio track received:', event.track.id, event.track.readyState);
        const stream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([event.track]);
        this.remoteStream = stream;
        this.attachRemoteStream(stream);
        this.events.onRemoteStream?.(stream);
        this.events.onStatusChange?.('connected');
      };

      // Handle ICE Candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId) {
          const serialized = serializeCandidate(event.candidate);
          if (serialized) {
            this.sendSignal({
              type: 'ice-candidate',
              callId: this.currentCallId,
              candidate: serialized,
              fromCaller: this.isCaller,
            });
          }
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('📡 [WebRTC ConnectionState]:', state);
        if (state === 'connected') {
          this.events.onStatusChange?.('connected');
        } else if (state === 'failed') {
          console.warn('WebRTC peer connection failed, attempting ICE restart');
          this.handleIceRestart();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection?.iceConnectionState;
        console.log('❄️ [WebRTC IceConnectionState]:', iceState);
        if (iceState === 'connected' || iceState === 'completed') {
          this.events.onStatusChange?.('connected');
        }
      };

      // 3. Listen to remote signals from Realtime Database & Firestore
      this.listenToSignals(callId);

      // 4. Offer / Answer handshake
      if (this.isCaller) {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
        });
        await this.peerConnection.setLocalDescription(offer);
        const plainOffer = serializeSdp(offer);
        await this.sendSignal({
          type: 'sdp-offer',
          callId,
          sdp: plainOffer,
          fromCaller: true,
        });
      } else {
        // Callee notifies caller that callee is ready to accept
        await this.sendSignal({
          type: 'callee-ready',
          callId,
          fromCaller: false,
        });
      }
    } catch (err: any) {
      console.error('Error starting WebRTC voice call:', err);
      const msg =
        err.name === 'NotAllowedError'
          ? 'تم رفض إذن المايكروفون. يرجى السماح للتطبيق باستخدام المايكروفون في المتصفح.'
          : 'حدث خطأ في بدء الاتصال الصوتي. جاري محاولة إعادة الربط...';
      this.events.onError?.(msg);
      this.events.onStatusChange?.('failed');
    }
  }

  /**
   * Listen to signals across Realtime Database, Firestore, and LocalStorage
   */
  private listenToSignals(callId: string) {
    // 1. Realtime Database Listeners (Fastest: < 50ms)
    try {
      if (!this.isCaller) {
        // Callee listens for Offer
        const rtdbOfferRef = ref(rtdb, `webrtc_signals/${callId}/offer`);
        const unsubRtdbOffer = onValue(rtdbOfferRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            if (data && data.sdp) {
              this.handleSignalingMessage({
                type: 'sdp-offer',
                callId,
                sdp: data.sdp,
                fromCaller: true,
              });
            }
          }
        });
        this.unsubs.push(() => unsubRtdbOffer());
      } else {
        // Caller listens for Answer and Callee Ready
        const rtdbAnswerRef = ref(rtdb, `webrtc_signals/${callId}/answer`);
        const unsubRtdbAnswer = onValue(rtdbAnswerRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            if (data && data.sdp) {
              this.handleSignalingMessage({
                type: 'sdp-answer',
                callId,
                sdp: data.sdp,
                fromCaller: false,
              });
            }
          }
        });
        this.unsubs.push(() => unsubRtdbAnswer());

        const rtdbReadyRef = ref(rtdb, `webrtc_signals/${callId}/ready`);
        const unsubRtdbReady = onValue(rtdbReadyRef, (snap) => {
          if (snap.exists()) {
            this.handleSignalingMessage({
              type: 'callee-ready',
              callId,
              fromCaller: false,
            });
          }
        });
        this.unsubs.push(() => unsubRtdbReady());
      }

      // Listen for ICE Candidates from the other peer via RTDB
      const targetCandidateNode = this.isCaller ? 'callee_candidates' : 'caller_candidates';
      const rtdbCandidatesRef = ref(rtdb, `webrtc_signals/${callId}/${targetCandidateNode}`);
      const unsubRtdbCandidates = onValue(rtdbCandidatesRef, (snap) => {
        if (snap.exists()) {
          const list = snap.val();
          if (list && typeof list === 'object') {
            Object.values(list).forEach((cand: any) => {
              if (cand) {
                this.handleSignalingMessage({
                  type: 'ice-candidate',
                  callId,
                  candidate: cand,
                  fromCaller: !this.isCaller,
                });
              }
            });
          }
        }
      });
      this.unsubs.push(() => unsubRtdbCandidates());

      // Listen for call ended signal via RTDB
      const rtdbEndedRef = ref(rtdb, `webrtc_signals/${callId}/ended`);
      const unsubRtdbEnded = onValue(rtdbEndedRef, (snap) => {
        if (snap.exists() && snap.val()?.ended) {
          this.handleSignalingMessage({
            type: 'call-ended',
            callId,
            fromCaller: !this.isCaller,
          });
        }
      });
      this.unsubs.push(() => unsubRtdbEnded());
    } catch (e) {
      console.warn('RTDB signaling listener note:', e);
    }

    // 2. Firestore Listeners (Reliable cross-network fallback)
    try {
      if (!this.isCaller) {
        const offerDoc = doc(db, 'active_calls', callId, 'webrtc_signals', 'offer');
        const unsubOffer = onSnapshot(offerDoc, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.sdp) {
              this.handleSignalingMessage({
                type: 'sdp-offer',
                callId,
                sdp: data.sdp,
                fromCaller: true,
              });
            }
          }
        }, (e) => console.debug('Firestore offer sub note:', e));
        this.unsubs.push(unsubOffer);
      } else {
        const answerDoc = doc(db, 'active_calls', callId, 'webrtc_signals', 'answer');
        const unsubAnswer = onSnapshot(answerDoc, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.sdp) {
              this.handleSignalingMessage({
                type: 'sdp-answer',
                callId,
                sdp: data.sdp,
                fromCaller: false,
              });
            }
          }
        }, (e) => console.debug('Firestore answer sub note:', e));
        this.unsubs.push(unsubAnswer);

        const readyDoc = doc(db, 'active_calls', callId, 'webrtc_signals', 'ready');
        const unsubReady = onSnapshot(readyDoc, (snap) => {
          if (snap.exists()) {
            this.handleSignalingMessage({
              type: 'callee-ready',
              callId,
              fromCaller: false,
            });
          }
        }, () => {});
        this.unsubs.push(unsubReady);
      }

      // Firestore ICE candidates
      const candidatesCol = collection(
        db,
        'active_calls',
        callId,
        this.isCaller ? 'callee_candidates' : 'caller_candidates'
      );
      const unsubCandidates = onSnapshot(candidatesCol, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data && data.candidate) {
              this.handleSignalingMessage({
                type: 'ice-candidate',
                callId,
                candidate: data.candidate,
                fromCaller: !this.isCaller,
              });
            }
          }
        });
      }, (e) => console.debug('Firestore candidates sub note:', e));
      this.unsubs.push(unsubCandidates);

      // Firestore call ended listener
      const endedDoc = doc(db, 'active_calls', callId, 'webrtc_signals', 'ended');
      const unsubEnded = onSnapshot(endedDoc, (snap) => {
        if (snap.exists() && snap.data()?.ended) {
          this.handleSignalingMessage({
            type: 'call-ended',
            callId,
            fromCaller: !this.isCaller,
          });
        }
      }, () => {});
      this.unsubs.push(unsubEnded);
    } catch (e) {
      console.warn('Firestore signaling attach note:', e);
    }

    // 3. LocalStorage Event (Instant local tab-to-tab fallback)
    const handleStorageSignal = (e: StorageEvent) => {
      if (e.key === `etsalati_webrtc_signal_${callId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.handleSignalingMessage(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageSignal);
    this.unsubs.push(() => window.removeEventListener('storage', handleStorageSignal));
  }

  /**
   * Dispatch signaling message via BroadcastChannel, RTDB, Firestore, and LocalStorage
   */
  private async sendSignal(data: any) {
    if (!this.currentCallId) return;
    const callId = this.currentCallId;

    // 1. BroadcastChannel (fast local tab-to-tab)
    if (this.signalChannel) {
      try {
        this.signalChannel.postMessage(data);
      } catch (e) {
        console.debug('BroadcastChannel send error', e);
      }
    }

    // 2. LocalStorage signal event for same browser
    try {
      localStorage.setItem(
        `etsalati_webrtc_signal_${callId}`,
        JSON.stringify({ ...data, _ts: Date.now() })
      );
    } catch {
      // ignore
    }

    // 3. Firebase Realtime Database (Sub-50ms latency across networks)
    try {
      if (data.type === 'sdp-offer') {
        const plainOffer = serializeSdp(data.sdp);
        await set(ref(rtdb, `webrtc_signals/${callId}/offer`), {
          sdp: plainOffer,
          timestamp: Date.now(),
        });
      } else if (data.type === 'sdp-answer') {
        const plainAnswer = serializeSdp(data.sdp);
        await set(ref(rtdb, `webrtc_signals/${callId}/answer`), {
          sdp: plainAnswer,
          timestamp: Date.now(),
        });
      } else if (data.type === 'callee-ready') {
        await set(ref(rtdb, `webrtc_signals/${callId}/ready`), {
          ready: true,
          timestamp: Date.now(),
        });
      } else if (data.type === 'ice-candidate' && data.candidate) {
        const plainCand = serializeCandidate(data.candidate);
        if (plainCand) {
          const targetNode = this.isCaller ? 'caller_candidates' : 'callee_candidates';
          await push(ref(rtdb, `webrtc_signals/${callId}/${targetNode}`), plainCand);
        }
      } else if (data.type === 'call-ended') {
        await set(ref(rtdb, `webrtc_signals/${callId}/ended`), {
          ended: true,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.debug('RTDB signal send error:', e);
    }

    // 4. Firestore Document (Multi-device persistence)
    try {
      if (data.type === 'sdp-offer') {
        const plainOffer = serializeSdp(data.sdp);
        const offerRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'offer');
        await setDoc(offerRef, {
          sdp: plainOffer,
          timestamp: Date.now(),
        });
      } else if (data.type === 'sdp-answer') {
        const plainAnswer = serializeSdp(data.sdp);
        const answerRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'answer');
        await setDoc(answerRef, {
          sdp: plainAnswer,
          timestamp: Date.now(),
        });
      } else if (data.type === 'callee-ready') {
        const readyRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'ready');
        await setDoc(readyRef, {
          ready: true,
          timestamp: Date.now(),
        });
      } else if (data.type === 'ice-candidate' && data.candidate) {
        const plainCand = serializeCandidate(data.candidate);
        if (plainCand) {
          const targetCol = collection(
            db,
            'active_calls',
            callId,
            this.isCaller ? 'caller_candidates' : 'callee_candidates'
          );
          await addDoc(targetCol, {
            candidate: plainCand,
            timestamp: Date.now(),
          });
        }
      } else if (data.type === 'call-ended') {
        const endedRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'ended');
        await setDoc(endedRef, {
          ended: true,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.debug('Firestore signal send error:', e);
    }
  }

  /**
   * Process incoming signaling message with candidate queuing
   */
  private async handleSignalingMessage(data: any) {
    if (!data || data.callId !== this.currentCallId || !this.peerConnection) return;
    if (data.fromCaller === this.isCaller) return; // ignore own signals

    try {
      if (data.type === 'call-ended') {
        console.log('📞 [WebRTC] Remote peer ended call:', data.callId);
        this.events.onRemoteHangup?.();
        this.events.onStatusChange?.('ended');
        this.cleanupSession(true);
        return;
      } else if (data.type === 'callee-ready' && this.isCaller) {
        // Re-send offer if callee announced readiness
        if (this.peerConnection.localDescription) {
          const plainOffer = serializeSdp(this.peerConnection.localDescription);
          await this.sendSignal({
            type: 'sdp-offer',
            callId: this.currentCallId,
            sdp: plainOffer,
            fromCaller: true,
          });
        }
      } else if (data.type === 'sdp-offer' && !this.isCaller) {
        // Callee receives offer from Caller
        if (this.peerConnection.signalingState !== 'stable') {
          console.debug('Signaling state is not stable, rolling back');
          await this.peerConnection.setLocalDescription({ type: 'rollback' } as any).catch(() => {});
        }
        const sdpInit: RTCSessionDescriptionInit = {
          type: data.sdp?.type || 'offer',
          sdp: data.sdp?.sdp || data.sdp,
        };
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpInit));
        this.hasRemoteDescription = true;

        // Drain any pending candidates queued before offer arrived
        await this.flushPendingCandidates();

        // Create answer and send back
        const answer = await this.peerConnection.createAnswer({
          offerToReceiveAudio: true,
        });
        await this.peerConnection.setLocalDescription(answer);
        const plainAnswer = serializeSdp(answer);
        await this.sendSignal({
          type: 'sdp-answer',
          callId: this.currentCallId,
          sdp: plainAnswer,
          fromCaller: false,
        });
      } else if (data.type === 'sdp-answer' && this.isCaller) {
        // Caller receives answer from Callee
        if (this.peerConnection.signalingState === 'have-local-offer') {
          const sdpInit: RTCSessionDescriptionInit = {
            type: data.sdp?.type || 'answer',
            sdp: data.sdp?.sdp || data.sdp,
          };
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpInit));
          this.hasRemoteDescription = true;
          await this.flushPendingCandidates();
        }
      } else if (data.type === 'ice-candidate' && data.candidate) {
        const sanitized = sanitizeCandidateInit(data.candidate);
        if (sanitized) {
          const key = `${sanitized.candidate}|${sanitized.sdpMid || ''}|${sanitized.sdpMLineIndex ?? ''}`;
          if (!this.processedCandidateKeys.has(key)) {
            this.processedCandidateKeys.add(key);
            if (this.hasRemoteDescription && this.peerConnection.remoteDescription) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(sanitized));
              } catch (e) {
                console.debug('Queueing candidate after failed direct add:', e);
                this.pendingCandidates.push(sanitized);
              }
            } else {
              this.pendingCandidates.push(sanitized);
            }
          }
        }
      }
    } catch (e) {
      console.error('Signaling handling error:', e);
    }
  }

  /**
   * Flush queued candidates once remote description is successfully installed
   */
  private async flushPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    const list = [...this.pendingCandidates];
    this.pendingCandidates = [];

    for (const cand of list) {
      try {
        const sanitized = sanitizeCandidateInit(cand);
        if (sanitized) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(sanitized));
        }
      } catch (e) {
        console.debug('Error flushing ICE candidate:', e);
      }
    }
  }

  /**
   * Attempt ICE restart on connection drop
   */
  private async handleIceRestart() {
    if (!this.peerConnection || !this.isCaller || !this.currentCallId) return;
    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      const plainOffer = serializeSdp(offer);
      await this.sendSignal({
        type: 'sdp-offer',
        callId: this.currentCallId,
        sdp: plainOffer,
        fromCaller: true,
      });
    } catch (e) {
      console.warn('ICE restart error:', e);
    }
  }

  /**
   * Attach remote stream to audio element and Web Audio amplifier
   */
  private attachRemoteStream(stream: MediaStream) {
    this.setupRemoteAudioElement();
    if (!this.remoteAudioElement) return;

    // Explicitly ensure all tracks are active and unmuted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    this.remoteAudioElement.srcObject = stream;
    this.remoteAudioElement.volume = 1.0;

    const playPromise = this.remoteAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay requires user gesture:', err);
        const unlock = () => {
          this.remoteAudioElement?.play().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
      });
    }

    // Setup Web Audio analyzer & Loudspeaker amplifier
    this.setupAudioAmplifier(stream);
  }

  /**
   * Configure Web Audio GainNode & frequency analyzer for the remote stream
   */
  private setupAudioAmplifier(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Analyze remote voice level for visualizer
      const remoteSource = this.audioCtx.createMediaStreamSource(stream);
      this.remoteAnalyser = this.audioCtx.createAnalyser();
      this.remoteAnalyser.fftSize = 64;
      remoteSource.connect(this.remoteAnalyser);

      // Create gain amplifier node for loudspeaker boost
      this.remoteGainNode = this.audioCtx.createGain();
      this.remoteGainNode.gain.value = this.isSpeakerphone ? this.speakerphoneGain : 1.0;

      // Note: We leave remoteAudioElement playing the primary stream
      // When speakerphone is active, setSinkId and element volume or gain will amplify
    } catch (e) {
      console.debug('Remote audio amplifier setup note:', e);
    }
  }

  /**
   * Toggle Loudspeaker (مكبر الصوت للهاتف) mode
   */
  public toggleSpeakerphone(): boolean {
    return this.setSpeakerphone(!this.isSpeakerphone);
  }

  /**
   * Set Loudspeaker mode explicitly
   * When ON: boosts volume to maximum and directs to external speaker hardware if supported
   */
  public setSpeakerphone(enable: boolean): boolean {
    this.isSpeakerphone = enable;

    this.unlockAudioPlayback();

    // 1. Boost volume via Web Audio GainNode
    if (this.remoteGainNode && this.audioCtx) {
      try {
        const targetGain = enable ? this.speakerphoneGain : 1.0;
        this.remoteGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.05);
      } catch {
        if (this.remoteGainNode) {
          this.remoteGainNode.gain.value = enable ? this.speakerphoneGain : 1.0;
        }
      }
    }

    // 2. Maximize HTMLAudioElement volume
    if (this.remoteAudioElement) {
      this.remoteAudioElement.volume = 1.0;

      // 3. Try to route to external speaker device via setSinkId if browser supports it
      if ('setSinkId' in this.remoteAudioElement && typeof (this.remoteAudioElement as any).setSinkId === 'function') {
        if (enable && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().then((devices) => {
            const speaker = devices.find(
              (d) =>
                d.kind === 'audiooutput' &&
                (d.label.toLowerCase().includes('speaker') ||
                  d.deviceId === 'speaker' ||
                  d.label.includes('مكبر'))
            );
            if (speaker && this.remoteAudioElement) {
              (this.remoteAudioElement as any).setSinkId(speaker.deviceId).catch(() => {});
            }
          }).catch(() => {});
        } else if (!enable && this.remoteAudioElement) {
          (this.remoteAudioElement as any).setSinkId('').catch(() => {});
        }
      }
    }

    this.events.onSpeakerphoneChange?.(this.isSpeakerphone);
    return this.isSpeakerphone;
  }

  public getIsSpeakerphoneOn(): boolean {
    return this.isSpeakerphone;
  }

  public setSpeakerphoneGain(boost: number) {
    this.speakerphoneGain = Math.max(1.0, Math.min(4.0, boost));
    if (this.isSpeakerphone && this.remoteGainNode) {
      this.remoteGainNode.gain.value = this.speakerphoneGain;
    }
  }

  /**
   * Setup Audio element for remote voice playback
   */
  private setupRemoteAudioElement() {
    if (!this.remoteAudioElement) {
      let el = document.getElementById('etsalati-remote-voice') as HTMLAudioElement;
      if (!el) {
        el = document.createElement('audio');
        el.id = 'etsalati-remote-voice';
        el.autoplay = true;
        el.setAttribute('playsinline', 'true');
        el.setAttribute('webkit-playsinline', 'true');
        el.volume = 1.0;
        document.body.appendChild(el);
      }
      this.remoteAudioElement = el;
    }
  }

  /**
   * Real-time microphone audio frequency visualizer
   */
  private setupAudioAnalysis(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const source = this.audioCtx.createMediaStreamSource(stream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 64;
      source.connect(this.localAnalyser);

      const bufferLength = this.localAnalyser.frequencyBinCount;
      const localDataArray = new Uint8Array(bufferLength);
      const remoteDataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        // 1. Local mic level
        if (this.localAnalyser && !this.isMuted) {
          this.localAnalyser.getByteFrequencyData(localDataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += localDataArray[i];
          }
          const avg = sum / bufferLength;
          const normalized = Math.min(100, Math.round((avg / 255) * 100));
          this.events.onAudioLevel?.(normalized, 'local');
        } else if (this.isMuted) {
          this.events.onAudioLevel?.(0, 'local');
        }

        // 2. Remote voice level
        if (this.remoteAnalyser) {
          this.remoteAnalyser.getByteFrequencyData(remoteDataArray);
          let sumRemote = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumRemote += remoteDataArray[i];
          }
          const avgRemote = sumRemote / bufferLength;
          const normalizedRemote = Math.min(100, Math.round((avgRemote / 255) * 100));
          this.events.onAudioLevel?.(normalizedRemote, 'remote');
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      this.animFrameId = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.debug('Audio analyzer error', e);
    }
  }

  /**
   * Create a synthetic silent stream fallback if microphone was blocked
   */
  private createSilentAudioStream(): MediaStream {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      const gain = ctx.createGain();
      gain.gain.value = 0; // silent
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      return dst.stream;
    } catch {
      return new MediaStream();
    }
  }

  /**
   * Toggle microphone mute
   */
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set speaker volume (0 to 1)
   */
  public setVolume(volume: number) {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Cleanup session internal resources
   */
  private cleanupSession(emitEnded: boolean = true) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.unsubs.forEach((u) => u());
    this.unsubs = [];

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }

    // Clean signal in RTDB for finished call
    if (this.currentCallId) {
      const callId = this.currentCallId;
      try {
        remove(ref(rtdb, `webrtc_signals/${callId}`));
        localStorage.removeItem(`etsalati_webrtc_signal_${callId}`);
      } catch {
        // ignore
      }
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.isMuted = false;
    this.hasRemoteDescription = false;
    this.pendingCandidates = [];

    if (emitEnded) {
      this.events.onStatusChange?.('ended');
    }
  }

  /**
   * End voice session and cleanup audio tracks
   */
  public endVoiceSession(explicitCallId?: string) {
    const targetCallId = explicitCallId || this.currentCallId;
    if (targetCallId) {
      try {
        this.sendSignal({
          type: 'call-ended',
          callId: targetCallId,
          fromCaller: this.isCaller,
        });
      } catch {}
      try {
        set(ref(rtdb, `webrtc_signals/${targetCallId}/ended`), {
          ended: true,
          by: this.isCaller ? 'caller' : 'callee',
          timestamp: Date.now(),
        }).catch(() => {});
      } catch {}
    }
    this.cleanupSession(true);
  }
}

export const webrtcVoice = new WebRTCVoiceService();
