/**
 * Synthesizes telephone tones and call ringtones using Web Audio API.
 * 100% self-contained, zero external asset dependencies.
 */
class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private ringOsc1: OscillatorNode | null = null;
  private ringOsc2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringTimer: any = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Start outgoing dial tone (tone heard by the caller while waiting for receiver to answer)
   */
  startOutgoingTone() {
    this.stopRinging();
    try {
      const ctx = this.getContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);
      this.ringGain = gain;

      // Standard Dial Tone: 440Hz + 480Hz pulses (1.5s on, 2.5s off)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start();
      osc2.start();

      this.ringOsc1 = osc1;
      this.ringOsc2 = osc2;

      // Pulse pattern
      let isBeep = true;
      const pulse = () => {
        if (!this.ringGain || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (isBeep) {
          this.ringGain.gain.cancelScheduledValues(now);
          this.ringGain.gain.setValueAtTime(0.08, now);
          this.ringTimer = setTimeout(pulse, 1200);
        } else {
          this.ringGain.gain.cancelScheduledValues(now);
          this.ringGain.gain.setValueAtTime(0, now);
          this.ringTimer = setTimeout(pulse, 2000);
        }
        isBeep = !isBeep;
      };
      pulse();
    } catch (e) {
      console.warn('Outgoing tone error:', e);
    }
  }

  /**
   * Start incoming ringtone (pleasant modern chime ringtone when phone rings)
   */
  startIncomingRingtone() {
    this.stopRinging();
    try {
      const ctx = this.getContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);
      this.ringGain = gain;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.connect(gain);
      osc.start();
      this.ringOsc1 = osc;

      // Melodic phone ring pattern: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5) -> 1046Hz (C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      let step = 0;

      const playChime = () => {
        if (!this.ringGain || !this.ctx || !this.ringOsc1) return;
        const now = this.ctx.currentTime;
        const note = notes[step % notes.length];
        this.ringOsc1.frequency.setValueAtTime(note, now);

        this.ringGain.gain.cancelScheduledValues(now);
        this.ringGain.gain.setValueAtTime(0.12, now);
        this.ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        step++;
        if (step % notes.length === 0) {
          this.ringTimer = setTimeout(playChime, 1600);
        } else {
          this.ringTimer = setTimeout(playChime, 220);
        }
      };

      playChime();
    } catch (e) {
      console.warn('Incoming ringtone error:', e);
    }
  }

  /**
   * Stop any ringing or dial tones
   */
  stopRinging() {
    if (this.ringTimer) {
      clearTimeout(this.ringTimer);
      this.ringTimer = null;
    }
    try {
      if (this.ringOsc1) {
        this.ringOsc1.stop();
        this.ringOsc1.disconnect();
        this.ringOsc1 = null;
      }
      if (this.ringOsc2) {
        this.ringOsc2.stop();
        this.ringOsc2.disconnect();
        this.ringOsc2 = null;
      }
      if (this.ringGain) {
        this.ringGain.disconnect();
        this.ringGain = null;
      }
    } catch (e) {}
  }

  /**
   * Play call connected sound (cheerful double beep)
   */
  playCallConnected() {
    this.stopRinging();
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  /**
   * Play call ended sound (two low descending tones)
   */
  playCallEnded() {
    this.stopRinging();
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(261.63, now + 0.15); // C4

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }
}

export const soundEffects = new SoundEffectsManager();
