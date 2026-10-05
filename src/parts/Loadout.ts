import { PLAYER } from '../config';
import partData from '../data/parts.json';
import synergyData from '../data/synergies.json';
import type {
  ArmorVisual,
  BoosterVisual,
  EquippedPart,
  Loadout,
  PartDef,
  PlayerStats,
  SlotKind,
  StatMods,
  Tag,
  WeaponDef,
  WeaponVisual,
} from './types';

export const PARTS: Record<string, PartDef> = Object.fromEntries(
  Object.entries(partData as unknown as Record<string, Omit<PartDef, 'id'>>).map(([id, p]) => [id, { id, ...p }]),
);

const SYNERGIES = synergyData as Record<Tag, { name: string; tiers: Record<string, StatMods> }>;

export const MAX_LEVEL = 3;

export function getPart(id: string): PartDef {
  const p = PARTS[id];
  if (!p) throw new Error(`Unknown part: ${id}`);
  return p;
}

export function partsForSlot(slot: SlotKind): PartDef[] {
  return Object.values(PARTS).filter((p) => p.slot === slot);
}

/** 주무기가 없을 때 쓰는 맨손 사격 */
const FALLBACK_WEAPON: WeaponDef = {
  intervalMs: 120, count: 1, spreadDeg: 0, speed: 420, damage: 0.6, bullet: 'vulcan',
};

/** 런 시작 기체: 리액터 코어 + 발칸만 달린 맨몸 */
export function defaultLoadout(): Loadout {
  return {
    core: { id: 'core_reactor', level: 1 },
    mainWeapon: { id: 'weapon_vulcan', level: 1 },
    subWeapons: [null, null],
    armor: null,
    booster: null,
    modules: [null, null, null, null],
  };
}

export function equippedList(l: Loadout): EquippedPart[] {
  return [l.core, l.mainWeapon, ...l.subWeapons, l.armor, l.booster, ...l.modules].filter(
    (e): e is EquippedPart => e !== null,
  );
}

function levelOf(e: EquippedPart) {
  const p = getPart(e.id);
  return p.levels[Math.min(Math.max(e.level, 1), p.levels.length) - 1];
}

function addMods(into: Required<StatMods>, m: StatMods | undefined) {
  if (!m) return;
  for (const k of Object.keys(m) as (keyof StatMods)[]) into[k] += m[k] ?? 0;
}

export function computeStats(l: Loadout): PlayerStats {
  const mods: Required<StatMods> = {
    maxHp: 0, speedPct: 0, focusSpeedPct: 0, grazeRadius: 0, hitClearRadius: 0, invulnMs: 0,
    damagePct: 0, fireRatePct: 0, lowHpDamagePct: 0, extraDrones: 0,
  };
  const equipped = equippedList(l);
  for (const e of equipped) addMods(mods, levelOf(e).stats);

  // 시너지: 같은 태그 장착 수가 단계에 닿으면 가장 높은 단계 하나만 적용한다.
  const tagCount = new Map<Tag, number>();
  for (const e of equipped) for (const t of getPart(e.id).tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const synergies = (Object.keys(SYNERGIES) as Tag[]).map((tag) => {
    const count = tagCount.get(tag) ?? 0;
    const tiers = Object.keys(SYNERGIES[tag].tiers).map(Number).sort((a, b) => a - b);
    const tier = tiers.filter((t) => count >= t).pop() ?? 0;
    if (tier) addMods(mods, SYNERGIES[tag].tiers[String(tier)]);
    return { tag, name: SYNERGIES[tag].name, count, tier };
  });

  const subs = l.subWeapons.filter((s): s is EquippedPart => s !== null).map((s) => levelOf(s).sub!);

  const visualOf = <T>(e: EquippedPart | null) => (e ? (getPart(e.id).visual as T | undefined) ?? null : null);
  const coreHex = l.core ? getPart(l.core.id).coreColor : undefined;

  return {
    maxHp: Math.max(20, PLAYER.maxHp + mods.maxHp),
    speed: PLAYER.speed * (1 + mods.speedPct / 100),
    focusSpeed: PLAYER.focusSpeed * (1 + mods.focusSpeedPct / 100),
    grazeRadius: PLAYER.grazeRadius + mods.grazeRadius,
    hitClearRadius: PLAYER.hitClearRadius + mods.hitClearRadius,
    invulnMs: PLAYER.invulnMs + mods.invulnMs,
    damageMul: 1 + mods.damagePct / 100,
    lowHpDamageMul: 1 + mods.lowHpDamagePct / 100,
    fireRateMul: 1 + mods.fireRatePct / 100,
    weapon: l.mainWeapon ? levelOf(l.mainWeapon).weapon! : FALLBACK_WEAPON,
    subs,
    extraDrones: mods.extraDrones,
    visual: {
      armor: visualOf<ArmorVisual>(l.armor),
      weapon: visualOf<WeaponVisual>(l.mainWeapon),
      booster: visualOf<BoosterVisual>(l.booster),
      coreColor: coreHex ? parseInt(coreHex.slice(1), 16) : 0xffffff,
    },
    synergies,
  };
}

const REGISTRY_KEY = 'loadout';

export function loadLoadout(registry: Phaser.Data.DataManager): Loadout {
  return (registry.get(REGISTRY_KEY) as Loadout | undefined) ?? defaultLoadout();
}

export function saveLoadout(registry: Phaser.Data.DataManager, l: Loadout) {
  registry.set(REGISTRY_KEY, structuredClone(l));
}
