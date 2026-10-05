import Phaser from 'phaser';
import { PARTS, getPart } from '../parts/Loadout';
import type { EquippedPart, Loadout, PartDef, SlotKind } from '../parts/types';

export type RewardOption =
  | { kind: 'new'; part: PartDef }
  | { kind: 'upgrade'; part: PartDef; from: number }
  | { kind: 'branch'; part: PartDef; branches: PartDef[] };

const RARITY_WEIGHT = { common: 70, rare: 30, prototype: 0 } as const;

/** 장착 위치 목록 (슬롯이 여러 개인 보조무기·모듈 포함) */
export function slotRefs(l: Loadout, slot: SlotKind): { get: () => EquippedPart | null; set: (v: EquippedPart | null) => void }[] {
  switch (slot) {
    case 'core': return [{ get: () => l.core, set: (v) => (l.core = v) }];
    case 'mainWeapon': return [{ get: () => l.mainWeapon, set: (v) => (l.mainWeapon = v) }];
    case 'armor': return [{ get: () => l.armor, set: (v) => (l.armor = v) }];
    case 'booster': return [{ get: () => l.booster, set: (v) => (l.booster = v) }];
    case 'subWeapon': return l.subWeapons.map((_, i) => ({ get: () => l.subWeapons[i], set: (v: EquippedPart | null) => (l.subWeapons[i] = v) }));
    case 'module': return l.modules.map((_, i) => ({ get: () => l.modules[i], set: (v: EquippedPart | null) => (l.modules[i] = v) }));
  }
}

function findEquipped(l: Loadout, id: string) {
  for (const s of ['core', 'mainWeapon', 'subWeapon', 'armor', 'booster', 'module'] as SlotKind[]) {
    for (const ref of slotRefs(l, s)) if (ref.get()?.id === id) return ref;
  }
  return null;
}

/** 이 파츠를 고를 때 무엇이 되는지 (새로 장착 / 강화 / 개조 분기). 더 줄 게 없으면 null */
function optionFor(l: Loadout, p: PartDef): RewardOption | null {
  const owned = findEquipped(l, p.id)?.get();
  if (!owned) {
    // 개조형으로 바꾼 무기의 원형은 다시 내지 않는다.
    if (l.mainWeapon && getPart(l.mainWeapon.id).branchOf === p.id) return null;
    return { kind: 'new', part: p };
  }
  if (owned.level < p.levels.length) return { kind: 'upgrade', part: p, from: owned.level };
  if (p.branches?.length) return { kind: 'branch', part: p, branches: p.branches.map(getPart) };
  return null;
}

/**
 * 보상 후보 count개를 뽑는다. 같은 파츠는 한 번만.
 * guaranteeRare면 희귀 이상이 최소 하나 (엘리트·이벤트 보상).
 */
export function rollRewards(l: Loadout, count: number, guaranteeRare: boolean): RewardOption[] {
  const pool = Object.values(PARTS)
    .filter((p) => !p.branchOf)
    .map((p) => optionFor(l, p))
    .filter((o): o is RewardOption => o !== null);

  const picks: RewardOption[] = [];
  const take = (candidates: RewardOption[]) => {
    const avail = candidates.filter((c) => !picks.includes(c));
    if (avail.length === 0) return;
    // 이미 가진 파츠의 강화·개조는 조금 더 자주 나오게 한다(빌드가 굴러가도록).
    const weight = (o: RewardOption) => RARITY_WEIGHT[o.part.rarity] * (o.kind === 'new' ? 1 : 1.5) + 1;
    const total = avail.reduce((s, o) => s + weight(o), 0);
    let r = Math.random() * total;
    for (const o of avail) {
      if ((r -= weight(o)) < 0) return void picks.push(o);
    }
    picks.push(avail[avail.length - 1]);
  };

  if (guaranteeRare) take(pool.filter((o) => o.part.rarity !== 'common' || o.kind === 'branch'));
  while (picks.length < count && picks.length < pool.length) take(pool);
  return Phaser.Utils.Array.Shuffle(picks);
}

/** 슬롯이 하나뿐인 파츠를 새로 끼우면 기존 파츠를 바꾼다. 여러 칸이면 빈칸부터, 다 차 있으면 교체 대상을 골라야 한다. */
export function needsReplaceChoice(l: Loadout, o: RewardOption) {
  if (o.kind !== 'new') return false;
  const refs = slotRefs(l, o.part.slot);
  return refs.length > 1 && refs.every((r) => r.get() !== null);
}

/** 고른 보상을 적용한다. replaceIndex: 여러 칸 슬롯이 다 찼을 때 바꿀 칸, branchIndex: 개조 분기 선택 */
export function applyReward(l: Loadout, o: RewardOption, opts: { replaceIndex?: number; branchIndex?: number } = {}) {
  if (o.kind === 'upgrade') {
    const ref = findEquipped(l, o.part.id)!;
    ref.set({ id: o.part.id, level: o.from + 1 });
  } else if (o.kind === 'branch') {
    const ref = findEquipped(l, o.part.id)!;
    ref.set({ id: o.branches[opts.branchIndex ?? 0].id, level: 1 });
  } else {
    const refs = slotRefs(l, o.part.slot);
    const empty = refs.find((r) => r.get() === null);
    const target = empty ?? refs[opts.replaceIndex ?? 0];
    target.set({ id: o.part.id, level: 1 });
  }
}

/** 교체 시 사라질 파츠 이름 (슬롯 하나짜리) */
export function replacedName(l: Loadout, o: RewardOption): string | null {
  if (o.kind !== 'new') return null;
  const refs = slotRefs(l, o.part.slot);
  if (refs.length !== 1) return null;
  const cur = refs[0].get();
  return cur ? getPart(cur.id).name : null;
}
