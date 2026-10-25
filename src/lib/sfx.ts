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
