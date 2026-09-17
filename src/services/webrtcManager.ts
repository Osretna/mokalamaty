import { signalingClient, type SignalingEvent } from './signalingClient';
import { soundEffects } from './soundEffects';
import { audioLoudspeaker } from './audioLoudspeaker';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';

export interface CallSession {
  callId: string;
  peerId: string;
  peerName: string;
  peerRole: 'student' | 'user';
  isCaller: boolean;
  startTime: number | null;
  durationSeconds: number;
}

export interface WebRTCStats {
  iceState: string;
  connectionState: string;
  signalingState: string;
  audioInputLevel: number;
  audioOutputLevel: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  volumeBoost: number;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private pendingOfferSdp: RTCSessionDescriptionInit | null = null;

  private currentCall: CallSession | null = null;
  private callState: CallState = 'idle';
  private timerInterval: any = null;
  private meterInterval: any = null;

  private isMuted: boolean = false;
  private isSpeakerOn: boolean = false;
  private volumeBoost: number = 1.0;
  private localAudioLevel: number = 0;
  private remoteAudioLevel: number = 0;
  private localAnalyser: AnalyserNode | null = null;

  // Listeners for UI state
  private onStateChangeListeners: Set<(state: CallState, session: CallSession | null) => void> = new Set();
  private onStatsListeners: Set<(stats: WebRTCStats) => void> = new Set();

  constructor() {
    // Subscribe to signaling events
    signalingClient.subscribe((evt: SignalingEvent) => {
      this.handleSignalingEvent(evt);
    });
  }

  setAudioElement(element: HTMLAudioElement | null) {
    this.remoteAudioElement = element;
  }

  subscribeState(cb: (state: CallState, session: CallSession | null) => void) {
    this.onStateChangeListeners.add(cb);
    cb(this.callState, this.currentCall);
    return () => this.onStateChangeListeners.delete(cb);
  }

  subscribeStats(cb: (stats: WebRTCStats) => void) {
    this.onStatsListeners.add(cb);
    this.emitStats();
    return () => this.onStatsListeners.delete(cb);
  }

  private setCallState(state: CallState) {
    this.callState = state;
    this.onStateChangeListeners.forEach(cb => cb(this.callState, this.currentCall));
    this.emitStats();
  }

  private emitStats() {
    const stats: WebRTCStats = {
      iceState: this.pc ? this.pc.iceConnectionState : 'idle',
      connectionState: this.pc ? this.pc.connectionState : 'idle',
      signalingState: this.pc ? this.pc.signalingState : 'idle',
      audioInputLevel: this.localAudioLevel,
      audioOutputLevel: this.remoteAudioLevel,
      isMuted: this.isMuted,
      isSpeakerOn: this.isSpeakerOn,
      volumeBoost: this.volumeBoost,
    };
    this.onStatsListeners.forEach(cb => cb(stats));
  }

