import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

const MARGIN = 16;
const DEG = Math.PI / 180;

export interface BulletStyle {
  texture: string;
  /** 판정 반지름. 그림보다 작게 잡아 억울한 피격을 줄인다. */
  radius: number;
}

export interface BulletMotion {
  accel?: number;
  maxSpeed?: number;
  curveDegPerSec?: number;
  /** 적을 몇 번 더 뚫는지 (플레이어 탄) */
  pierce?: number;
  /** 이 거리를 날면 사라진다 */
  rangePx?: number;
  /** 유도 회전 속도 rad/s. 목표는 씬이 steer()로 알려 준다. */
  homing?: number;
}

// 플레이어 탄과 적탄이 같이 쓰는 풀링 대상 탄.
export class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 1;
  /** 이 탄으로 이미 그레이즈 판정을 받았는지 */
  grazed = false;
  pierce = 0;
  homing = 0;
  /** 관통탄이 같은 적을 여러 번 맞히지 않도록 기억한다. */
  readonly hitTargets = new Set<object>();
  private travelled = 0;
  private range = Infinity;
  private speed = 0;
  private angleRad = 0;
  private accel = 0;
  private maxSpeed = 0;
  private curve = 0;

  fire(x: number, y: number, angle: number, speed: number, damage = 1, style?: BulletStyle, motion?: BulletMotion) {
    if (style && this.texture.key !== style.texture) {
      this.setTexture(style.texture);
    }
    this.enableBody(true, x, y, true, true);
    if (style) {
      this.body!.setCircle(style.radius, this.width / 2 - style.radius, this.height / 2 - style.radius);
    }
    this.damage = damage;
    this.grazed = false;
    this.speed = speed;
    this.angleRad = angle;
    this.accel = motion?.accel ?? 0;
    this.maxSpeed = motion?.maxSpeed ?? Infinity;
    this.curve = (motion?.curveDegPerSec ?? 0) * DEG;
    this.pierce = motion?.pierce ?? 0;
    this.homing = motion?.homing ?? 0;
    this.range = motion?.rangePx ?? Infinity;
    this.travelled = 0;
    this.hitTargets.clear();
    this.applyVelocity();
  }

  kill() {
    this.disableBody(true, true);
  }

  /** 목표 각도로 최대 homing*dt 만큼 돈다. */
  steer(targetAngle: number, dt: number) {
    this.angleRad = Phaser.Math.Angle.RotateTo(this.angleRad, targetAngle, this.homing * dt);
    this.applyVelocity();
  }

  // 그룹의 runChildUpdate로 매 프레임 호출된다.
  update(_time: number, delta: number) {
    if (!this.active) return;
    if (this.range !== Infinity) {
      this.travelled += (this.speed * delta) / 1000;
      if (this.travelled > this.range) {
        this.kill();
        return;
      }
    }
    if (this.accel !== 0 || this.curve !== 0) {
      const dt = delta / 1000;
      this.speed = Math.min(this.maxSpeed, Math.max(0, this.speed + this.accel * dt));
      this.angleRad += this.curve * dt;
      this.applyVelocity();
    }
    if (
      this.x < -MARGIN || this.x > GAME_WIDTH + MARGIN ||
      this.y < -MARGIN || this.y > GAME_HEIGHT + MARGIN
    ) {
      this.kill();
    }
  }

  private applyVelocity() {
    this.setVelocity(Math.cos(this.angleRad) * this.speed, Math.sin(this.angleRad) * this.speed);
    this.setRotation(this.angleRad);
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

export function spawnBullet(
  group: Phaser.Physics.Arcade.Group,
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage = 1,
  style?: BulletStyle,
  motion?: BulletMotion,
) {
  const b = group.getFirstDead(false) as Bullet | null;
  if (!b) return null;
  b.fire(x, y, angle, speed, damage, style, motion);
  return b;
}

export function countActive(group: Phaser.Physics.Arcade.Group) {
  return group.countActive(true);
}
