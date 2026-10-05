import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { UI_FONT } from '../ui/text';

export interface ChoiceOption {
  label: string;
  detail?: string;
  /** 고를 수 없는 이유 (예: 스크랩 부족). 있으면 흐리게 표시 */
  disabledReason?: string;
  onPick: (scene: Phaser.Scene) => void;
}

export interface ChoiceSceneData {
  title: string;
  body?: string;
  /** 위쪽에 작게 보여 줄 상태 줄 (체력, 스크랩 등) */
  status?: string;
  options: ChoiceOption[];
}

const OPT_Y0 = 190;
const OPT_H = 30;

/** 정비소, 이벤트, 교체 슬롯 선택, 개조 분기 선택이 함께 쓰는 선택지 화면 */
export class ChoiceScene extends Phaser.Scene {
  private data_!: ChoiceSceneData;
  private cursor = 0;
  private optTexts: Phaser.GameObjects.Text[] = [];
  private highlight!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Choice');
  }

  init(data: ChoiceSceneData) {
    this.data_ = data;
    this.cursor = Math.max(0, data.options.findIndex((o) => !o.disabledReason));
  }

  create() {
    const d = this.data_;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 40, GAME_HEIGHT - 30, 0x141829).setStrokeStyle(1, 0x3a4466);
    this.add.text(cx, 28, d.title, { ...UI_FONT, fontSize: '16px', color: COLORS.accent }).setOrigin(0.5, 0);
    if (d.status) this.add.text(GAME_WIDTH - 32, 30, d.status, { ...UI_FONT, fontSize: '9px' }).setOrigin(1, 0).setAlpha(0.8);
    if (d.body) {
      this.add
        .text(cx, 64, d.body, { ...UI_FONT, fontSize: '11px', align: 'center', lineSpacing: 4, wordWrap: { width: 520, useAdvancedWrap: true } })
        .setOrigin(0.5, 0);
    }

    const top = d.options.length > 4 ? 120 : OPT_Y0;
    this.highlight = this.add.rectangle(cx, 0, 520, OPT_H - 4, 0x262b44);
    this.optTexts = d.options.map((o, i) => {
      const detail = o.disabledReason ?? o.detail;
      return this.add
        .text(cx, top + i * OPT_H, detail ? `${o.label}\n${detail}` : o.label, {
          ...UI_FONT, fontSize: '11px', align: 'center', lineSpacing: 2,
        })
        .setOrigin(0.5);
    });
    this.optTexts.forEach((t, i) => t.setData('y', top + i * OPT_H));

    this.add
      .text(cx, GAME_HEIGHT - 22, '↑↓ 선택   Z 결정', { ...UI_FONT, fontSize: '9px' })
      .setOrigin(0.5, 1)
      .setAlpha(0.7);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    // 이전 화면에서 Z를 누른 채 넘어와도 바로 고르지 않도록 잠깐 막는다.
    this.time.delayedCall(250, () => kb.on('keydown-Z', () => this.pick()));
    this.refresh();
  }

  private move(d: number) {
    this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.data_.options.length);
    this.refresh();
  }

  private pick() {
    const o = this.data_.options[this.cursor];
    if (o.disabledReason) {
      this.cameras.main.shake(80, 0.004);
      return;
    }
    o.onPick(this);
  }

  private refresh() {
    this.optTexts.forEach((t, i) => {
      const o = this.data_.options[i];
      t.setColor(i === this.cursor ? COLORS.accent : o.disabledReason ? '#5d6b85' : COLORS.text);
    });
    this.highlight.setY(this.optTexts[this.cursor].getData('y') as number);
  }
}
