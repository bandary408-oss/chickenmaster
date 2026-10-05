import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { newRun } from '../run/RunState';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.38, 'CHICKEN MASTER', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: COLORS.accent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.52, '최강의 메카를 만들어라', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.75, 'PRESS Z TO START', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    this.add
      .text(cx, GAME_HEIGHT - 10, 'G: HANGAR (TEST FLIGHT)   P: PATTERN LAB', { fontFamily: 'monospace', fontSize: '8px', color: COLORS.text })
      .setOrigin(0.5, 1)
      .setAlpha(0.6);

    // 새 런을 시작해 섹터 지도로 간다.
    const start = () => {
      newRun(this.registry);
      this.scene.start('Map');
    };
    this.input.keyboard?.once('keydown-P', () => this.scene.start('PatternLab'));
    this.input.keyboard?.once('keydown-G', () => this.scene.start('Garage'));
    this.input.keyboard?.once('keydown-Z', start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }
}
