import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { UNLOCKS, buy, canBuy, loadMeta, saveMeta, startOptions, type MetaSave } from '../meta/Meta';
import { getPart } from '../parts/Loadout';
import { UI_FONT } from '../ui/text';

type Row =
  | { kind: 'start'; which: 'startCore' | 'startWeapon'; label: string }
  | { kind: 'unlock'; id: string };

const ROW_Y0 = 58;
const ROW_H = 20;

/** 설계실: 런 사이에 설계도 포인트로 파츠와 시작 장비를 해금한다 (기획서 8장) */
export class BlueprintScene extends Phaser.Scene {
  private meta!: MetaSave;
  private rows: Row[] = [];
  private cursor = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private highlight!: Phaser.GameObjects.Rectangle;
  private header!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;

  constructor() {
    super('Blueprint');
  }

  create() {
    this.meta = loadMeta();
    this.cursor = 0;
    this.rows = [
      { kind: 'start', which: 'startCore', label: '시작 코어' },
      { kind: 'start', which: 'startWeapon', label: '시작 무기' },
      ...Object.keys(UNLOCKS).map((id): Row => ({ kind: 'unlock', id })),
    ];

    this.add.text(16, 12, '설계실', { ...UI_FONT, fontSize: '16px', color: COLORS.accent });
    this.header = this.add.text(GAME_WIDTH - 16, 16, '', { ...UI_FONT, fontSize: '10px' }).setOrigin(1, 0);
    this.add.text(16, 36, '"죽어도 설계도는 남는다. 다음 기체는 더 강할 거야!"', { ...UI_FONT, fontSize: '9px' }).setAlpha(0.75);

    this.highlight = this.add.rectangle(10, 0, GAME_WIDTH - 20, ROW_H - 2, 0x262b44).setOrigin(0, 0.5);
    this.texts = this.rows.map((_, i) => this.add.text(16, ROW_Y0 + i * ROW_H + (i >= 2 ? 6 : 0), '', { ...UI_FONT, fontSize: '11px' }).setOrigin(0, 0.5));
    this.descText = this.add.text(16, GAME_HEIGHT - 40, '', { ...UI_FONT, fontSize: '10px', wordWrap: { width: GAME_WIDTH - 32 } }).setAlpha(0.9);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 6, '↑↓ 선택   ←→ 시작 장비 바꾸기   Z 해금   ESC 타이틀', { ...UI_FONT, fontSize: '9px' })
      .setOrigin(0.5, 1)
      .setAlpha(0.7);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-LEFT', () => this.cycleStart(-1));
    kb.on('keydown-RIGHT', () => this.cycleStart(1));
    this.time.delayedCall(250, () => kb.on('keydown-Z', () => this.purchase()));
    kb.on('keydown-ESC', () => this.scene.start('Title'));
    this.refresh();
  }

  private move(d: number) {
    this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.rows.length);
    sfx('select');
    this.refresh();
  }

  private cycleStart(d: number) {
    const r = this.rows[this.cursor];
    if (r.kind !== 'start') return;
    const opts = startOptions(this.meta, r.which);
    const idx = opts.indexOf(this.meta[r.which]);
    this.meta[r.which] = opts[Phaser.Math.Wrap(idx + d, 0, opts.length)];
    saveMeta(this.meta);
    sfx('select');
    this.refresh();
  }

  private purchase() {
    const r = this.rows[this.cursor];
    if (r.kind !== 'unlock') return;
    if (buy(this.meta, r.id)) {
      this.cameras.main.flash(120, 255, 210, 63);
      sfx('powerup');
    } else {
      this.cameras.main.shake(80, 0.004);
      sfx('denied');
    }
    this.refresh();
  }

  private refresh() {
    const m = this.meta;
    this.header.setText(`설계도 ${m.blueprints}   런 ${m.runs}회   최고 점수 ${m.bestScore}`);
    this.rows.forEach((r, i) => {
      const sel = i === this.cursor;
      let text: string;
      let color: string = COLORS.text;
      if (r.kind === 'start') {
        const opts = startOptions(m, r.which);
        text = `${r.label.padEnd(6)} ${sel ? '◀ ' : '  '}${getPart(m[r.which]).name}${sel ? ' ▶' : ''}   (${opts.length}종 해금)`;
      } else {
        const u = UNLOCKS[r.id];
        const reason = canBuy(m, r.id);
        const done = m.unlocked.includes(r.id);
        text = `${done ? '[해금됨]' : `[${String(u.cost).padStart(2)}]`}  ${u.name}`;
        color = done ? COLORS.accent : reason ? '#5d6b85' : COLORS.text;
      }
      this.texts[i].setText(text).setColor(sel ? COLORS.accent : color);
    });
    this.highlight.setY(this.texts[this.cursor].y);

    const r = this.rows[this.cursor];
    if (r.kind === 'start') {
      this.descText.setText(r.which === 'startCore' ? '새 런을 시작할 때 달고 나갈 코어.' : '새 런을 시작할 때 들고 나갈 주무기.');
    } else {
      const u = UNLOCKS[r.id];
      const reason = canBuy(m, r.id);
      this.descText.setText(`${u.desc}${reason && reason !== '해금 완료' ? `  (${reason})` : ''}`);
    }
  }
}
