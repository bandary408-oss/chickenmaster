import Phaser from 'phaser';
import { spawnBullet, type Bullet, type BulletStyle } from '../objects/Bullet';
import type { Player } from '../objects/Player';
import type { SubDef } from '../parts/types';

const DEG = Math.PI / 180;
const SUB_BULLET: BulletStyle = { texture: 'bullet_player', radius: 2 };
const SUB_BULLET_SPEED = 460;
const BIT_HIT_RADIUS = 6;

interface Drone {
  img: Phaser.GameObjects.Image;
  slot: number;
  intervalMs: number;
  damage: number;
  nextAt: number;
}

interface Bits {
  imgs: Phaser.GameObjects.Image[];
  radius: number;
  speed: number;
  angle: number;
}

interface Turret {
  intervalMs: number;
  damage: number;
  angles: number[];
  nextAt: number;
}

/**
 * 보조무기 슬롯 2개의 동작. 장착된 SubDef와 드론 시너지(extraDrones)로 만들어진다.
 */
export class SubWeapons {
  private drones: Drone[] = [];
  private bits: Bits[] = [];
  private turrets: Turret[] = [];

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    subs: SubDef[],
    extraDrones: number,
    private playerBullets: Phaser.Physics.Arcade.Group,
    private enemyBullets: Phaser.Physics.Arcade.Group,
    private onBulletBlocked: (x: number, y: number) => void,
  ) {
    for (const s of subs) {
      if (s.kind === 'drone') {
        for (let i = 0; i < s.count; i++) this.addDrone(s.intervalMs, s.damage);
      } else if (s.kind === 'shieldbit') {
        const imgs = Array.from({ length: s.count }, () => scene.add.image(player.x, player.y, 'sub_shieldbit').setDepth(6));
        this.bits.push({ imgs, radius: s.radius, speed: s.speedDeg * DEG, angle: 0 });
      } else {
        this.turrets.push({ intervalMs: s.intervalMs, damage: s.damage, angles: s.anglesDeg.map((a) => a * DEG), nextAt: 0 });
      }
    }
    // 드론 시너지: 기본 성능의 드론을 더 붙인다.
    for (let i = 0; i < extraDrones; i++) this.addDrone(300, 0.8);
  }

  private addDrone(intervalMs: number, damage: number) {
    const slot = this.drones.length;
    const img = this.scene.add.image(this.player.x, this.player.y, 'sub_drone').setDepth(6);
    this.drones.push({ img, slot, intervalMs, damage, nextAt: 0 });
  }

  /** 드론이 머무는 자리: 기체 뒤쪽 위아래로 번갈아 */
  private droneOffset(slot: number) {
    const side = slot % 2 === 0 ? -1 : 1;
    const row = Math.floor(slot / 2);
    return { x: -16 - row * 8, y: side * (18 + row * 6) };
  }

  update(time: number, delta: number, firing: boolean) {
    const p = this.player;
    const dt = delta / 1000;
    const visible = p.alive;
    const dmgMul = p.damageMul;

    for (const d of this.drones) {
      const o = this.droneOffset(d.slot);
      // 살짝 늦게 따라와 떠 있는 느낌을 준다.
      d.img.x = Phaser.Math.Linear(d.img.x, p.x + o.x, 0.18);
      d.img.y = Phaser.Math.Linear(d.img.y, p.y + o.y, 0.18);
      d.img.setVisible(visible);
      if (firing && visible && time >= d.nextAt) {
        spawnBullet(this.playerBullets, d.img.x + 4, d.img.y, 0, SUB_BULLET_SPEED, d.damage * dmgMul, SUB_BULLET);
        d.nextAt = time + d.intervalMs;
      }
    }

    for (const t of this.turrets) {
      if (firing && visible && time >= t.nextAt) {
        for (const a of t.angles) spawnBullet(this.playerBullets, p.x, p.y, a, SUB_BULLET_SPEED, t.damage * dmgMul, SUB_BULLET);
        t.nextAt = time + t.intervalMs;
      }
    }

    if (this.bits.length === 0) return;
    const enemyList = this.enemyBullets.getChildren();
    const r2 = BIT_HIT_RADIUS * BIT_HIT_RADIUS;
    for (const b of this.bits) {
      b.angle += b.speed * dt;
      b.imgs.forEach((img, i) => {
        const a = b.angle + (Math.PI * 2 * i) / b.imgs.length;
        img.setPosition(p.x + Math.cos(a) * b.radius, p.y + Math.sin(a) * b.radius).setVisible(visible);
        if (!visible) return;
        // 실드 비트에 닿은 적탄은 지운다.
        for (let k = 0; k < enemyList.length; k++) {
          const eb = enemyList[k] as Bullet;
          if (!eb.active) continue;
          const dx = eb.x - img.x;
          const dy = eb.y - img.y;
          if (dx * dx + dy * dy <= r2) {
            this.onBulletBlocked(eb.x, eb.y);
            eb.kill();
          }
        }
      });
    }
  }
}
