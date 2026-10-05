import Phaser from 'phaser';
import { COLORS, PLAYER } from '../config';

export class Player extends Phaser.Physics.Arcade.Image {
  hp: number = PLAYER.maxHp;
  private invulnUntil = 0;
  private hitboxDot: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    const r = PLAYER.hitboxRadius;
    this.body!.setCircle(r, this.width / 2 - r, this.height / 2 - r);

    // Shift(정밀 이동) 중에만 보이는 히트박스 표시
    this.hitboxDot = scene.add
      .circle(x, y, r, 0xffffff)
      .setStrokeStyle(1, COLORS.enemyBullet)
      .setDepth(10)
      .setVisible(false);
  }

  get alive() {
    return this.hp > 0;
  }

  isInvulnerable(now: number) {
    return now < this.invulnUntil;
  }

  /** 실제로 피해를 입었으면 true */
  hurt(amount: number, now: number) {
    if (!this.alive || this.isInvulnerable(now)) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnUntil = now + PLAYER.invulnMs;
    this.scene.cameras.main.shake(120, 0.006);
    return true;
  }

  move(dirX: number, dirY: number, focus: boolean, now: number) {
    const v = new Phaser.Math.Vector2(dirX, dirY).normalize().scale(focus ? PLAYER.focusSpeed : PLAYER.speed);
    this.setVelocity(v.x, v.y);
    this.hitboxDot.setPosition(this.x, this.y).setVisible(focus);
    // 무적 중에는 깜빡인다.
    this.setAlpha(this.isInvulnerable(now) && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);
  }

  explode() {
    this.setVelocity(0, 0);
    this.setVisible(false);
    this.hitboxDot.setVisible(false);
    this.body!.enable = false;
  }
}
