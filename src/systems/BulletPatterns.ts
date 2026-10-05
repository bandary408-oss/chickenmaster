import Phaser from 'phaser';
import patternData from '../data/patterns.json';
import type { BulletKind, PatternDef } from '../data/types';
import { spawnBullet, type BulletStyle } from '../objects/Bullet';

const DEG = Math.PI / 180;

const PATTERN_DEFAULTS: PatternDef = {
  aim: 'player',
  angleDeg: 180,
  count: 1,
  spreadDeg: 0,
  speed: 120,
  layers: 1,
  speedStep: 0,
  bursts: 1,
  burstGapMs: 0,
  rotateDegPerBurst: 0,
  reaimEachBurst: false,
  randomAngleDeg: 0,
  randomSpeed: 0,
  accel: 0,
  maxSpeed: Infinity,
  curveDegPerSec: 0,
  bullet: 'small',
};

export const BULLET_STYLES: Record<BulletKind, BulletStyle> = {
  small: { texture: 'bullet_enemy', radius: 2 },
  large: { texture: 'bullet_enemy_large', radius: 4 },
};

export const PATTERNS: Record<string, PatternDef> = Object.fromEntries(
  Object.entries(patternData as Record<string, Partial<PatternDef>>).map(([k, v]) => [k, { ...PATTERN_DEFAULTS, ...v }]),
);

export function getPattern(name: string): PatternDef {
  const p = PATTERNS[name];
  if (!p) throw new Error(`Unknown bullet pattern: ${name}`);
  return p;
}

export interface PatternSource {
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
}

/**
 * 패턴 하나를 발사한다. 연속 발사(bursts)는 씬 타이머로 이어 쏘며,
 * 그 사이 발사원이 죽으면 멈춘다. 발사원이 움직이면 현재 위치에서 쏜다.
 */
export function firePattern(
  scene: Phaser.Scene,
  pool: Phaser.Physics.Arcade.Group,
  p: PatternDef,
  source: PatternSource,
  target: { x: number; y: number },
) {
  const aimAt = () =>
    p.aim === 'player' ? Phaser.Math.Angle.Between(source.x, source.y, target.x, target.y) : p.angleDeg * DEG;
  let base = aimAt();

  const style = BULLET_STYLES[p.bullet];
  const motion = { accel: p.accel, maxSpeed: p.maxSpeed, curveDegPerSec: p.curveDegPerSec };
  const spread = p.spreadDeg * DEG;
  const isRing = p.spreadDeg >= 360;

  const volley = (burst: number) => {
    if (!source.active) return;
    if (p.reaimEachBurst && burst > 0) base = aimAt();
    const rot = burst * p.rotateDegPerBurst * DEG;
    for (let i = 0; i < p.count; i++) {
      let a: number;
      if (isRing) a = base + rot + (Math.PI * 2 * i) / p.count;
      else a = base + rot + (p.count === 1 ? 0 : spread * (i / (p.count - 1) - 0.5));
      if (p.randomAngleDeg) a += Phaser.Math.FloatBetween(-p.randomAngleDeg, p.randomAngleDeg) * DEG;

      for (let l = 0; l < p.layers; l++) {
        let s = p.speed + p.speedStep * l;
        if (p.randomSpeed) s += Phaser.Math.FloatBetween(0, p.randomSpeed);
        spawnBullet(pool, source.x, source.y, a, s, 1, style, motion);
      }
    }
  };

  volley(0);
  for (let b = 1; b < p.bursts; b++) {
    scene.time.delayedCall(p.burstGapMs * b, () => volley(b));
  }
}
