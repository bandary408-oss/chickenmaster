import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemyDef } from '../data/types';

export interface EnemyHost {
  /** 적이 탄을 쏠 때 호출. 탄 생성과 조준 대상은 씬이 결정한다. */
  enemyFire(enemy: Enemy): void;
}

export class Enemy extends Phaser.Physics.Arcade.Image {
  def!: EnemyDef;
  hp = 0;
  private age = 0;
  private baseY = 0;
  private nextFireAt = 0;
  private holdStartedAt = -1;

  spawn(def: EnemyDef, x: number, y: number) {
    this.def = def;
    this.hp = def.hp;
    this.age = 0;
    this.baseY = y;
    this.holdStartedAt = -1;
    this.nextFireAt = def.fire?.firstDelayMs ?? Infinity;
    this.setTexture(def.texture);
    this.enableBody(true, x, y, true, true);
    this.body!.setSize(this.width, this.height);
    this.setVelocity(-def.move.speed, 0);
    this.clearTint();
  }

  kill() {
    this.disableBody(true, true);
  }

  /** 맞으면 true, 이 공격으로 죽었으면 'dead' */
  takeDamage(amount: number): 'dead' | 'hit' {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(40, () => this.active && this.clearTint());
    return this.hp <= 0 ? 'dead' : 'hit';
  }

  tick(delta: number, host: EnemyHost) {
    if (!this.active) return;
    this.age += delta;
    const m = this.def.move;

    switch (m.kind) {
      case 'straight':
        break;
      case 'sine':
        this.y = this.baseY + Math.sin((this.age / 1000) * m.frequency * Math.PI * 2) * m.amplitude;
        break;
      case 'hold':
        if (this.holdStartedAt < 0 && this.x <= m.holdX) {
          this.holdStartedAt = this.age;
          this.setVelocity(0, 0);
        } else if (this.holdStartedAt >= 0 && this.age - this.holdStartedAt > m.holdMs) {
          // 버티는 시간이 끝나면 화면 밖으로 빠져나간다.
          this.setVelocity(-m.speed * 1.5, 0);
        }
        break;
    }

    const f = this.def.fire;
    if (f && this.age >= this.nextFireAt && this.x < GAME_WIDTH - 8) {
      host.enemyFire(this);
      this.nextFireAt = this.age + f.intervalMs;
    }

    if (this.x < -this.width || this.y < -64 || this.y > GAME_HEIGHT + 64) {
      this.kill();
    }
  }
}
