/**
 * Professional Web Audio API Synthesizer for PBX Telephony
 * Generates authentic DTMF dial tones, Ringback tone (for caller),
 * Ringing tone (for receiver), Call ended tone, and pleasant Hold music.
 */

class TelephonyAudioService {
  private ctx: AudioContext | null = null;
  private ringbackOsc1: OscillatorNode | null = null;
  private ringbackOsc2: OscillatorNode | null = null;
  private ringbackGain: GainNode | null = null;
  private ringbackInterval: any = null;

  private incomingRingOsc: OscillatorNode | null = null;
  private incomingRingGain: GainNode | null = null;
  private incomingRingInterval: any = null;

  private holdInterval: any = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // DTMF Frequencies (Row x Column)
  private dtmfFrequencies: { [key: string]: [number, number] } = {
    '1': [697, 1209],
    '2': [697, 1336],
    '3': [697, 1477],
    '4': [770, 1209],
    '5': [770, 1336],
    '6': [770, 1477],
    '7': [852, 1209],
    '8': [852, 1336],
    '9': [852, 1477],
    '*': [941, 1209],
    '0': [941, 1336],
    '#': [941, 1477],
  };

  /**
   * Play DTMF Dual Tone for keypad press
   */
  public playDTMF(digit: string, duration = 0.15) {
    try {
      const freqs = this.dtmfFrequencies[digit];
      if (!freqs) return;

      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // Audio context might need user gesture
    }
  }

  /**
   * Play standard PBX Ringback tone (What the caller hears while waiting)
   * 440 Hz + 480 Hz cadence (2s ON, 4s OFF in standard US/IP-PBX)
   */
  public startRingbackTone() {
    this.stopAllSounds();
    try {
      const ctx = this.getContext();
      
      const playBurst = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.setValueAtTime(0.05, now + 1.2);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
      };

      playBurst();
      this.ringbackInterval = setInterval(playBurst, 3000);
    } catch {
      // Audio context error
    }
  }

  public stopRingbackTone() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
  }

  /**
   * Play incoming call ringing melody for the receiver
   */
  public startIncomingRingtone() {
    this.stopAllSounds();
    try {
      const ctx = this.getContext();

      const playRingCycle = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Elegant European IP-PBX chime (double chirp)
        const chime = (timeOffset: number, freq: number) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + timeOffset);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + timeOffset + 0.35);

          gain.gain.setValueAtTime(0.12, now + timeOffset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.38);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + timeOffset);
          osc.stop(now + timeOffset + 0.4);
        };

        chime(0, 587.33); // D5
        chime(0.18, 880); // A5
        chime(0.45, 659.25); // E5
        chime(0.63, 1046.5); // C6
      };

      playRingCycle();
      this.incomingRingInterval = setInterval(playRingCycle, 2200);
    } catch {
      // Audio context error
    }
  }

  public stopIncomingRingtone() {
    if (this.incomingRingInterval) {
      clearInterval(this.incomingRingInterval);
      this.incomingRingInterval = null;
    }
  }

  /**
   * Play Call Connected Beep
   */
  public playConnectedBeep() {
    this.stopAllSounds();
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  /**
   * Play Call Ended / Busy Tone
   */
  public playCallEndedTone() {
    this.stopAllSounds();
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 3 quick beeps
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = 480;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.12);
      }
    } catch {}
  }

  /**
   * Play soft pleasant chords while call is on hold
   */
  public startHoldMusic() {
    this.stopHoldMusic();
    try {
      const notes = [261.63, 329.63, 392.00, 523.25, 440.0, 349.23];
      let step = 0;

      const playChord = () => {
        if (!this.ctx) return;
        const note = notes[step % notes.length];
        step++;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
      };

      playChord();
      this.holdInterval = setInterval(playChord, 1300);
    } catch {}
  }

  public stopHoldMusic() {
    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = null;
    }
  }

  public stopAllSounds() {
    this.stopRingbackTone();
    this.stopIncomingRingtone();
    this.stopHoldMusic();
  }
}

export const telephonyAudio = new TelephonyAudioService();
