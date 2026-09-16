// Web Audio API generator for authentic PBX telephony sounds and DTMF tones

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// DTMF standard frequencies
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  'A': [697, 1633],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  'B': [770, 1633],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  'C': [852, 1633],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
  'D': [941, 1633],
};

export function playDTMF(digit: string, durationMs: number = 180) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const freqs = DTMF_FREQS[digit.toUpperCase()];
    if (!freqs) return;

    const [f1, f2] = freqs;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = f1;

    osc2.type = 'sine';
    osc2.frequency.value = f2;

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + durationMs / 1000);
    osc2.stop(now + durationMs / 1000);
  } catch (err) {
    console.debug('Audio not allowed or supported', err);
  }
}

// Ringback tone (US / Standard PBX: 440Hz + 480Hz modulated)
let ringbackTimer: number | null = null;

export function startRingback() {
  stopRingback();
  const playCycle = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 440;
      osc2.type = 'sine';
      osc2.frequency.value = 480;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.setValueAtTime(0.06, now + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
    } catch {
      // ignore
    }
  };

  playCycle();
  ringbackTimer = window.setInterval(playCycle, 5000);
}

export function stopRingback() {
  if (ringbackTimer !== null) {
    clearInterval(ringbackTimer);
    ringbackTimer = null;
  }
}

// Incoming telephone ringing
let incomingRingTimer: number | null = null;

export function startIncomingRing() {
  stopIncomingRing();
  const ring = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const playBurst = (offset: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 480;
        osc2.type = 'sine';
        osc2.frequency.value = 620;

        const now = ctx.currentTime + offset;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
      };

      playBurst(0);
      playBurst(1.0);
    } catch {
      // ignore
    }
  };

  ring();
  incomingRingTimer = window.setInterval(ring, 4000);
}

export function stopIncomingRing() {
  if (incomingRingTimer !== null) {
    clearInterval(incomingRingTimer);
    incomingRingTimer = null;
  }
}

// Hold music generator (smooth soothing chords)
let holdMusicInterval: number | null = null;

export function startHoldMusic() {
  stopHoldMusic();
  const chords = [
    [261.63, 329.63, 392.00], // C
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
    [196.00, 246.94, 293.66], // G
  ];
  let chordIndex = 0;

  const playNextChord = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const chord = chords[chordIndex % chords.length];
      chordIndex++;

      const now = ctx.currentTime;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.2);
      });
    } catch {
      // ignore
    }
  };

  playNextChord();
  holdMusicInterval = window.setInterval(playNextChord, 2400);
}

export function stopHoldMusic() {
  if (holdMusicInterval !== null) {
    clearInterval(holdMusicInterval);
    holdMusicInterval = null;
  }
}

// Sound effects
export function playTelephonyFx(type: 'connected' | 'hangup' | 'beep' | 'fax' | 'notification') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'connected') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'hangup') {
      [0, 0.25, 0.5].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 425;
        gain.gain.setValueAtTime(0.08, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
    } else if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'notification') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 587.33; // D5
      osc2.type = 'sine';
      osc2.frequency.value = 880; // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } else if (type === 'fax') {
      // Characteristic fax CNG tone (1100 Hz tone bursts)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.linearRampToValueAtTime(2100, now + 0.4);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {
    // ignore
  }
}

// Voicemail text to speech player
export function speakVoicemail(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) setTimeout(onEnd, 3000);
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Continuous Dial Tone (350Hz + 440Hz standard PBX Off-Hook tone)
let dialToneOsc1: OscillatorNode | null = null;
let dialToneOsc2: OscillatorNode | null = null;
let dialToneGain: GainNode | null = null;

export function startDialTone() {
  stopDialTone();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    dialToneOsc1 = ctx.createOscillator();
    dialToneOsc2 = ctx.createOscillator();
    dialToneGain = ctx.createGain();

    dialToneOsc1.type = 'sine';
    dialToneOsc1.frequency.value = 350;

    dialToneOsc2.type = 'sine';
    dialToneOsc2.frequency.value = 440;

    const now = ctx.currentTime;
    dialToneGain.gain.setValueAtTime(0.04, now);

    dialToneOsc1.connect(dialToneGain);
    dialToneOsc2.connect(dialToneGain);
    dialToneGain.connect(ctx.destination);

    dialToneOsc1.start();
    dialToneOsc2.start();
  } catch (err) {
    console.debug('Failed to start dial tone', err);
  }
}

export function stopDialTone() {
  try {
    if (dialToneOsc1) {
      dialToneOsc1.stop();
      dialToneOsc1.disconnect();
      dialToneOsc1 = null;
    }
    if (dialToneOsc2) {
      dialToneOsc2.stop();
      dialToneOsc2.disconnect();
      dialToneOsc2 = null;
    }
    if (dialToneGain) {
      dialToneGain.disconnect();
      dialToneGain = null;
    }
  } catch {
    // ignore
  }
}

// Busy Tone (480Hz + 620Hz, 0.5s on, 0.5s off)
let busyToneTimer: number | null = null;

export function startBusyTone() {
  stopBusyTone();
  const playPulse = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 480;
      osc2.type = 'sine';
      osc2.frequency.value = 620;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch {
      // ignore
    }
  };

  playPulse();
  busyToneTimer = window.setInterval(playPulse, 1000);
}

export function stopBusyTone() {
  if (busyToneTimer !== null) {
    clearInterval(busyToneTimer);
    busyToneTimer = null;
  }
}

// Live Microphone Echo Test & Level Analyzer
let micStream: MediaStream | null = null;
let micAnimationId: number | null = null;

export async function startLiveMicTest(
  onLevelChange: (levelPercent: number) => void,
  enableEchoPlayback: boolean = false
): Promise<{ stop: () => void }> {
  const ctx = getAudioContext();
  if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Web Audio / Mic API not supported in this browser');
  }

  // Request mic permission
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const source = ctx.createMediaStreamSource(micStream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  let echoGain: GainNode | null = null;
  if (enableEchoPlayback) {
    echoGain = ctx.createGain();
    echoGain.gain.value = 0.25; // Safe comfortable echo level
    analyser.connect(echoGain);
    echoGain.connect(ctx.destination);
  }

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const checkVolume = () => {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    // Map 0-128 to 0-100%
    const percent = Math.min(100, Math.round((average / 120) * 100));
    onLevelChange(percent);
    micAnimationId = requestAnimationFrame(checkVolume);
  };

  checkVolume();

  const stop = () => {
    if (micAnimationId) {
      cancelAnimationFrame(micAnimationId);
      micAnimationId = null;
    }
    if (echoGain) {
      try {
        echoGain.disconnect();
      } catch {
        // ignore
      }
    }
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      // ignore
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    onLevelChange(0);
  };

  return { stop };
}
