import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { SYNERGIES, getPart } from '../parts/Loadout';
import type { PartDef, SlotKind } from '../parts/types';
import { applyReward, needsReplaceChoice, replacedName, rollRewards, slotRefs, type RewardOption } from '../run/Rewards';
import { clampHp, getRun } from '../run/RunState';
import { RARITY_COLOR, RARITY_LABEL, UI_FONT, levelLabel } from '../ui/text';
import type { ChoiceSceneData } from './ChoiceScene';

export const SLOT_LABEL: Record<SlotKind, string> = {
  core: '코어', mainWeapon: '주무기', subWeapon: '보조무기', armor: '장갑', booster: '부스터', module: '모듈',
};

const SKIP_SCRAP = 15;
const CARD_W = 188;
const CARD_H = 236;

export interface RewardSceneData {
  guaranteeRare: boolean;
  title: string;
}

function tagLine(p: PartDef) {
  return p.tags.map((t) => `#${SYNERGIES[t].name}`).join(' ');
}

/** 스테이지 클리어 보상: 파츠 3개 중 1개 (기획서 4장, 5.2) */
export class RewardScene extends Phaser.Scene {
  private options: RewardOption[] = [];
  private cursor = 0;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private params!: RewardSceneData;

  constructor() {
    super('Reward');
  }

  init(data: RewardSceneData) {
    this.params = data;
    this.cursor = 0;
  }

  create() {
    const run = getRun(this.registry)!;
    this.options = rollRewards(run.loadout, 3, this.params.guaranteeRare);

    this.add.text(GAME_WIDTH / 2, 14, this.params.title, { ...UI_FONT, fontSize: '16px', color: COLORS.accent }).setOrigin(0.5, 0);
    this.add
      .text(GAME_WIDTH / 2, 36, '"제국 메카에서 뜯어낸 파츠다! 어느 걸 붙이지?"', { ...UI_FONT, fontSize: '10px' })
      .setOrigin(0.5, 0)
      .setAlpha(0.8);

    const gap = 14;
    const x0 = (GAME_WIDTH - (CARD_W * 3 + gap * 2)) / 2;
    this.cards = this.options.map((o, i) => this.drawCard(o, x0 + i * (CARD_W + gap), 60));

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 8, `←→ 선택   Z 장착   X 건너뛰기(스크랩 +${SKIP_SCRAP})`, { ...UI_FONT, fontSize: '9px' })
      .setOrigin(0.5, 1)
      .setAlpha(0.8);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    this.time.delayedCall(300, () => {
      kb.on('keydown-Z', () => this.pick());
      kb.on('keydown-X', () => {
        run.scrap += SKIP_SCRAP;
        this.scene.start('Map');
      });
    });
    this.refresh();
  }

  private drawCard(o: RewardOption, x: number, y: number) {
    const run = getRun(this.registry)!;
    const card = this.add.rectangle(x, y, CARD_W, CARD_H, 0x141829).setOrigin(0).setStrokeStyle(1, 0x3a4466);
    const p = o.part;
    const pad = 10;
    const tx = x + pad;
    const w = CARD_W - pad * 2;

    const badge =
      o.kind === 'new' ? '새 파츠' : o.kind === 'upgrade' ? `강화 Lv${o.from} → Lv${o.from + 1}` : 'Lv3 개조 분기!';
    this.add.text(tx, y + 8, badge, { ...UI_FONT, fontSize: '9px', color: o.kind === 'new' ? COLORS.text : COLORS.accent });
    this.add.text(tx, y + 24, p.name, { ...UI_FONT, fontSize: '14px', color: RARITY_COLOR[p.rarity] });
    this.add.text(tx, y + 44, `${SLOT_LABEL[p.slot]} · ${RARITY_LABEL[p.rarity]}  ${tagLine(p)}`, {
      ...UI_FONT, fontSize: '9px', wordWrap: { width: w, useAdvancedWrap: true },
    }).setAlpha(0.8);

    let body = `"${p.desc}"`;
    if (o.kind === 'branch') {
      body = `둘 중 하나로 개조:\n${o.branches.map((b) => `· ${b.name}`).join('\n')}`;
    }
    this.add.text(tx, y + 66, body, {
      ...UI_FONT, fontSize: '10px', lineSpacing: 3, wordWrap: { width: w, useAdvancedWrap: true },
    });

    const replaced = replacedName(run.loadout, o);
    const multiFull = needsReplaceChoice(run.loadout, o);
    const note = replaced ? `교체: ${replaced}` : multiFull ? '슬롯이 가득 참: 교체할 칸 선택' : o.kind === 'new' ? '빈 슬롯에 장착' : '';
    if (note) {
      this.add.text(tx, y + CARD_H - 22, note, { ...UI_FONT, fontSize: '9px', color: '#ff8a3d', wordWrap: { width: w } });
    }
    return card;
  }

  private move(d: number) {
    this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.options.length);
    this.refresh();
  }

  private refresh() {
    this.cards.forEach((c, i) => c.setStrokeStyle(i === this.cursor ? 2 : 1, i === this.cursor ? 0xffd23f : 0x3a4466));
  }

  private finish(apply: () => void, scene: Phaser.Scene = this) {
    const run = getRun(this.registry)!;
    apply();
    clampHp(run);
    scene.scene.start('Map');
  }

  private pick() {
    const run = getRun(this.registry)!;
    const o = this.options[this.cursor];
    if (!o) return;

    if (o.kind === 'branch') {
      const data: ChoiceSceneData = {
        title: `${o.part.name} 개조`,
        body: '"Lv3까지 키웠으니 이제 개조할 차례야. 어느 쪽으로 가지?"',
        options: o.branches.map((b, i) => ({
          label: b.name,
          detail: b.desc,
          onPick: (s) => this.finish(() => applyReward(run.loadout, o, { branchIndex: i }), s),
        })),
      };
      this.scene.start('Choice', data);
      return;
    }

    if (needsReplaceChoice(run.loadout, o)) {
      const refs = slotRefs(run.loadout, o.part.slot);
      const data: ChoiceSceneData = {
        title: `${o.part.name}: 어느 칸을 바꿀까?`,
        body: `${SLOT_LABEL[o.part.slot]} 슬롯이 가득 찼다. 떼어 낸 파츠는 사라진다.`,
        options: [
          ...refs.map((r, i) => {
            const cur = r.get()!;
            return {
              label: `${i + 1}번 칸: ${getPart(cur.id).name} ${levelLabel(cur)}`,
              onPick: (s: Phaser.Scene) => this.finish(() => applyReward(run.loadout, o, { replaceIndex: i }), s),
            };
          }),
          { label: '그만두기 (스크랩 +15)', onPick: (s: Phaser.Scene) => this.finish(() => (run.scrap += SKIP_SCRAP), s) },
        ],
      };
      this.scene.start('Choice', data);
      return;
    }

    this.finish(() => applyReward(run.loadout, o));
  }
}
