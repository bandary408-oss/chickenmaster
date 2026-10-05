export type SlotKind = 'core' | 'mainWeapon' | 'subWeapon' | 'armor' | 'booster' | 'module';
export type Tag = 'energy' | 'ballistic' | 'heat' | 'drone';
export type PlayerBulletKind = 'vulcan' | 'laser' | 'pellet' | 'missile';
export type WeaponVisual = 'vulcan' | 'laser' | 'shotgun' | 'missile';
export type ArmorVisual = 'light' | 'heavy' | 'reactive';
export type BoosterVisual = 'dash' | 'hover';

/** 파츠와 시너지가 주는 스탯 변화. 모두 더해서 적용한다. */
export interface StatMods {
  maxHp?: number;
  speedPct?: number;
  focusSpeedPct?: number;
  grazeRadius?: number;
  hitClearRadius?: number;
  invulnMs?: number;
  damagePct?: number;
  fireRatePct?: number;
  /** 체력이 절반 아래일 때 추가 화력 % */
  lowHpDamagePct?: number;
  extraDrones?: number;
}

export interface WeaponDef {
  intervalMs: number;
  count: number;
  spreadDeg: number;
  speed: number;
  damage: number;
  bullet: PlayerBulletKind;
  /** 적을 몇 번 더 뚫고 지나가는지 */
  pierce?: number;
  /** 이 거리만큼 날아가면 사라진다 */
  rangePx?: number;
  /** 유도 회전 속도 (rad/s) */
  homing?: number;
}

export type SubDef =
  | { kind: 'drone'; count: number; intervalMs: number; damage: number }
  | { kind: 'shieldbit'; count: number; radius: number; speedDeg: number }
  | { kind: 'turret'; intervalMs: number; damage: number; anglesDeg: number[] };

export interface PartLevel {
  stats?: StatMods;
  weapon?: WeaponDef;
  sub?: SubDef;
}

export interface PartDef {
  id: string;
  name: string;
  slot: SlotKind;
  rarity: 'common' | 'rare' | 'prototype';
  tags: Tag[];
  desc: string;
  /** 외형이 바뀌는 계열만 가진다 (기획서 5.2.1) */
  visual?: WeaponVisual | ArmorVisual | BoosterVisual;
  coreColor?: string;
  /** Lv3에서 고를 수 있는 개조형 파츠 id 2개 (기획서 5.2) */
  branches?: string[];
  /** 개조형이면 원래 파츠 id. 보상 목록에 따로 나오지 않는다. */
  branchOf?: string;
  levels: PartLevel[];
}

export interface EquippedPart {
  id: string;
  /** 1~3 */
  level: number;
}

export interface Loadout {
  core: EquippedPart | null;
  mainWeapon: EquippedPart | null;
  subWeapons: [EquippedPart | null, EquippedPart | null];
  armor: EquippedPart | null;
  booster: EquippedPart | null;
  modules: [EquippedPart | null, EquippedPart | null, EquippedPart | null, EquippedPart | null];
}

export interface MechVisual {
  armor: ArmorVisual | null;
  weapon: WeaponVisual | null;
  booster: BoosterVisual | null;
  coreColor: number;
}

/** 장착 결과로 계산된 최종 성능. 게임 씬은 이것만 본다. */
export interface PlayerStats {
  maxHp: number;
  speed: number;
  focusSpeed: number;
  grazeRadius: number;
  hitClearRadius: number;
  invulnMs: number;
  damageMul: number;
  lowHpDamageMul: number;
  fireRateMul: number;
  weapon: WeaponDef;
  subs: SubDef[];
  extraDrones: number;
  visual: MechVisual;
  /** 태그별 장착 수와 발동 중인 단계 */
  synergies: { tag: Tag; name: string; count: number; tier: number }[];
}
