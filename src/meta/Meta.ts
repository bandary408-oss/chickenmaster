import unlockData from '../data/unlocks.json';
import type { RunState } from '../run/RunState';

/**
 * 메타 진행 (기획서 8장): 런이 끝나면 설계도 포인트를 받고, 설계실에서
 * 보상 풀에 새 파츠를 넣거나 시작 장비 선택지를 연다. 스탯을 직접 올리는 해금은 없다.
 * 이 브라우저의 localStorage에 저장한다.
 */
export interface UnlockDef {
  kind: 'part' | 'startCore' | 'startWeapon';
  partId: string;
  cost: number;
  name: string;
  desc: string;
  requires?: string;
}

export interface MetaSave {
  blueprints: number;
  unlocked: string[];
  startCore: string;
  startWeapon: string;
  runs: number;
  bestScore: number;
}

export const UNLOCKS = unlockData as Record<string, UnlockDef>;

const STORAGE_KEY = 'chickenmaster.meta.v1';

const DEFAULT_META: MetaSave = {
  blueprints: 0,
  unlocked: [],
  startCore: 'core_reactor',
  startWeapon: 'weapon_vulcan',
  runs: 0,
  bestScore: 0,
};

// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 이번 세션 동안은 동작하도록 메모리에 들고 있는다.
let cache: MetaSave | null = null;

export function loadMeta(): MetaSave {
  if (cache) return cache;
  let saved: Partial<MetaSave> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) as Partial<MetaSave>;
  } catch {
    // 손상되었거나 접근할 수 없으면 새로 시작한다.
  }
  cache = { ...DEFAULT_META, ...saved };
  return cache;
}

export function saveMeta(m: MetaSave) {
  cache = m;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    // 저장 실패는 무시한다 (메모리 캐시는 유지).
  }
}

/** 해금해야 보상에 나오는 파츠 중 아직 잠긴 것 */
export function lockedPartIds(m: MetaSave = loadMeta()): Set<string> {
  const locked = new Set<string>();
  for (const [id, u] of Object.entries(UNLOCKS)) {
    if (u.kind === 'part' && !m.unlocked.includes(id)) locked.add(u.partId);
  }
  return locked;
}

export function canBuy(m: MetaSave, id: string): string | null {
  const u = UNLOCKS[id];
  if (m.unlocked.includes(id)) return '해금 완료';
  if (u.requires && !m.unlocked.includes(u.requires)) return `먼저 필요: ${UNLOCKS[u.requires].name}`;
  if (m.blueprints < u.cost) return `설계도 부족 (${u.cost} 필요)`;
  return null;
}

export function buy(m: MetaSave, id: string) {
  if (canBuy(m, id)) return false;
  m.blueprints -= UNLOCKS[id].cost;
  m.unlocked.push(id);
  saveMeta(m);
  return true;
}

/** 고를 수 있는 시작 코어 / 무기 목록 (기본 포함) */
export function startOptions(m: MetaSave, kind: 'startCore' | 'startWeapon'): string[] {
  const base = kind === 'startCore' ? 'core_reactor' : 'weapon_vulcan';
  const extra = Object.entries(UNLOCKS)
    .filter(([id, u]) => u.kind === kind && m.unlocked.includes(id))
    .map(([, u]) => u.partId);
  return [base, ...extra];
}

/**
 * 런 결과로 받을 설계도 포인트.
 * 기본 2 + 돌파한 노드 x3 + 처치 5마리당 1 + 보스 격파 25.
 * 첫 전투에서 죽어도 조금은 받아서 다음 판에 쓸 게 생기게 한다.
 */
export function blueprintsFor(run: RunState, won: boolean) {
  return 2 + run.cleared.length * 3 + Math.floor(run.kills / 5) + (won ? 25 : 0);
}

export function recordRun(run: RunState, won: boolean) {
  const m = loadMeta();
  const earned = blueprintsFor(run, won);
  m.blueprints += earned;
  m.runs += 1;
  m.bestScore = Math.max(m.bestScore, run.score);
  saveMeta(m);
  return earned;
}
