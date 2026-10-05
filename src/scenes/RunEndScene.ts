import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { equippedList, getPart } from '../parts/Loadout';
import { endRun, getRun } from '../run/RunState';
import { loadMeta, recordRun } from '../meta/Meta';
import { UI_FONT, levelLabel } from '../ui/text';

/** 런 종료: 사망하거나 섹터 보스를 쓰러뜨렸을 때 */
export class RunEndScene extends Phaser.Scene {
  private won = false;

  constructor() {
    super('RunEnd');
  }

  init(data: { won: boolean }) {
    this.won = data.won;
  }

  create() {
    const run = getRun(this.registry);
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 40, this.won ? 'SECTOR CLEAR' : 'MECH DESTROYED', { ...UI_FONT, fontSize: '24px', color: this.won ? COLORS.accent : '#ff4f78' })
      .setOrigin(0.5);
    this.add.text(cx, 72, this.won ? '"강철 수탉의 부품… 하나만 가져가면 안 될까?"' : '"다음엔… 장갑을 더 두껍게…!"', { ...UI_FONT, fontSize: '11px' })
      .setOrigin(0.5)
      .setAlpha(0.85);

    if (run) {
      const battles = run.cleared.filter((id) => ['battle', 'elite', 'boss'].includes(run.map.nodes[id].kind)).length;
      this.add.text(cx, 110, [
        `돌파한 노드 ${run.cleared.length}   전투 ${battles}`,
        `처치 ${run.kills}   점수 ${run.score}   남은 스크랩 ${run.scrap}`,
      ], { ...UI_FONT, fontSize: '12px', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);

      const gear = equippedList(run.loadout).map((e) => `${getPart(e.id).name} ${levelLabel(e)}`);
      const earned = recordRun(run, this.won);
      this.add.text(cx, 152, `설계도 +${earned}  (보유 ${loadMeta().blueprints})`, { ...UI_FONT, fontSize: '12px', color: COLORS.accent })
        .setOrigin(0.5, 0);

      this.add.text(cx, 180, ['최종 기체', ...gear], { ...UI_FONT, fontSize: '10px', align: 'center', lineSpacing: 3 })
        .setOrigin(0.5, 0)
        .setAlpha(0.85);
    }
    endRun(this.registry);

    this.add.text(cx, GAME_HEIGHT - 16, 'Z: 타이틀로   (타이틀에서 B: 설계실)', { ...UI_FONT, fontSize: '11px' }).setOrigin(0.5, 1);
    this.time.delayedCall(800, () => this.input.keyboard?.once('keydown-Z', () => this.scene.start('Title')));
  }
}
