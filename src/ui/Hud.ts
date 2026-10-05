import Phaser from 'phaser';
import { COLORS } from '../config';
import type { Enemy } from '../objects/Enemy';
import { UI_FONT } from './text';

const BAR_X = 8;
const BAR_Y = 8;
const BAR_W = 120;
const BAR_H = 6;

export class Hud {
  private bar: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private grazeText: Phaser.GameObjects.Text;
  private bossBar: Phaser.GameObjects.Graphics;
  private bossName: Phaser.GameObjects.Text;

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
    this.bossBar = scene.add.graphics().setDepth(100);
    this.bossName = scene.add
      .text(scene.scale.width / 2, 22, '', { ...UI_FONT, fontSize: '9px', color: COLORS.accent })
      .setOrigin(0.5, 0)
      .setDepth(100);
  }

  /** 보스가 있으면 화면 위 가운데에 체력 바를 그린다. */
  updateBoss(boss: Enemy | null) {
    this.bossBar.clear();
    if (!boss || !boss.active) {
      this.bossName.setText('');
      return;
    }
    const w = 220;
    const x = (this.bossName.scene.scale.width - w) / 2;
    const ratio = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
    this.bossBar.fillStyle(COLORS.hpBarBack).fillRect(x, 14, w, 5);
    this.bossBar.fillStyle(COLORS.enemyBullet).fillRect(x, 14, w * ratio, 5);
    this.bossBar.lineStyle(1, 0xffffff, 0.6).strokeRect(x - 0.5, 13.5, w + 1, 6);
    this.bossName.setText(boss.def.name ?? 'BOSS');
  }

  update(hp: number, maxHp: number, score: number, graze: number) {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.bar.clear();
    this.bar.fillStyle(COLORS.hpBarBack).fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);
    this.bar.fillStyle(ratio > 0.3 ? COLORS.hpBar : COLORS.hpBarLow).fillRect(BAR_X, BAR_Y, BAR_W * ratio, BAR_H);
    this.bar.lineStyle(1, 0xffffff, 0.6).strokeRect(BAR_X - 0.5, BAR_Y - 0.5, BAR_W + 1, BAR_H + 1);
    this.scoreText.setText(`SCORE ${score.toString().padStart(7, '0')}`);
    this.grazeText.setText(`GRAZE ${graze}`);
  }
}
