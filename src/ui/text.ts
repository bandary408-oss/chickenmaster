import { COLORS, RENDER_SCALE } from '../config';
import { getPart } from '../parts/Loadout';
import type { EquippedPart } from '../parts/types';

/** 한글이 뭉개지지 않도록 텍스트를 고해상도로 그린다. */
export const UI_FONT = { fontFamily: 'monospace', color: COLORS.text, resolution: RENDER_SCALE } as const;

export const RARITY_LABEL = { common: '일반', rare: '희귀', prototype: '프로토타입' } as const;
export const RARITY_COLOR = { common: '#e8ecf5', rare: '#7cf7ff', prototype: '#ffd23f' } as const;

export function levelLabel(e: EquippedPart) {
  return getPart(e.id).branchOf ? '개조형' : `Lv${e.level}`;
}
