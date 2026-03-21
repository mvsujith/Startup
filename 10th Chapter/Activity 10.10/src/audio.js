// Simple Web Audio API sound generator for the toy car experiment

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function playWindSound(windingCount) {
  initAudio();
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Pitch goes up slightly as tension increases
  const baseFreq = 400 + (windingCount * 15);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq + 100, t + 0.05);

  // Sharp, short envelope for a "click/ratchet" sound
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(t);
  osc.stop(t + 0.1);
}

// Returns an object to let caller stop the sound or adjust it
export function startCarRunSound() {
  initAudio();
  const t = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  // Noise-like low drone for wheels rolling
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, t);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, t);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.1); // fade in

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);

  return {
    setSpeed: (speedRatio) => {
      // speedRatio goes from 1.0 down to 0 over the run
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      osc.frequency.setTargetAtTime(40 + Math.max(0, speedRatio) * 120, now, 0.1);
      filter.frequency.setTargetAtTime(300 + Math.max(0, speedRatio) * 600, now, 0.1);
    },
    stop: () => {
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2); // fade out
      osc.stop(now + 0.2);
    }
  };
}

export function playFinishSound() {
  initAudio();
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t); // A5

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.5);
}

export function playResetSound() {
  initAudio();
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.2);
}
