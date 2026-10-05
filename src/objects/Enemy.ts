import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemyDef, FireDef } from '../data/types';

export interface EnemyHost {
  /** 적이 탄을 쏠 때 호출. 탄 생성과 조준 대상은 씬이 결정한다. */
  enemyFire(enemy: Enemy, fire: FireDef): void;
  /** 보스가 다음 페이즈로 넘어갈 때 */
  onBossPhase?(enemy: Enemy, phase: number): void;
}

export class Enemy extends Phaser.Physics.Arcade.Image {
  def!: EnemyDef;
  hp = 0;
  maxHp = 0;
  phase = 0;
  private age = 0;
  private baseY = 0;
  /** 현재 발사 목록 각각의 다음 발사 시각 */
  private nextFireAt: number[] = [];
  private holdStartedAt = -1;

  /** hpMul: 섹터 깊이와 엘리트 여부에 따른 체력 배율 */
  spawn(def: EnemyDef, x: number, y: number, hpMul = 1) {
    this.def = def;
    this.maxHp = Math.ceil(def.hp * hpMul);
    this.hp = this.maxHp;
    this.age = 0;
    this.baseY = y;
    this.holdStartedAt = -1;
    this.phase = 0;
    this.resetFireTimers();
    this.setTexture(def.texture);
    this.enableBody(true, x, y, true, true);
    this.body!.setSize(this.width, this.height);
    this.setVelocity(-def.move.speed, 0);
    this.clearTint();
  }

  get fires(): FireDef[] {
    if (this.def.phases) return this.def.phases[this.phase].fires;
    return this.def.fire ? [this.def.fire] : [];
  }

  private resetFireTimers() {
    this.nextFireAt = this.fires.map((f) => this.age + f.firstDelayMs);
  }

  kill() {
    this.disableBody(true, true);
  }

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
      case 'boss':
        if (this.holdStartedAt < 0 && this.x <= m.holdX) {
          this.holdStartedAt = this.age;
          this.setVelocity(0, 0);
        }
        if (this.holdStartedAt >= 0) {
          const t = (this.age - this.holdStartedAt) / 1000;
          this.y = this.baseY + Math.sin(t * m.frequency * Math.PI * 2) * m.amplitude;
        }
        break;
    }

    // 보스 페이즈 전환
    const phases = this.def.phases;
    if (phases && this.phase < phases.length - 1 && this.hp / this.maxHp <= phases[this.phase].untilHpPct) {
      this.phase++;
      this.resetFireTimers();
      host.onBossPhase?.(this, this.phase);
    }

    // 보스는 자리를 잡은 뒤부터 쏜다.
    const ready = m.kind === 'boss' ? this.holdStartedAt >= 0 : this.x < GAME_WIDTH - 8;
    if (ready) {
      this.fires.forEach((f, i) => {
        if (this.age >= this.nextFireAt[i]) {
          host.enemyFire(this, f);
          this.nextFireAt[i] = this.age + f.intervalMs;
        }
      });
    }

    if (this.x < -this.width || this.y < -64 || this.y > GAME_HEIGHT + 64) {
      this.kill();
    }
  }
}
