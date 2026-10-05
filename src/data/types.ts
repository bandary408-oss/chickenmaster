export type MoveDef =
  | { kind: 'straight'; speed: number }
  | { kind: 'sine'; speed: number; amplitude: number; frequency: number }
  | { kind: 'hold'; speed: number; holdX: number; holdMs: number }
  /** 보스: holdX까지 들어와서 화면을 떠나지 않고 위아래로 천천히 움직인다 */
  | { kind: 'boss'; speed: number; holdX: number; amplitude: number; frequency: number };

export type BulletKind = 'small' | 'large';

/**
 * 탄막 패턴 하나. 빠진 값은 PATTERN_DEFAULTS로 채운다.
 * - 조준탄: aim "player", count 1
 * - 부채꼴: count N, spreadDeg < 360
 * - 원형: spreadDeg 360
 * - 나선: 원형 + bursts 여러 번 + rotateDegPerBurst
 * - 랜덤: randomAngleDeg / randomSpeed
 */
export interface PatternDef {
  /** player: 플레이어를 향해, fixed: angleDeg 방향 (180 = 왼쪽) */
  aim: 'player' | 'fixed';
  angleDeg: number;
  /** 한 번에 쏘는 탄 수 */
  count: number;
  /** 탄이 퍼지는 전체 각도. 360이면 원형으로 고르게 */
  spreadDeg: number;
  speed: number;
  /** 같은 각도로 속도만 다르게 겹쳐 쏘는 줄 수 */
  layers: number;
  speedStep: number;
  /** 연속 발사 횟수와 간격 */
  bursts: number;
  burstGapMs: number;
  /** 연속 발사마다 회전 (나선) */
  rotateDegPerBurst: number;
  /** 연속 발사마다 플레이어를 다시 조준할지 */
  reaimEachBurst: boolean;
  randomAngleDeg: number;
  randomSpeed: number;
  /** 탄 자체의 가속도(px/s²)와 최대 속도, 휘어짐(도/초) */
  accel: number;
  maxSpeed: number;
  curveDegPerSec: number;
  bullet: BulletKind;
}

export interface FireDef {
  pattern: string;
  intervalMs: number;
  firstDelayMs: number;
}

/** 보스 페이즈: 체력 비율이 untilHpPct 아래로 떨어지면 다음 페이즈로 */
export interface PhaseDef {
  untilHpPct: number;
  fires: FireDef[];
}

export interface EnemyDef {
  texture: string;
  hp: number;
  score: number;
  move: MoveDef;
  fire?: FireDef;
  boss?: boolean;
  name?: string;
  phases?: PhaseDef[];
}

export interface WaveDef {
  atMs: number;
  type: string;
  count: number;
  gapMs: number;
  // 화면 높이 비율(0~1) 또는 매번 무작위
  y: number | 'random';
}

export interface StageDef {
  name?: string;
  /** 있으면 끝없이 반복 (격납고 시험 비행용). 없으면 웨이브가 끝나고 적이 다 사라지면 클리어 */
  loopAfterMs?: number;
  waves: WaveDef[];
}
