export type MoveDef =
  | { kind: 'straight'; speed: number }
  | { kind: 'sine'; speed: number; amplitude: number; frequency: number }
  | { kind: 'hold'; speed: number; holdX: number; holdMs: number };

// 2단계용 단순 발사 정의. 3단계 탄막 시스템에서 패턴 데이터로 확장한다.
export interface FireDef {
  intervalMs: number;
  count: number;
  spreadDeg: number;
  speed: number;
  aimed: boolean;
  firstDelayMs: number;
}

export interface EnemyDef {
  texture: string;
  hp: number;
  score: number;
  move: MoveDef;
  fire?: FireDef;
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
  loopAfterMs: number;
  waves: WaveDef[];
}
