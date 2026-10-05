import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, RENDER_SCALE } from '../config';
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
  private odBar: Phaser.GameObjects.Graphics;
  private odLabel: Phaser.GameObjects.Text;
  private bossName: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.bar = scene.add.graphics().setDepth(100);
    scene.add
      .text(BAR_X, BAR_Y + BAR_H + 3, 'HP', { fontFamily: 'monospace', resolution: RENDER_SCALE, fontSize: '8px', color: COLORS.text })
      .setDepth(100);
    this.scoreText = scene.add
      .text(GAME_WIDTH - 8, 6, '', { fontFamily: 'monospace', resolution: RENDER_SCALE, fontSize: '10px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(100);
    this.grazeText = scene.add
      .text(GAME_WIDTH - 8, 18, '', { fontFamily: 'monospace', resolution: RENDER_SCALE, fontSize: '8px', color: COLORS.text })
      .setOrigin(1, 0)
      .setDepth(100);
    this.bossBar = scene.add.graphics().setDepth(100);
    this.odBar = scene.add.graphics().setDepth(100);
    this.odLabel = scene.add
      .text(BAR_X + 16, BAR_Y + BAR_H + 3, '', { ...UI_FONT, fontSize: '8px', color: COLORS.accent })
      .setDepth(100);
    this.bossName = scene.add
      .text(GAME_WIDTH / 2, 22, '', { ...UI_FONT, fontSize: '9px', color: COLORS.accent })
      .setOrigin(0.5, 0)
      .setDepth(100);
  }

  /** HP 바 아래 오버드라이브 게이지. 가득 차면 C 안내를 띄운다. */
  updateOverdrive(ratio: number, active: boolean) {
    const y = BAR_Y + BAR_H + 14;
    this.odBar.clear();
    this.odBar.fillStyle(COLORS.hpBarBack).fillRect(BAR_X, y, BAR_W, 3);
    this.odBar.fillStyle(0xffd23f, active ? 1 : 0.85).fillRect(BAR_X, y, BAR_W * (active ? 1 : ratio), 3);
    this.odLabel.setText(active ? 'OVERDRIVE' : ratio >= 1 ? 'C: OVERDRIVE!' : '');
    this.odLabel.setAlpha(active || ratio >= 1 ? 0.6 + Math.sin(performance.now() / 120) * 0.4 : 1);
  }

  /** 보스가 있으면 화면 위 가운데에 체력 바를 그린다. */
  updateBoss(boss: Enemy | null) {
    this.bossBar.clear();
    if (!boss || !boss.active) {
      this.bossName.setText('');
      return;
    }
    const w = 220;
    const x = (GAME_WIDTH - w) / 2;
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
