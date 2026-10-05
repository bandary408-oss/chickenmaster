import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MechView } from '../objects/MechView';
import { computeStats, getPart, loadLoadout, maxLevel, partsForSlot, saveLoadout } from '../parts/Loadout';
import type { EquippedPart, Loadout, SlotKind } from '../parts/types';
import { levelLabel } from '../ui/text';

interface Row {
  label: string;
  slot: SlotKind;
  get: (l: Loadout) => EquippedPart | null;
  set: (l: Loadout, v: EquippedPart | null) => void;
}

const ROWS: Row[] = [
  { label: 'CORE', slot: 'core', get: (l) => l.core, set: (l, v) => (l.core = v) },
  { label: 'MAIN', slot: 'mainWeapon', get: (l) => l.mainWeapon, set: (l, v) => (l.mainWeapon = v) },
  ...[0, 1].map((i): Row => ({
    label: `SUB ${i + 1}`, slot: 'subWeapon', get: (l) => l.subWeapons[i], set: (l, v) => (l.subWeapons[i] = v),
  })),
  { label: 'ARMOR', slot: 'armor', get: (l) => l.armor, set: (l, v) => (l.armor = v) },
  { label: 'BOOST', slot: 'booster', get: (l) => l.booster, set: (l, v) => (l.booster = v) },
  ...[0, 1, 2, 3].map((i): Row => ({
    label: `MOD ${i + 1}`, slot: 'module', get: (l) => l.modules[i], set: (l, v) => (l.modules[i] = v),
  })),
];

const FONT = { fontFamily: 'monospace', color: COLORS.text, resolution: 3 } as const;
const ROW_Y0 = 40;
const ROW_H = 22;

// 격납고: 파츠를 직접 끼워 보며 외형과 스탯을 확인한다.
// 5단계(로그라이크 런)가 들어오면 런 사이 메타 화면으로 바뀐다.
export class GarageScene extends Phaser.Scene {
  private loadout!: Loadout;
  private cursor = 0;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private highlight!: Phaser.GameObjects.Rectangle;
  private preview!: MechView;
  private statsText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;

  constructor() {
    super('Garage');
  }

  create() {
    this.loadout = structuredClone(loadLoadout(this.registry));
    this.cursor = 0;

    this.add.text(16, 12, 'HANGAR  격납고', { ...FONT, fontSize: '14px', color: COLORS.accent });

    this.highlight = this.add.rectangle(10, 0, 290, ROW_H - 2, 0x262b44).setOrigin(0, 0.5);
    this.rowTexts = ROWS.map((_r, i) =>
      this.add.text(16, ROW_Y0 + i * ROW_H, '', { ...FONT, fontSize: '11px' }).setOrigin(0, 0.5),
    );

    // 미리보기 받침대
    this.add.rectangle(470, 92, 300, 110, 0x141829).setStrokeStyle(1, 0x3a4466);
    this.preview = new MechView(this, 470, 92, computeStats(this.loadout).visual).setScale(4);

    this.statsText = this.add.text(326, 154, '', {
      ...FONT, fontSize: '10px', lineSpacing: 3, wordWrap: { width: 300, useAdvancedWrap: true },
    });
    this.descText = this.add.text(326, 270, '', {
      ...FONT, fontSize: '11px', lineSpacing: 3, wordWrap: { width: 300, useAdvancedWrap: true },
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 8, '↑↓ 슬롯   ←→ 파츠   Q/E 레벨   Z 시험 비행   ESC 타이틀', { ...FONT, fontSize: '10px' })
      .setOrigin(0.5, 1)
      .setAlpha(0.8);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.moveCursor(-1));
    kb.on('keydown-DOWN', () => this.moveCursor(1));
    kb.on('keydown-LEFT', () => this.cyclePart(-1));
    kb.on('keydown-RIGHT', () => this.cyclePart(1));
    kb.on('keydown-Q', () => this.changeLevel(-1));
    kb.on('keydown-E', () => this.changeLevel(1));
    kb.on('keydown-Z', () => {
      saveLoadout(this.registry, this.loadout);
      this.scene.start('Game', { mode: 'test' });
    });
    kb.on('keydown-ESC', () => {
      saveLoadout(this.registry, this.loadout);
      this.scene.start('Title');
    });

    this.refresh();
  }

  private moveCursor(d: number) {
    this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, ROWS.length);
    this.refresh();
  }

  private cyclePart(d: number) {
    const row = ROWS[this.cursor];
    const options = [null, ...partsForSlot(row.slot).map((p) => p.id)];
    const cur = row.get(this.loadout);
    const idx = options.indexOf(cur?.id ?? null);
    const next = options[Phaser.Math.Wrap(idx + d, 0, options.length)];
    row.set(this.loadout, next ? { id: next, level: Math.min(cur?.level ?? 1, maxLevel(next)) } : null);
    this.refresh();
  }

  private changeLevel(d: number) {
    const row = ROWS[this.cursor];
    const cur = row.get(this.loadout);
    if (!cur) return;
    row.set(this.loadout, { ...cur, level: Phaser.Math.Clamp(cur.level + d, 1, maxLevel(cur.id)) });
    this.refresh();
  }

  private refresh() {
    ROWS.forEach((r, i) => {
      const e = r.get(this.loadout);
      const name = e ? `${getPart(e.id).name}  ${levelLabel(e)}` : '- 비어 있음 -';
      const sel = i === this.cursor;
      this.rowTexts[i]
        .setText(`${r.label.padEnd(6)} ${sel ? '◀ ' : '  '}${name}${sel ? ' ▶' : ''}`)
        .setColor(sel ? COLORS.accent : e ? COLORS.text : '#5d6b85');
    });
    this.highlight.setY(ROW_Y0 + this.cursor * ROW_H);

    const s = computeStats(this.loadout);
    this.preview.apply(s.visual);

    const w = s.weapon;
    const dps = (w.damage * w.count * s.damageMul * 1000 * s.fireRateMul) / w.intervalMs;
    const subs = this.loadout.subWeapons.filter((x) => x).map((x) => getPart(x!.id).name).join(', ') || '없음';
    const syn = s.synergies
      .filter((x) => x.count > 0)
      .map((x) => `${x.name} ${x.count}${x.tier ? `(${x.tier}세트)` : ''}`)
      .join(' · ') || '없음';
    this.statsText.setText([
      `HP ${s.maxHp} · 속도 ${s.speed.toFixed(0)} · 정밀 ${s.focusSpeed.toFixed(0)}`,
      `주무기 초당 화력 ${dps.toFixed(1)} · 화력 x${s.damageMul.toFixed(2)}`,
      `그레이즈 반경 ${s.grazeRadius} · 피격 소거 ${s.hitClearRadius}`,
      `보조: ${subs}${s.extraDrones ? ` · 시너지 드론 +${s.extraDrones}` : ''}`,
      `시너지: ${syn}`,
    ]);

    const e = ROWS[this.cursor].get(this.loadout);
    if (e) {
      const p = getPart(e.id);
      const rarity = { common: '일반', rare: '희귀', prototype: '프로토타입' }[p.rarity];
      this.descText.setText(`${p.name} [${rarity}]\n"${p.desc}"`);
    } else {
      this.descText.setText('빈 슬롯. ←→로 파츠를 골라 끼워 보자.');
    }
  }
}
