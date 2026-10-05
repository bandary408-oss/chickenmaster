import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, PLAYER } from '../config';
import type { PlayerStats } from '../parts/types';
import { MechView } from './MechView';

const EDGE_X = 14;
const EDGE_Y = 12;

/**
 * 물리 판정용 보이지 않는 점(히트박스)과, 그 위를 따라다니는 메카 외형(MechView)으로 나뉜다.
 */
export class Player extends Phaser.Physics.Arcade.Image {
  hp: number;
  readonly view: MechView;
  private invulnUntil = 0;
  private hitboxDot: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly stats: PlayerStats) {
    super(scene, x, y, 'hitbox');
    this.hp = stats.maxHp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setVisible(false);
    const r = PLAYER.hitboxRadius;
    this.body!.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    // 판정은 작지만 기체 그림이 화면 밖으로 나가지 않도록 이동 범위를 줄인다.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBoundsRectangle(new Phaser.Geom.Rectangle(EDGE_X, EDGE_Y, GAME_WIDTH - EDGE_X * 2, GAME_HEIGHT - EDGE_Y * 2));
    this.setCollideWorldBounds(true);

    this.view = new MechView(scene, x, y, stats.visual).setDepth(5);

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

  /** 과열 코어 등: 체력이 절반 아래면 추가 화력 */
  get damageMul() {
    const low = this.hp < this.stats.maxHp / 2 ? this.stats.lowHpDamageMul : 1;
    return this.stats.damageMul * low;
  }

  isInvulnerable(now: number) {
    return now < this.invulnUntil;
  }

  /** 실제로 피해를 입었으면 true */
  hurt(amount: number, now: number) {
    if (!this.alive || this.isInvulnerable(now)) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnUntil = now + this.stats.invulnMs;
    this.scene.cameras.main.shake(120, 0.006);
    return true;
  }

  move(dirX: number, dirY: number, focus: boolean, now: number) {
    const v = new Phaser.Math.Vector2(dirX, dirY).normalize().scale(focus ? this.stats.focusSpeed : this.stats.speed);
    this.setVelocity(v.x, v.y);
    this.hitboxDot.setVisible(focus);
    // 무적 중에는 깜빡인다.
    this.view.setAlpha(this.isInvulnerable(now) && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);
  }

  /** 물리 이동이 끝난 뒤 외형을 판정 위치에 맞춘다. */
  syncView() {
    this.view.setPosition(this.x, this.y);
    this.hitboxDot.setPosition(this.x, this.y);
  }

  get muzzle() {
    const m = this.view.muzzleOffset;
    return { x: this.x + m.x, y: this.y + m.y };
  }

  explode() {
    this.setVelocity(0, 0);
    this.view.setVisible(false);
    this.hitboxDot.setVisible(false);
    this.body!.enable = false;
  }
}
