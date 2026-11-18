// Sound for Coral Keys, synthesized live with WebAudio: no audio files, no
// network. Engine hum, sirens, gunshots, pickup chimes and a lazy island
// arpeggio. Everything is guarded: in a headless screenshot run the audio
// context may not exist, and the game must still play silently.
let context = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let musicTimer = null;
let muted = false;

// A lazy island arpeggio, one note every 450 ms, climbing a little higher
// in this draft so the loop feels less like a metronome.
const MELODY = [523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33];
let melodyStep = 0;

export function initAudio() {
  if (context) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);

    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();

    sirenOsc = context.createOscillator();
    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 700;
    sirenGain = context.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();

    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const note = MELODY[melodyStep % MELODY.length];
      melodyStep += 1;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.9);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(context.currentTime + 1);
    }, 450);
  } catch {
    context = null;
  }
}

function blip(frequency, duration, type, volume) {
  if (!context || muted) return;
  try {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(context.currentTime + duration + 0.05);
  } catch {
    // Audio is decoration; a failure never stops the game.
  }
}

export function playPickup() { blip(880, 0.15, 'sine', 0.2); window.setTimeout(() => blip(1318, 0.2, 'sine', 0.15), 90); }
export function playShot() { blip(160, 0.12, 'square', 0.25); }
export function playMissionDone() { [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => blip(f, 0.25, 'triangle', 0.2), i * 110)); }
export function playHorn() { blip(330, 0.3, 'sawtooth', 0.12); }

/** Engine pitch follows speed; the siren wails only while Kai is wanted. */
export function updateEngine(speed, wanted) {
  if (!context) return;
  try {
    const now = context.currentTime;
    engineGain.gain.setTargetAtTime(muted ? 0 : Math.min(0.12, Math.abs(speed) / 520 * 0.12), now, 0.1);
    engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 0.25, now, 0.1);
    if (wanted > 0 && !muted) {
      sirenGain.gain.setTargetAtTime(0.05, now, 0.2);
      sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(now * 3), now, 0.05);
    } else {
      sirenGain.gain.setTargetAtTime(0, now, 0.2);
    }
  } catch {
    // Ignore audio errors.
  }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
