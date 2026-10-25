let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem('mute') === '1'; } catch { return false; } })();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('mute', m ? '1' : '0'); } catch { /* ignore */ }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.05) {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur);
}
const seq = (notes: number[], step = 0.07, dur = 0.09) => { if (!muted) notes.forEach((n, i) => tone(n, i * step, dur)); };

export const sfx = {
  click: () => seq([660]),
  move: () => seq([330, 440], 0.05, 0.07),
  capture: () => seq([220, 165, 110], 0.05, 0.08),
  roll: () => seq([200, 260, 220, 300, 240, 340], 0.045, 0.05),
  flip: () => seq([520, 780], 0.05, 0.06),
  score: () => seq([523, 659, 784], 0.07),
  win: () => seq([523, 659, 784, 1047, 784, 1047], 0.11, 0.14),
};
export const sfx2 = {
  deal: () => seq([300, 380], 0.04, 0.05),
  hit: () => seq([180, 120], 0.06, 0.1),
  draw: () => seq([440, 392], 0.05, 0.06),
};

function noiseBurst(dur: number, f0: number, f1: number, vol: number) {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC || muted) return;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
  const t = ctx.currentTime;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination); src.start(t);
}
export const sfx3 = {
  splash: () => { noiseBurst(0.38, 2600, 420, 0.16); if (!muted) tone(260, 0.03, 0.12, 'sine', 0.05); },
  quack: () => { if (muted) return; tone(540, 0, 0.07, 'sawtooth', 0.045); tone(420, 0.09, 0.1, 'sawtooth', 0.045); },
};
