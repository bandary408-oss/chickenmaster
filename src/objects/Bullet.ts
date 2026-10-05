import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

const MARGIN = 16;

// 플레이어 탄과 적탄이 같이 쓰는 풀링 대상 탄.
export class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 1;

  fire(x: number, y: number, vx: number, vy: number, damage = 1) {
    this.enableBody(true, x, y, true, true);
    this.setVelocity(vx, vy);
    this.setRotation(Math.atan2(vy, vx));
    this.damage = damage;
  }

  kill() {
    this.disableBody(true, true);
  }

  // 그룹의 runChildUpdate로 매 프레임 호출된다.
  update() {
    if (!this.active) return;
    if (
      this.x < -MARGIN || this.x > GAME_WIDTH + MARGIN ||
      this.y < -MARGIN || this.y > GAME_HEIGHT + MARGIN
    ) {
      this.kill();
    }
  }
}

export function createBulletGroup(scene: Phaser.Scene, texture: string, maxSize: number, hitRadius: number) {
  const group = scene.physics.add.group({
    classType: Bullet,
    defaultKey: texture,
    maxSize,
    runChildUpdate: true,
  });
  // 풀을 미리 채워 두고 꺼진 상태로 둔다.
  group.createMultiple({ key: texture, quantity: maxSize, active: false, visible: false });
  group.getChildren().forEach((c) => {
    const b = c as Bullet;
    const r = hitRadius;
    b.body!.setCircle(r, b.width / 2 - r, b.height / 2 - r);
    b.disableBody(true, true);
  });
  return group;
}

export function spawnBullet(group: Phaser.Physics.Arcade.Group, x: number, y: number, vx: number, vy: number, damage = 1) {
  const b = group.getFirstDead(false) as Bullet | null;
  if (!b) return null;
  b.fire(x, y, vx, vy, damage);
  return b;
}
