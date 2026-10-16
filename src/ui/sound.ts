export type SoundName =
  | 'deal'
  | 'pick'
  | 'discard'
  | 'scoreWeight'
  | 'scoreMult'
  | 'scoreRevenue'
  | 'clear'
  | 'fail'
  | 'buy';

const STORAGE_KEY = 'waste-inc2:sound';

let ctx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  const AC = (window as unknown as { AudioContext?: typeof AudioContext })
    .AudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  unlocked = true;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function loadSoundOn(): boolean {
  if (typeof window === 'undefined') return true;
  const storage = (window as unknown as { localStorage?: Storage })
    .localStorage;
  if (!storage || typeof storage.getItem !== 'function') return true;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null || raw !== 'false';
  } catch {
    return true;
  }
}

export function saveSoundOn(on: boolean): void {
  if (typeof window === 'undefined') return;
  const storage = (window as unknown as { localStorage?: Storage })
    .localStorage;
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(STORAGE_KEY, String(on));
  } catch {
    // localStorage が無効な環境では保存を諦める。
  }
}

export function playSound(name: SoundName): void {
  if (!loadSoundOn()) return;
  if (!unlocked || !ctx) return;
  try {
    const now = ctx.currentTime;
    switch (name) {
      case 'deal':
        playNoiseBurst(ctx, now, 0.05, 2000, 0.06);
        break;
      case 'pick':
        playClick(ctx, now);
        break;
      case 'discard':
        playSweep(ctx, now, 500, 150, 0.18, 0.12);
        break;
      case 'scoreWeight':
        playTone(ctx, now, 330, 0.15, 0.12);
        break;
      case 'scoreMult':
        playTone(ctx, now, 494, 0.15, 0.14);
        break;
      case 'scoreRevenue':
        playTone(ctx, now, 698, 0.25, 0.22);
        break;
      case 'clear':
        playArpeggio(ctx, now, [523, 659, 784, 1047], 0.12);
        break;
      case 'fail':
        playSweep(ctx, now, 330, 110, 0.35, 0.18);
        break;
      case 'buy':
        playChime(ctx, now);
        break;
    }
  } catch {
    // WebAudio は任意のタイミングで失敗する。音のため例外を伝播しない。
  }
}

function playClick(ctx: AudioContext, start: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, start);
  gain.gain.setValueAtTime(0.15, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.03);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.04);
}

function playTone(
  ctx: AudioContext,
  start: number,
  freq: number,
  duration: number,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playSweep(
  ctx: AudioContext,
  start: number,
  from: number,
  to: number,
  duration: number,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playNoiseBurst(
  ctx: AudioContext,
  start: number,
  duration: number,
  freq: number,
  volume: number,
): void {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function playArpeggio(
  ctx: AudioContext,
  start: number,
  freqs: number[],
  noteDuration: number,
): void {
  for (let i = 0; i < freqs.length; i++) {
    playTone(ctx, start + i * noteDuration * 0.6, freqs[i], noteDuration, 0.1);
  }
}

function playChime(ctx: AudioContext, start: number): void {
  playTone(ctx, start, 988, 0.1, 0.12);
  playTone(ctx, start + 0.05, 1319, 0.15, 0.12);
}