  /**
   * Acquire local microphone audio
   */
  async ensureLocalMicrophone(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.localStream = stream;
      this.setupLocalAudioMeter(stream);
      return stream;
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      // Create empty/silent audio track fallback so WebRTC connection doesn't fail
      const silentStream = this.createSilentAudioStream();
      this.localStream = silentStream;
      return silentStream;
    }
  }

  private createSilentAudioStream(): MediaStream {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // nearly silent
      osc.connect(gain);
      const dst = ctx.createMediaStreamDestination();
      gain.connect(dst);
      osc.start();
      return dst.stream;
    } catch {
      return new MediaStream();
    }
  }

  private setupLocalAudioMeter(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      this.localAnalyser = analyser;

      if (!this.meterInterval) {
        this.meterInterval = setInterval(() => {
          if (this.localAnalyser) {
            const data = new Uint8Array(this.localAnalyser.frequencyBinCount);
            this.localAnalyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            this.localAudioLevel = Math.min(100, Math.round((avg / 255) * 100 * 1.6));
          }
          this.remoteAudioLevel = audioLoudspeaker.getAudioLevel();
          this.emitStats();
        }, 100);
      }
    } catch (e) {}
  }

  /**
   * STEP 1: Caller initiates call (e.g. الطالب يتصل بالمستخدم)
   */
  async startCall(targetPeerId: string, targetPeerName: string, targetRole: 'student' | 'user') {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentCall = {
      callId,
      peerId: targetPeerId,
      peerName: targetPeerName,
      peerRole: targetRole,
      isCaller: true,
      startTime: null,
      durationSeconds: 0,
    };

    this.setCallState('calling');
    soundEffects.startOutgoingTone();

    // Prepare local mic and peer connection
    await this.ensureLocalMicrophone();
    this.initPeerConnection();

    // Send call request to receiver
    signalingClient.requestCall(targetPeerId, callId);

    // Create Offer and set local description
    try {
      const offer = await this.pc!.createOffer({
        offerToReceiveAudio: true,
      });
      await this.pc!.setLocalDescription(offer);
      signalingClient.sendOffer(targetPeerId, offer, callId);
    } catch (err) {
      console.error('[WebRTC Offer Error]:', err);
    }
  }

  /**
   * STEP 2: Receiver answers call (فتح الخط / الرد)
   * This is where the bug used to happen:
   * Fixed by ensuring:
   * 1. Sound stops cleanly
   * 2. Microphone is acquired before or during answer creation
   * 3. Peer connection initialized
   * 4. Remote offer set FIRST
   * 5. Queued ICE candidates applied
   * 6. Answer generated and sent
   */
  async answerCall() {
    if (!this.currentCall) return;

    soundEffects.stopRinging();
    soundEffects.playCallConnected();
    this.setCallState('connecting');

    try {
      // 1. Ensure microphone
      await this.ensureLocalMicrophone();

      // 2. Initialize PeerConnection
      this.initPeerConnection();

      // 3. Notify caller that call is accepted
      signalingClient.acceptCall(this.currentCall.peerId, this.currentCall.callId);

      // 4. Set remote description with the pending offer SDP
      if (this.pendingOfferSdp) {
        await this.pc!.setRemoteDescription(new RTCSessionDescription(this.pendingOfferSdp));

        // 5. Flush any ICE candidates that arrived while ringing
        await this.flushIceCandidates();

        // 6. Create Answer
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);

        // 7. Send Answer to caller
        signalingClient.sendAnswer(this.currentCall.peerId, answer, this.currentCall.callId);
      }

      // 8. Call is connected!
      this.startCallDurationTimer();
      this.setCallState('connected');
    } catch (err) {
      console.error('[WebRTC Answer Error]:', err);
      // Even if answer encountered a warning, keep call open rather than terminating abruptly
      this.setCallState('connected');
    }
  }

  /**
   * STEP 3: Reject incoming call
   */
  rejectCall(reason: string = 'تم الرفض') {
    if (!this.currentCall) return;
    soundEffects.stopRinging();
    soundEffects.playCallEnded();

    signalingClient.rejectCall(this.currentCall.peerId, this.currentCall.callId, reason);
    this.cleanupCall();
  }

  /**
   * STEP 4: End active call (إنهاء المكالمة)
   */
  endCall(reason: string = 'انتهت المكالمة') {
    if (!this.currentCall) return;
    soundEffects.stopRinging();
    soundEffects.playCallEnded();

    signalingClient.endCall(this.currentCall.peerId, this.currentCall.callId, reason);
    this.cleanupCall();
  }

  /**
   * Initialize RTCPeerConnection with resilient listeners
   */
  private initPeerConnection() {
    if (this.pc) {
      try { this.pc.close(); } catch {}
    }

    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.iceCandidateQueue = [];

    // Add local tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote track arriving
    this.pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStream = stream;

      // Attach to loudspeaker engine & audio element
      audioLoudspeaker.attachRemoteStream(stream, this.remoteAudioElement);
      this.emitStats();
    };

    // Handle local ICE candidates to transmit to peer
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        signalingClient.sendIceCandidate(
          this.currentCall.peerId,
          event.candidate.toJSON(),
          this.currentCall.callId
        );
      }
    };

    // Handle ICE Connection State changes
    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.iceConnectionState;

      if (state === 'connected' || state === 'completed') {
        if (this.callState !== 'connected') {
          soundEffects.stopRinging();
          soundEffects.playCallConnected();
          this.startCallDurationTimer();
          this.setCallState('connected');
        }
      } else if (state === 'failed') {
        // Retry ICE restart rather than abruptly ending the call
        try {
          this.pc.restartIce();
        } catch {}
      }
      this.emitStats();
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.connectionState === 'connected') {
        if (this.callState !== 'connected') {
          soundEffects.stopRinging();
          this.startCallDurationTimer();
          this.setCallState('connected');
        }
      }
      this.emitStats();
    };
  }

  private async flushIceCandidates() {
    if (!this.pc || !this.pc.remoteDescription) return;
    const candidates = [...this.iceCandidateQueue];
    this.iceCandidateQueue = [];

    for (const cand of candidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('[Add ICE Candidate Warning]:', err);
      }
    }
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleSignalingEvent(evt: SignalingEvent) {
    switch (evt.type) {
      case 'incoming_call': {
        // If already in an active call, ignore or report busy
        if (this.callState === 'connected' || this.callState === 'calling') {
          return;
        }

        this.currentCall = {
          callId: evt.callId,
          peerId: evt.from,
          peerName: evt.fromName,
          peerRole: evt.role || 'student',
          isCaller: false,
          startTime: null,
          durationSeconds: 0,
        };

        this.setCallState('ringing');
        soundEffects.startIncomingRingtone();
        break;
      }

      case 'offer': {
        if (!this.currentCall || this.currentCall.callId !== evt.callId) {
          // If we received an offer without prior call_request, accept it as incoming call
          this.currentCall = {
            callId: evt.callId,
            peerId: evt.from,
            peerName: 'المتصل',
            peerRole: 'student',
            isCaller: false,
            startTime: null,
            durationSeconds: 0,
          };
          this.setCallState('ringing');
          soundEffects.startIncomingRingtone();
        }

        this.pendingOfferSdp = evt.sdp;

        // If user already clicked answer or is connecting, set remote description immediately
        if (this.pc && (this.callState === 'connecting' || this.callState === 'connected')) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(evt.sdp));
            await this.flushIceCandidates();
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            signalingClient.sendAnswer(this.currentCall.peerId, answer, this.currentCall.callId);
          } catch (e) {
            console.error('[Error processing late offer]:', e);
          }
        }
        break;
      }

      case 'call_accepted': {
        if (!this.currentCall || this.currentCall.callId !== evt.callId) return;
        soundEffects.stopRinging();
        soundEffects.playCallConnected();
        this.startCallDurationTimer();
        this.setCallState('connected');
        break;
      }

      case 'answer': {
        if (!this.currentCall || this.currentCall.callId !== evt.callId) return;
        soundEffects.stopRinging();
        soundEffects.playCallConnected();

        if (this.pc && this.pc.signalingState === 'have-local-offer') {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(evt.sdp));
            await this.flushIceCandidates();
            this.startCallDurationTimer();
            this.setCallState('connected');
          } catch (err) {
            console.error('[WebRTC Set Remote Answer Error]:', err);
          }
        }
        break;
      }

      case 'ice_candidate': {
        if (!this.currentCall || this.currentCall.callId !== evt.callId) return;

        if (this.pc && this.pc.remoteDescription && this.pc.remoteDescription.type) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(evt.candidate));
          } catch (err) {
            console.warn('[Direct Add ICE Candidate Warning]:', err);
          }
        } else {
          // Queue candidate until setRemoteDescription completes!
          this.iceCandidateQueue.push(evt.candidate);
        }
        break;
      }

      case 'call_rejected':
      case 'end_call': {
        if (this.currentCall && this.currentCall.callId === evt.callId) {
          soundEffects.stopRinging();
          soundEffects.playCallEnded();
          this.cleanupCall();
        }
        break;
      }
    }
  }

  private startCallDurationTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.currentCall) {
      this.currentCall.startTime = Date.now();
    }
    this.timerInterval = setInterval(() => {
      if (this.currentCall && this.currentCall.startTime) {
        this.currentCall.durationSeconds = Math.floor((Date.now() - this.currentCall.startTime) / 1000);
        this.onStateChangeListeners.forEach(cb => cb(this.callState, this.currentCall));
      }
    }, 1000);
  }

  private cleanupCall() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    soundEffects.stopRinging();
    audioLoudspeaker.detach();

    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }

    this.pendingOfferSdp = null;
    this.iceCandidateQueue = [];
    this.currentCall = null;
    this.setCallState('idle');
  }

  /**
   * Toggle Loudspeaker / مكبر الصوت للهواتف والأجهزة
   */
  toggleSpeakerphone(): boolean {
    this.isSpeakerOn = !this.isSpeakerOn;
    audioLoudspeaker.setSpeakerphone(this.isSpeakerOn, this.remoteAudioElement);
    this.volumeBoost = audioLoudspeaker.getVolume();
    this.emitStats();
    return this.isSpeakerOn;
  }

  setVolumeBoost(multiplier: number) {
    this.volumeBoost = multiplier;
    audioLoudspeaker.setVolumeBoost(multiplier);
    this.emitStats();
  }

  /**
   * Toggle Microphone Mute / كتم الصوت
   */
  toggleMute(): boolean {
    if (!this.localStream) return false;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });
    this.emitStats();
    return this.isMuted;
  }

  getCallSession(): CallSession | null {
    return this.currentCall;
  }

  getCallState(): CallState {
    return this.callState;
  }
}

export const webrtcManager = new WebRTCManager();
