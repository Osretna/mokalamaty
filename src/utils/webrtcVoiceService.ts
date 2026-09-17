/**
 * WebRTC Voice Service for Real-Time Two-Way Audio Telephony
 * Supports peer-to-peer microphone streaming between browser tabs,
 * cross-device calls via Firestore signaling, Loudspeaker / Speakerphone mode (مكبر الصوت),
 * and live AudioContext sound analysis with candidate queueing.
 */

import { doc, setDoc, onSnapshot, collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const WEBRTC_BUS_NAME = 'etsalati_webrtc_audio_bus_v2';

export interface VoiceCallEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onAudioLevel?: (level: number, source: 'local' | 'remote') => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'failed' | 'ended') => void;
  onError?: (err: string) => void;
  onSpeakerphoneChange?: (enabled: boolean) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

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
  private speakerphoneGain: number = 2.8; // 280% volume boost for mobile phone loudspeaker
  private events: VoiceCallEvents = {};

  // Web Audio pipeline for voice analysis and speakerphone volume boost
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteGainNode: GainNode | null = null;
  private animFrameId: number | null = null;
  private unsubsFirestore: (() => void)[] = [];

  // ICE Candidate Queuing to prevent race conditions before remoteDescription is ready
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription: boolean = false;
  private audioUnlocked: boolean = false;

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

    // Auto-unlock audio on user touch/click (critical for mobile phones and autoplay restrictions)
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.unlockAudioPlayback();
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  /**
   * Unlock AudioContext and media playback on mobile browsers
   */
  public unlockAudioPlayback() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if (this.remoteAudioElement && this.remoteAudioElement.paused && this.remoteStream) {
      this.remoteAudioElement.play().catch(() => {});
    }
    this.audioUnlocked = true;
  }

  /**
   * Start or join a real voice call using microphone
   */
  public async startVoiceSession(
    callId: string,
    isCaller: boolean,
    events: VoiceCallEvents = {}
  ): Promise<void> {
    if (
      this.currentCallId === callId &&
      this.peerConnection &&
      this.peerConnection.connectionState !== 'closed' &&
      this.peerConnection.connectionState !== 'failed'
    ) {
      this.events = { ...this.events, ...events };
      return;
    }

    // Reset any previous session without sending premature 'ended'
    this.cleanupSession(false);

    this.currentCallId = callId;
    this.isCaller = isCaller;
    this.events = events;
    this.isMuted = false;
    this.pendingCandidates = [];
    this.hasRemoteDescription = false;

    events.onStatusChange?.('connecting');

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
        events.onError?.('تنبيه: تعذر التقاط المايكروفون. يرجى تفعيل صلاحية المايك في المتصفح للتحدث بالصوت.');
      }

      // Setup audio analyzer for voice visualizer
      this.setupAudioAnalysis(this.localStream);

      // Setup remote audio playback element
      this.setupRemoteAudioElement();

      // 2. Initialize RTCPeerConnection with STUN
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Add local audio tracks to peer connection
      this.localStream.getAudioTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle incoming remote audio stream
      this.peerConnection.ontrack = (event) => {
        const stream = event.streams[0];
        this.remoteStream = stream;
        this.attachRemoteStream(stream);
        this.events.onRemoteStream?.(stream);
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
        } else if (state === 'failed') {
          console.warn('WebRTC peer connection failed, attempting ICE restart');
          this.handleIceRestart();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const iceState = this.peerConnection?.iceConnectionState;
        if (iceState === 'connected' || iceState === 'completed') {
          this.events.onStatusChange?.('connected');
        }
      };

      // 3. Listen to remote signals from Firestore for cross-device calls
      this.listenToFirestoreSignals(callId);

      // 4. Offer / Answer handshake
      if (this.isCaller) {
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
        });
        await this.peerConnection.setLocalDescription(offer);
        await this.sendSignal({
          type: 'sdp-offer',
          callId,
          sdp: offer,
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
      const msg = err.name === 'NotAllowedError'
        ? 'تم رفض إذن المايكروفون. يرجى السماح للتطبيق باستخدام المايكروفون في المتصفح.'
        : 'حدث خطأ في بدء الاتصال الصوتي. جاري محاولة إعادة الربط...';
      this.events.onError?.(msg);
      this.events.onStatusChange?.('failed');
    }
  }

  /**
   * Listen to Firestore signals with dedicated document paths to avoid overwrites
   */
  private listenToFirestoreSignals(callId: string) {
    try {
      // 1. Listen for Offer
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
        }, (e) => console.debug('Firestore offer sub notice:', e));
        this.unsubsFirestore.push(unsubOffer);
      }

      // 2. Listen for Answer
      if (this.isCaller) {
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
        }, (e) => console.debug('Firestore answer sub notice:', e));
        this.unsubsFirestore.push(unsubAnswer);

        // Also listen for Callee ready signal
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
        this.unsubsFirestore.push(unsubReady);
      }

      // 3. Listen for ICE Candidates from the opposite peer
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
      }, (e) => console.debug('Firestore candidates sub notice:', e));
      this.unsubsFirestore.push(unsubCandidates);
    } catch (e) {
      console.warn('Firestore signaling attach notice:', e);
    }
  }

  /**
   * Dispatch signaling message via BroadcastChannel & Firestore distinct documents
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

    // 2. Firestore Document (cross-device / mobile phone <-> PC)
    if (this.currentCallId) {
      const callId = this.currentCallId;
      try {
        if (data.type === 'sdp-offer') {
          const offerRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'offer');
          await setDoc(offerRef, {
            sdp: data.sdp,
            timestamp: Date.now(),
          });
        } else if (data.type === 'sdp-answer') {
          const answerRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'answer');
          await setDoc(answerRef, {
            sdp: data.sdp,
            timestamp: Date.now(),
          });
        } else if (data.type === 'callee-ready') {
          const readyRef = doc(db, 'active_calls', callId, 'webrtc_signals', 'ready');
          await setDoc(readyRef, {
            ready: true,
            timestamp: Date.now(),
          });
        } else if (data.type === 'ice-candidate' && data.candidate) {
          const targetCol = collection(
            db,
            'active_calls',
            callId,
            this.isCaller ? 'caller_candidates' : 'callee_candidates'
          );
          await addDoc(targetCol, {
            candidate: data.candidate,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.debug('Firestore signal send error:', e);
      }
    }
  }

  /**
   * Process incoming signaling message with candidate queuing
   */
  private async handleSignalingMessage(data: any) {
    if (!data || data.callId !== this.currentCallId || !this.peerConnection) return;
    if (data.fromCaller === this.isCaller) return; // ignore own signals

    try {
      if (data.type === 'callee-ready' && this.isCaller) {
        // Re-send offer if callee announced readiness
        if (this.peerConnection.localDescription) {
          await this.sendSignal({
            type: 'sdp-offer',
            callId: this.currentCallId,
            sdp: this.peerConnection.localDescription,
            fromCaller: true,
          });
        }
      } else if (data.type === 'sdp-offer' && !this.isCaller) {
        // Callee receives offer from Caller
        if (this.peerConnection.signalingState !== 'stable') {
          console.debug('Signaling state is not stable, rolling back');
          await Promise.all([
            this.peerConnection.setLocalDescription({ type: 'rollback' } as any),
          ]);
        }
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        this.hasRemoteDescription = true;

        // Drain any pending candidates queued before offer arrived
        await this.flushPendingCandidates();

        // Create answer and send back
        const answer = await this.peerConnection.createAnswer({
          voiceActivityDetection: true,
        });
        await this.peerConnection.setLocalDescription(answer);
        await this.sendSignal({
          type: 'sdp-answer',
          callId: this.currentCallId,
          sdp: answer,
          fromCaller: false,
        });
      } else if (data.type === 'sdp-answer' && this.isCaller) {
        // Caller receives answer from Callee
        if (this.peerConnection.signalingState === 'have-local-offer') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
          this.hasRemoteDescription = true;
          await this.flushPendingCandidates();
        }
      } else if (data.type === 'ice-candidate' && data.candidate) {
        if (this.hasRemoteDescription && this.peerConnection.remoteDescription) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.debug('Direct ICE candidate error, queuing candidate', e);
            this.pendingCandidates.push(data.candidate);
          }
        } else {
          // Queue candidate until remoteDescription is set!
          this.pendingCandidates.push(data.candidate);
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
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
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
      await this.sendSignal({
        type: 'sdp-offer',
        callId: this.currentCallId,
        sdp: offer,
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

    this.remoteAudioElement.srcObject = stream;
    this.remoteAudioElement.play().catch(() => {
      console.warn('Autoplay blocked initially, will unlock on interaction');
    });

    // Pipe through Web Audio GainNode for Loudspeaker / Speakerphone boost
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const remoteSource = this.audioCtx.createMediaStreamSource(stream);
      this.remoteGainNode = this.audioCtx.createGain();
      // Apply initial speakerphone gain
      this.remoteGainNode.gain.value = this.isSpeakerphone ? this.speakerphoneGain : 1.0;

      remoteSource.connect(this.remoteGainNode);
      this.remoteGainNode.connect(this.audioCtx.destination);
    } catch (e) {
      console.debug('Remote audio amplifier setup note:', e);
    }
  }

  /**
   * Toggle Loudspeaker (مكبر الصوت) mode
   * When ON: boosts output gain to ~280% and routes to speaker device if supported
   */
  public toggleSpeakerphone(): boolean {
    return this.setSpeakerphone(!this.isSpeakerphone);
  }

  /**
   * Set Loudspeaker (مكبر الصوت) mode explicitly
   */
  public setSpeakerphone(enable: boolean): boolean {
    this.isSpeakerphone = enable;

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
      // 3. Try to select external speaker via setSinkId if browser supports it
      if ('setSinkId' in this.remoteAudioElement && typeof (this.remoteAudioElement as any).setSinkId === 'function') {
        if (enable && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          navigator.mediaDevices.enumerateDevices().then((devices) => {
            const speaker = devices.find(
              (d) => d.kind === 'audiooutput' && (d.label.toLowerCase().includes('speaker') || d.deviceId === 'speaker')
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
        (el as any).playsInline = true;
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

    this.unsubsFirestore.forEach((u) => u());
    this.unsubsFirestore = [];

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
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
  public endVoiceSession() {
    this.cleanupSession(true);
  }
}

export const webrtcVoice = new WebRTCVoiceService();
