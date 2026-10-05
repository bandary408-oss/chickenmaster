import Phaser from 'phaser';

/**
 * 효과음. 에셋 파일 없이 WebAudio로 그 자리에서 합성한다.
 * 자주 나는 소리(사격, 피격, 그레이즈)는 간격을 두어 귀가 아프지 않게 한다.
 */
export type SfxName =
  | 'shot' | 'hit' | 'explode' | 'bigExplode' | 'hurt' | 'graze'
  | 'select' | 'confirm' | 'powerup' | 'bossPhase' | 'overdrive' | 'denied';

const THROTTLE_MS: Partial<Record<SfxName, number>> = { shot: 70, hit: 45, graze: 40, explode: 30 };
const MUTE_KEY = 'chickenmaster.mute';
const MASTER_VOLUME = 0.5;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const lastPlayed = new Map<SfxName, number>();
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** 게임 시작 시 한 번 Phaser의 오디오 컨텍스트를 받아 둔다. */
export function initSfx(game: Phaser.Game) {
  const sm = game.sound as Phaser.Sound.WebAudioSoundManager;
  if (!('context' in sm) || !sm.context) return;
  ctx = sm.context;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_VOLUME;
  master.connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // 저장 못 해도 이번 세션에는 적용된다.
  }
  return muted;
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  const t = ctx!.currentTime + delay;
  const osc = ctx!.createOscillator();
  const g = ctx!.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, cutoff0: number, cutoff1: number) {
  const t = ctx!.currentTime;
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx!.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff0, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, cutoff1), t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export function sfx(name: SfxName) {
  if (!ctx || !master || muted || ctx.state !== 'running') return;
  const now = performance.now();
  const gap = THROTTLE_MS[name];
  if (gap && now - (lastPlayed.get(name) ?? 0) < gap) return;
  lastPlayed.set(name, now);

  switch (name) {
    case 'shot': tone('square', 880, 520, 0.04, 0.03); break;
    case 'hit': noise(0.03, 0.05, 4000, 1500); break;
    case 'explode': noise(0.28, 0.18, 2500, 120); tone('sine', 140, 40, 0.25, 0.12); break;
    case 'bigExplode': noise(0.9, 0.3, 3000, 60); tone('sine', 90, 25, 0.9, 0.25); break;
    case 'hurt': tone('sawtooth', 260, 70, 0.22, 0.14); noise(0.12, 0.1, 3000, 400); break;
    case 'graze': tone('sine', 1900, 2300, 0.03, 0.025); break;
    case 'select': tone('square', 660, 660, 0.035, 0.04); break;
    case 'confirm': tone('square', 660, 660, 0.05, 0.05); tone('square', 990, 990, 0.08, 0.05, 0.05); break;
    case 'powerup': [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.07, 0.045, i * 0.06)); break;
    case 'bossPhase': tone('sawtooth', 110, 55, 0.6, 0.15); tone('square', 220, 110, 0.6, 0.06); break;
    case 'overdrive': tone('sawtooth', 200, 1600, 0.45, 0.1); noise(0.4, 0.06, 800, 6000); break;
    case 'denied': tone('square', 180, 150, 0.12, 0.06); break;
  }
}
