import Phaser from 'phaser';
import { COLORS, PLAYER } from '../config';

const BAR_X = 8;
const BAR_Y = 8;
const BAR_W = 120;
const BAR_H = 6;

export class Hud {
  private bar: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private grazeText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.bar = scene.add.graphics().setDepth(100);
    scene.add
      .text(BAR_X, BAR_Y + BAR_H + 3, 'HP', { fontFamily: 'monospace', fontSize: '8px', color: COLORS.text })
      .setDepth(100);
    this.scoreText = scene.add
      .text(scene.scale.width - 8, 6, '', { fontFamily: 'monospace', fontSize: '10px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(100);
    this.grazeText = scene.add
      .text(scene.scale.width - 8, 18, '', { fontFamily: 'monospace', fontSize: '8px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(100);
  }

  update(hp: number, score: number, graze: number) {
    const ratio = Phaser.Math.Clamp(hp / PLAYER.maxHp, 0, 1);
    this.bar.clear();
    this.bar.fillStyle(COLORS.hpBarBack).fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);
    this.bar.fillStyle(ratio > 0.3 ? COLORS.hpBar : COLORS.hpBarLow).fillRect(BAR_X, BAR_Y, BAR_W * ratio, BAR_H);
    this.bar.lineStyle(1, 0xffffff, 0.6).strokeRect(BAR_X - 0.5, BAR_Y - 0.5, BAR_W + 1, BAR_H + 1);
    this.scoreText.setText(`SCORE ${score.toString().padStart(7, '0')}`);
    this.grazeText.setText(`GRAZE ${graze}`);
  }
}
