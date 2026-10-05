import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../config';
import { newRun } from '../run/RunState';
import { loadMeta } from '../meta/Meta';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.38, 'CHICKEN MASTER', {
        fontFamily: 'monospace', resolution: RENDER_SCALE,
        fontSize: '32px',
        color: COLORS.accent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.52, '최강의 메카를 만들어라', {
        fontFamily: 'monospace', resolution: RENDER_SCALE,
        fontSize: '14px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.75, 'PRESS Z TO START', {
        fontFamily: 'monospace', resolution: RENDER_SCALE,
        fontSize: '12px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    this.add
      .text(cx, GAME_HEIGHT - 10, 'B: 설계실   G: 격납고(시험 비행)   P: 패턴 실험실   M: 소리 켜기/끄기', { fontFamily: 'monospace', resolution: RENDER_SCALE, fontSize: '9px', color: COLORS.text })
      .setOrigin(0.5, 1)
      .setAlpha(0.6);

    // 새 런을 시작해 섹터 지도로 간다.
    const start = () => {
      sfx('confirm');
      newRun(this.registry);
      this.scene.start('Map');
    };
    this.input.keyboard?.once('keydown-P', () => this.scene.start('PatternLab'));
    this.input.keyboard?.once('keydown-G', () => this.scene.start('Garage'));
    this.input.keyboard?.once('keydown-B', () => this.scene.start('Blueprint'));

    const meta = loadMeta();
    if (meta.runs > 0) {
      this.add
        .text(cx, GAME_HEIGHT * 0.85, `설계도 ${meta.blueprints}   최고 점수 ${meta.bestScore}`, {
          fontFamily: 'monospace', resolution: RENDER_SCALE, fontSize: '10px', color: COLORS.accent,
        })
        .setOrigin(0.5);
    }
    this.input.keyboard?.once('keydown-Z', start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }
}
