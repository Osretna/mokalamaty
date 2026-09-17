/**
 * Audio Loudspeaker & Web Audio Processor
 * Enables high-gain speakerphone mode (مكبر الصوت) with dynamic compression
 * and provides real-time audio volume analysis for wave visualizers.
 */
export class AudioLoudspeakerManager {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isSpeakerActive: boolean = false;
  private currentVolumeLevel: number = 1.0; // 1.0 = normal, up to 3.5 = boosted

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Attach remote MediaStream to Web Audio pipeline with Loudspeaker capability
   */
  attachRemoteStream(stream: MediaStream, audioElement?: HTMLAudioElement | null) {
    try {
      this.detach();
      const ctx = this.getAudioContext();

      // Create nodes
      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.gainNode = ctx.createGain();
      this.compressorNode = ctx.createDynamicsCompressor();
      this.analyserNode = ctx.createAnalyser();

      // Configure compressor to prevent ear-damaging distortion at 300% volume
      this.compressorNode.threshold.setValueAtTime(-14, ctx.currentTime);
      this.compressorNode.knee.setValueAtTime(40, ctx.currentTime);
      this.compressorNode.ratio.setValueAtTime(12, ctx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
      this.compressorNode.release.setValueAtTime(0.25, ctx.currentTime);

      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Apply initial gain according to speaker state
      this.applyGain();

      // Audio Graph: Source -> Gain -> Compressor -> Analyser -> Destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.analyserNode);
      this.analyserNode.connect(ctx.destination);

      // Also ensure standard audio element is ready as fallback
      if (audioElement) {
        audioElement.srcObject = stream;
        // Mute the raw audio element if Web Audio destination is playing it,
        // to avoid duplicate playback / echo, or keep audio element at 0 volume.
        audioElement.volume = 0;
        audioElement.play().catch(() => {});
      }
    } catch (e) {
      console.warn('[AudioLoudspeaker] Web Audio attach fallback:', e);
      if (audioElement) {
        audioElement.srcObject = stream;
        audioElement.volume = 1;
        audioElement.play().catch(() => {});
      }
    }
  }

  /**
   * Toggle Speakerphone / مكبر الصوت
   */
  setSpeakerphone(enabled: boolean, audioElement?: HTMLAudioElement | null) {
    this.isSpeakerActive = enabled;
    this.currentVolumeLevel = enabled ? 3.0 : 1.0;
    this.applyGain();

    // Try hardware device routing via setSinkId if supported
    if (audioElement && 'setSinkId' in HTMLMediaElement.prototype) {
      this.routeToHardwareSpeaker(audioElement, enabled).catch(() => {});
    }
  }

  /**
   * Set specific volume multiplier (0.5 to 3.5)
   */
  setVolumeBoost(multiplier: number) {
    this.currentVolumeLevel = Math.max(0.2, Math.min(3.5, multiplier));
    this.applyGain();
  }

  private applyGain() {
    if (this.gainNode && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setTargetAtTime(this.currentVolumeLevel, now, 0.05);
    }
  }

  /**
   * Attempt to route audio output to speakerphone on supported mobile/desktop browsers
   */
  private async routeToHardwareSpeaker(audioElement: HTMLAudioElement, speaker: boolean) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      if (outputs.length <= 1) return;

      if (speaker) {
        // Find speaker device
        const speakerDev = outputs.find(d => 
          d.label.toLowerCase().includes('speaker') ||
          d.label.toLowerCase().includes('مكبر') ||
          d.deviceId === 'communications' ||
          d.deviceId === 'default'
        ) || outputs[outputs.length - 1];

        if (speakerDev && (audioElement as any).setSinkId) {
          await (audioElement as any).setSinkId(speakerDev.deviceId);
        }
      } else {
        // Default / earpiece
        const defaultDev = outputs.find(d => d.deviceId === 'default') || outputs[0];
        if (defaultDev && (audioElement as any).setSinkId) {
          await (audioElement as any).setSinkId(defaultDev.deviceId);
        }
      }
    } catch (err) {
      console.log('[SinkId Routing note]:', err);
    }
  }

  /**
   * Get current real-time audio energy (0 to 100) for UI waveforms
   */
  getAudioLevel(): number {
    if (!this.analyserNode) return 0;
    try {
      const data = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.analyserNode.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length;
      return Math.min(100, Math.round((avg / 255) * 100 * 1.5));
    } catch {
      return 0;
    }
  }

  isSpeakerEnabled(): boolean {
    return this.isSpeakerActive;
  }

  getVolume(): number {
    return this.currentVolumeLevel;
  }

  detach() {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      if (this.compressorNode) {
        this.compressorNode.disconnect();
        this.compressorNode = null;
      }
      if (this.analyserNode) {
        this.analyserNode.disconnect();
        this.analyserNode = null;
      }
    } catch (e) {}
  }
}

export const audioLoudspeaker = new AudioLoudspeakerManager();
