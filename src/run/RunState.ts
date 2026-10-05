import Phaser from 'phaser';
import { computeStats, defaultLoadout } from '../parts/Loadout';
import type { Loadout } from '../parts/types';
import { generateSectorMap, type SectorMap } from './MapGen';
import { loadMeta } from '../meta/Meta';

/** 한 판(런) 동안 유지되는 상태. 죽으면 통째로 버린다. */
export interface RunState {
  sector: number;
  loadout: Loadout;
  hp: number;
  scrap: number;
  score: number;
  kills: number;
  map: SectorMap;
  /** 마지막으로 클리어한 노드. null이면 아직 출발 전 */
  current: number | null;
  cleared: number[];
}

const KEY = 'run';

export function newRun(registry: Phaser.Data.DataManager): RunState {
  const loadout = defaultLoadout();
  // 설계실에서 고른 시작 장비
  const meta = loadMeta();
  loadout.core = { id: meta.startCore, level: 1 };
  loadout.mainWeapon = { id: meta.startWeapon, level: 1 };
  const run: RunState = {
    sector: 1,
    loadout,
    hp: computeStats(loadout).maxHp,
    scrap: 0,
    score: 0,
    kills: 0,
    map: generateSectorMap(),
    current: null,
    cleared: [],
  };
  registry.set(KEY, run);
  return run;
}

export function getRun(registry: Phaser.Data.DataManager): RunState | null {
  return (registry.get(KEY) as RunState | undefined) ?? null;
}

export function endRun(registry: Phaser.Data.DataManager) {
  registry.remove(KEY);
}

/** 지금 들어갈 수 있는 노드 id 목록 */
export function reachableNodes(run: RunState): number[] {
  if (run.current === null) return run.map.nodes.filter((n) => n.col === 0).map((n) => n.id);
  return run.map.nodes[run.current].next;
}

export function completeNode(run: RunState, id: number) {
  run.current = id;
  run.cleared.push(id);
}

/** 장갑 교체 등으로 최대 체력이 바뀌면 현재 체력을 그 안으로 맞춘다. */
export function clampHp(run: RunState) {
  run.hp = Phaser.Math.Clamp(run.hp, 1, computeStats(run.loadout).maxHp);
}
