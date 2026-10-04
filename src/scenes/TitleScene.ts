import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';

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

    const start = () => this.scene.start('Game');
    this.input.keyboard?.once('keydown-Z', start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.once('pointerdown', start);
  }
}
