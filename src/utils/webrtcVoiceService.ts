/**
 * WebRTC Voice Service for Real-Time Two-Way Audio Telephony
 * Supports peer-to-peer microphone streaming between browser tabs,
 * cross-device calls via Firestore signaling, and live AudioContext sound analysis.
 */

import { doc, setDoc, onSnapshot, updateDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

const WEBRTC_BUS_NAME = 'etsalati_webrtc_audio_bus_v1';

export interface VoiceCallEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onAudioLevel?: (level: number, source: 'local' | 'remote') => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'failed' | 'ended') => void;
  onError?: (err: string) => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

class WebRTCVoiceService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private signalChannel: BroadcastChannel | null = null;
  private currentCallId: string | null = null;
  private isCaller: boolean = false;
  private isMuted: boolean = false;
  private events: VoiceCallEvents = {};

  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private unsubsFirestore: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.signalChannel = new BroadcastChannel(WEBRTC_BUS_NAME);
        this.signalChannel.onmessage = (event) => {
          this.handleSignalingMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
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
    this.endVoiceSession();
    this.currentCallId = callId;
    this.isCaller = isCaller;
    this.events = events;
    this.isMuted = false;

    events.onStatusChange?.('connecting');

    try {
      // 1. Capture user microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Setup audio analyzer for voice visualizer
      this.setupAudioAnalysis(this.localStream);

      // Setup remote audio playback element
      this.setupRemoteAudioElement();

      // 2. Initialize RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Add local audio tracks to peer connection
      this.localStream.getAudioTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle remote audio stream
      this.peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (this.remoteAudioElement) {
          this.remoteAudioElement.srcObject = remoteStream;
          this.remoteAudioElement.play().catch(() => {
            console.warn('AutoPlay blocked, will play on user interaction');
          });
        }
        this.events.onRemoteStream?.(remoteStream);
        this.events.onStatusChange?.('connected');
      };

      // Handle ICE Candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.currentCallId) {
          this.sendSignal({
            type: 'ice-candidate',
            callId: this.currentCallId,
            candidate: event.candidate.toJSON(),
            fromCaller: this.isCaller,
          });
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        if (state === 'connected') {
          this.events.onStatusChange?.('connected');
        } else if (state === 'failed' || state === 'disconnected') {
          this.events.onStatusChange?.('failed');
        }
      };

      // 3. Listen to remote signals from Firestore for cross-device calls
      this.listenToFirestoreSignals(callId);

      // 4. If caller, create SDP Offer
      if (this.isCaller) {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
        });
        await this.peerConnection.setLocalDescription(offer);
        this.sendSignal({
          type: 'sdp-offer',
          callId,
          sdp: offer,
          fromCaller: true,
        });
      } else {
        // Callee notifies caller that callee is ready to accept
        this.sendSignal({
          type: 'callee-ready',
          callId,
          fromCaller: false,
        });
      }
    } catch (err: any) {
      console.error('Error starting WebRTC voice call:', err);
      const msg = err.name === 'NotAllowedError'
        ? 'تم رفض إذن المايكروفون. يرجى السماح للتطبيق باستخدام المايكروفون في المتصفح.'
        : 'تعذر الوصول إلى المايكروفون. يرجى التحقق من توصيل المايك.';
      this.events.onError?.(msg);
      this.events.onStatusChange?.('failed');
    }
  }

  /**
   * Listen to Firestore signals collection for cross-device peer connection
   */
  private listenToFirestoreSignals(callId: string) {
    try {
      const signalsDoc = doc(db, 'active_calls', callId, 'webrtc', 'signaling');
      const unsub = onSnapshot(signalsDoc, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.senderRole !== (this.isCaller ? 'caller' : 'callee')) {
            this.handleSignalingMessage(data);
          }
        }
      }, () => {});
      this.unsubsFirestore.push(unsub);
    } catch {
      // Firestore fallback
    }
  }

  /**
   * Dispatch signaling message via BroadcastChannel & Firestore
   */
  private async sendSignal(data: any) {
    // 1. BroadcastChannel (fast local tab-to-tab)
    if (this.signalChannel) {
      try {
        this.signalChannel.postMessage(data);
      } catch (e) {
        console.debug('BroadcastChannel send error', e);
      }
    }

    // 2. Firestore Document (cross-browser / cross-device)
    if (this.currentCallId) {
      try {
        const sigRef = doc(db, 'active_calls', this.currentCallId, 'webrtc', 'signaling');
        await setDoc(sigRef, {
          ...data,
          senderRole: this.isCaller ? 'caller' : 'callee',
          timestamp: Date.now(),
        }, { merge: true });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Process incoming signaling message
   */
  private async handleSignalingMessage(data: any) {
    if (!data || data.callId !== this.currentCallId || !this.peerConnection) return;
    if (data.fromCaller === this.isCaller) return; // ignore own signals

    try {
      if (data.type === 'callee-ready' && this.isCaller) {
        // Re-send offer if callee just joined
        if (this.peerConnection.localDescription) {
          this.sendSignal({
            type: 'sdp-offer',
            callId: this.currentCallId,
            sdp: this.peerConnection.localDescription,
            fromCaller: true,
          });
        }
      } else if (data.type === 'sdp-offer' && !this.isCaller) {
        // Callee receives offer from Caller
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.sendSignal({
          type: 'sdp-answer',
          callId: this.currentCallId,
          sdp: answer,
          fromCaller: false,
        });
      } else if (data.type === 'sdp-answer' && this.isCaller) {
        // Caller receives answer from Callee
        if (this.peerConnection.signalingState !== 'stable') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } else if (data.type === 'ice-candidate' && data.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.debug('Error adding ICE candidate', e);
        }
      }
    } catch (e) {
      console.error('Signaling handling error:', e);
    }
  }

  /**
   * Setup Audio element for remote voice playback
   */
  private setupRemoteAudioElement() {
    if (!this.remoteAudioElement) {
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.id = 'etsalati-remote-voice';
      this.remoteAudioElement.autoplay = true;
      (this.remoteAudioElement as any).playsInline = true;
      document.body.appendChild(this.remoteAudioElement);
    }
  }

  /**
   * Real-time microphone audio frequency visualizer
   */
  private setupAudioAnalysis(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 64;
      source.connect(this.localAnalyser);

      const bufferLength = this.localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.localAnalyser) return;
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 255) * 100));
        this.events.onAudioLevel?.(normalized, 'local');
        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      this.animFrameId = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.debug('Audio analyzer error', e);
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
   * End voice session and cleanup audio tracks
   */
  public endVoiceSession() {
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

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    this.unsubsFirestore.forEach((u) => u());
    this.unsubsFirestore = [];

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }

    this.currentCallId = null;
    this.isMuted = false;
    this.events.onStatusChange?.('ended');
  }
}

export const webrtcVoice = new WebRTCVoiceService();
