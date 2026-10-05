import Phaser from 'phaser';

export type NodeKind = 'battle' | 'elite' | 'repair' | 'event' | 'boss';

export interface MapNode {
  id: number;
  col: number;
  row: number;
  kind: NodeKind;
  next: number[];
  /** 전투 노드가 쓰는 stages.json 키, 이벤트 노드가 쓰는 events.json 키 */
  ref?: string;
}

export interface SectorMap {
  cols: number;
  nodes: MapNode[];
}

const COLS = 7;
const BATTLE_STAGES = ['battle_a', 'battle_b', 'battle_c'];
const ELITE_STAGES = ['elite_a'];
const EVENTS = ['derelict_freighter', 'junk_dealer', 'repair_drone'];

// 기획서 7장: 전투 / 엘리트 / 정비소 / 이벤트 / 보스
const KIND_WEIGHTS: [NodeKind, number][] = [
  ['battle', 50],
  ['elite', 15],
  ['repair', 15],
  ['event', 20],
];

function pickKind(col: number): NodeKind {
  // 첫 칸은 무조건 전투, 보스 직전 칸에는 정비소가 하나는 있게 한다(아래에서 보정).
  if (col === 0) return 'battle';
  // 초반 두 칸에는 엘리트를 내지 않는다.
  const weights = col < 2 ? KIND_WEIGHTS.filter(([k]) => k !== 'elite') : KIND_WEIGHTS;
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of weights) {
    if ((r -= w) < 0) return k;
  }
  return 'battle';
}

/**
 * 왼쪽에서 오른쪽으로 가는 섹터 지도. 칸마다 노드 2~3개, 마지막 칸은 보스 하나.
 * 각 노드는 다음 칸의 가까운 노드 1~2개로 이어지고, 모든 노드는 앞 칸에서 들어올 길이 있다.
 */
export function generateSectorMap(): SectorMap {
  const nodes: MapNode[] = [];
  const columns: MapNode[][] = [];

  for (let col = 0; col < COLS; col++) {
    const isBoss = col === COLS - 1;
    const count = isBoss ? 1 : col === 0 ? 2 : Phaser.Math.Between(2, 3);
    const column: MapNode[] = [];
    for (let row = 0; row < count; row++) {
      const kind: NodeKind = isBoss ? 'boss' : pickKind(col);
      const node: MapNode = { id: nodes.length, col, row, kind, next: [] };
      nodes.push(node);
      column.push(node);
    }
    if (col === COLS - 2 && !column.some((n) => n.kind === 'repair')) {
      column[Phaser.Math.Between(0, column.length - 1)].kind = 'repair';
    }
    columns.push(column);
  }

  // 연결: 세로 위치 비율이 가까운 노드끼리 잇는다.
  const pos = (n: MapNode, len: number) => (len === 1 ? 0.5 : n.row / (len - 1));
  for (let col = 0; col < COLS - 1; col++) {
    const a = columns[col];
    const b = columns[col + 1];
    for (const n of a) {
      const sorted = [...b].sort((x, y) => Math.abs(pos(x, b.length) - pos(n, a.length)) - Math.abs(pos(y, b.length) - pos(n, a.length)));
      n.next.push(sorted[0].id);
      if (sorted[1] && Math.random() < 0.5) n.next.push(sorted[1].id);
    }
    for (const m of b) {
      if (!a.some((n) => n.next.includes(m.id))) {
        const closest = [...a].sort((x, y) => Math.abs(pos(x, a.length) - pos(m, b.length)) - Math.abs(pos(y, a.length) - pos(m, b.length)))[0];
        closest.next.push(m.id);
      }
    }
  }

  for (const n of nodes) {
    // 첫 전투는 가장 쉬운 스테이지로 고정해 시작 기체로도 버틸 수 있게 한다.
    if (n.kind === 'battle') n.ref = n.col === 0 ? BATTLE_STAGES[0] : Phaser.Utils.Array.GetRandom(BATTLE_STAGES);
    else if (n.kind === 'elite') n.ref = Phaser.Utils.Array.GetRandom(ELITE_STAGES);
    else if (n.kind === 'boss') n.ref = 'boss_1';
    else if (n.kind === 'event') n.ref = Phaser.Utils.Array.GetRandom(EVENTS);
  }
  return { cols: COLS, nodes };
}
