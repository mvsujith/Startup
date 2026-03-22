// Synthetic Audio Engine for Bow and Arrow Game
let audioCtx;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playStretchSound = (stretchAmount) => {
  initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Creaking rope sound - series of quick clicks with increasing pitch
  const freq = 100 + (stretchAmount * 400); // 100Hz to 500Hz
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq + 50, t + 0.1);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(t);
  osc.stop(t + 0.1);
};

export const playSwooshSound = () => {
  initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const dur = 0.5;
  const bufferSize = audioCtx.sampleRate * dur;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  // White noise for swoosh
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = buffer;

  // Filter the noise to sound like wind/swoosh
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(100, t);
  filter.frequency.exponentialRampToValueAtTime(800, t + 0.2);
  filter.frequency.exponentialRampToValueAtTime(100, t + dur);
  filter.Q.value = 1.5;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.8, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

  noiseSrc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  noiseSrc.start(t);
};

export const playThudSound = () => {
  initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // Low heavy impact
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.2);
};
