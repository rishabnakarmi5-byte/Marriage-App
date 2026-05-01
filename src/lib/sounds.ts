// Sound effects using Web Audio API — no external files needed
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch (e) {
    // Audio not supported — silently fail
  }
}

/** Quick tap / button press */
export function playTap() {
  playTone(800, 0.08, 'sine', 0.12);
}

/** Card deal / shuffle sound */
export function playCardDeal() {
  try {
    const c = getCtx();
    const bufferSize = c.sampleRate * 0.06;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, c.currentTime);
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    source.start();
  } catch (e) {}
}

/** Success / match saved */
export function playSuccess() {
  playTone(523, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.12), 100);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.15), 200);
}

/** Winner celebration fanfare */
export function playFanfare() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, 'triangle', 0.15), i * 120);
  });
  // Add a bright shimmer
  setTimeout(() => {
    playTone(1568, 0.4, 'sine', 0.08);
    playTone(1318, 0.4, 'sine', 0.08);
  }, 500);
}

/** Error / fault buzz */
export function playError() {
  playTone(200, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08), 100);
}

/** Toggle / checkbox flip */
export function playToggle() {
  playTone(1200, 0.04, 'sine', 0.08);
}

/** Score counting tick */
export function playTick() {
  playTone(1000, 0.03, 'sine', 0.06);
}

/** Join game sound */
export function playJoin() {
  playTone(440, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(660, 0.15, 'sine', 0.12), 80);
}

/** Navigation / page transition */
export function playNav() {
  playTone(600, 0.06, 'sine', 0.08);
  setTimeout(() => playTone(900, 0.08, 'sine', 0.1), 50);
}
