import Phaser from 'phaser';
import { COLORS, ENEMY_BULLET_POOL, GAME_HEIGHT, GAME_WIDTH, PLAYER } from '../config';
import enemyDefs from '../data/enemies.json';
import stage0 from '../data/stage0.json';
import type { EnemyDef, StageDef, WaveDef } from '../data/types';
import { Bullet, createBulletGroup, spawnBullet, type BulletStyle } from '../objects/Bullet';
import { Enemy, type EnemyHost } from '../objects/Enemy';
import { Player } from '../objects/Player';
import { computeStats, loadLoadout } from '../parts/Loadout';
import type { PlayerBulletKind } from '../parts/types';
import { firePattern, getPattern } from '../systems/BulletPatterns';
import { SubWeapons } from '../systems/SubWeapons';
import { Hud } from '../ui/Hud';

const ENEMIES = enemyDefs as Record<string, EnemyDef>;
const STAGE = stage0 as StageDef;

type Star = { obj: Phaser.GameObjects.Image; speed: number };

const PLAYER_BULLET_STYLES: Record<PlayerBulletKind, BulletStyle> = {
  vulcan: { texture: 'bullet_player', radius: 2 },
  laser: { texture: 'bullet_laser', radius: 2 },
  pellet: { texture: 'bullet_pellet', radius: 2 },
  missile: { texture: 'bullet_missile', radius: 3 },
};

// 핵심 루프: 이동, 사격, 적 웨이브, 탄막, 그레이즈, 피격, 게임 오버.
export class GameScene extends Phaser.Scene implements EnemyHost {
  private player!: Player;
  private subWeapons!: SubWeapons;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private grazeFx!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hud!: Hud;
  private stars: Star[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private focusKey!: Phaser.Input.Keyboard.Key;
  private fireKey!: Phaser.Input.Keyboard.Key;

  private stageTime = 0;
  private waveIndex = 0;
  private nextShotAt = 0;
  private score = 0;
  private graze = 0;
  private gameOver = false;

  constructor() {
    super('Game');
  }

  create() {
    this.stars = [];
    this.stageTime = 0;
    this.waveIndex = 0;
    this.nextShotAt = 0;
    this.score = 0;
    this.graze = 0;
    this.gameOver = false;
    // 게임 오버로 멈춘 물리 월드는 씬을 다시 시작해도 멈춘 채 남는다.
    this.physics.resume();

    this.createStarfield();

    this.playerBullets = createBulletGroup(this, 'bullet_player', 240, 2);
    this.enemyBullets = createBulletGroup(this, 'bullet_enemy', ENEMY_BULLET_POOL, 2);
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 48, runChildUpdate: false });

    const stats = computeStats(loadLoadout(this.registry));
    this.player = new Player(this, GAME_WIDTH * 0.2, GAME_HEIGHT / 2, stats);
    // 물리 이동이 확정된 뒤(postupdate) 외형을 판정 위치에 맞춘다.
    const sync = () => this.player.syncView();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
    // 씬 이벤트 리스너는 재시작해도 남으므로 직접 정리한다.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, sync));

    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: 350,
      scale: { start: 1.5, end: 0 },
      tint: [0xffd23f, 0xff4f78, 0xffffff],
      emitting: false,
    });
    this.grazeFx = this.add.particles(0, 0, 'graze', {
      speed: { min: 20, max: 60 },
      lifespan: 200,
      alpha: { start: 0.9, end: 0 },
      scale: { start: 1, end: 0.3 },
      emitting: false,
    });

    this.subWeapons = new SubWeapons(
      this, this.player, stats.subs, stats.extraDrones, this.playerBullets, this.enemyBullets,
      (x, y) => this.sparks.explode(2, x, y),
    );

    this.physics.add.overlap(this.playerBullets, this.enemies, (b, e) =>
      this.onPlayerBulletHitsEnemy(b as Bullet, e as Enemy),
    );
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => this.onPlayerHit(b as Bullet));
    this.physics.add.overlap(this.player, this.enemies, () => this.onPlayerHit(null));

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd;
    this.focusKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.fireKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    kb.on('keydown-ESC', () => this.scene.start('Title'));

    this.hud = new Hud(this);
    this.hud.update(this.player.hp, this.player.stats.maxHp, this.score, this.graze);
  }

  update(time: number, delta: number) {
    this.updateStarfield(delta);
    if (this.gameOver) return;

    this.updateWaves(delta);
    this.updatePlayer(time);
    this.subWeapons.update(time, delta, this.fireKey.isDown);
    this.steerHomingBullets(delta);
    this.enemies.getChildren().forEach((e) => (e as Enemy).tick(delta, this));
    this.checkGraze();
    this.hud.update(this.player.hp, this.player.stats.maxHp, this.score, this.graze);
  }

  // --- 적 ---

  enemyFire(enemy: Enemy) {
    firePattern(this, this.enemyBullets, getPattern(enemy.def.fire!.pattern), enemy, this.player);
  }

  private updateWaves(delta: number) {
    this.stageTime += delta;
    const waves = STAGE.waves;
    while (this.waveIndex < waves.length && this.stageTime >= waves[this.waveIndex].atMs) {
      this.launchWave(waves[this.waveIndex]);
      this.waveIndex++;
    }
    // 2단계에서는 스테이지 끝이 없으므로 웨이브를 반복한다.
    if (this.stageTime >= STAGE.loopAfterMs) {
      this.stageTime = 0;
      this.waveIndex = 0;
    }
  }

  private launchWave(w: WaveDef) {
    const def = ENEMIES[w.type];
    if (!def) throw new Error(`Unknown enemy type: ${w.type}`);
    for (let i = 0; i < w.count; i++) {
      this.time.delayedCall(w.gapMs * i, () => {
        if (this.gameOver) return;
        const ratio = w.y === 'random' ? Phaser.Math.FloatBetween(0.1, 0.9) : w.y;
        const enemy = this.enemies.get() as Enemy | null;
        enemy?.spawn(def, GAME_WIDTH + 24, GAME_HEIGHT * ratio);
      });
    }
  }

  private onPlayerBulletHitsEnemy(bullet: Bullet, enemy: Enemy) {
    if (!bullet.active || !enemy.active || bullet.hitTargets.has(enemy)) return;
    // 관통탄은 맞힌 적을 기억하고 계속 날아간다.
    if (bullet.pierce > 0) {
      bullet.pierce--;
      bullet.hitTargets.add(enemy);
    } else {
      bullet.kill();
    }
    if (enemy.takeDamage(bullet.damage) === 'dead') {
      this.score += enemy.def.score;
      this.sparks.explode(enemy.def.hp >= 10 ? 40 : 12, enemy.x, enemy.y);
      enemy.kill();
    }
  }

  // --- 플레이어 ---

  private updatePlayer(time: number) {
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    this.player.move(Number(right) - Number(left), Number(down) - Number(up), this.focusKey.isDown, time);

    if (this.fireKey.isDown && time >= this.nextShotAt) {
      this.fireMainWeapon();
      this.nextShotAt = time + this.player.stats.weapon.intervalMs / this.player.stats.fireRateMul;
    }
  }

  private fireMainWeapon() {
    const w = this.player.stats.weapon;
    const style = PLAYER_BULLET_STYLES[w.bullet];
    const motion = { pierce: w.pierce, rangePx: w.rangePx, homing: w.homing };
    const damage = w.damage * this.player.damageMul;
    const spread = Phaser.Math.DegToRad(w.spreadDeg);
    const { x, y } = this.player.muzzle;
    for (let i = 0; i < w.count; i++) {
      const a = w.count === 1 ? 0 : spread * (i / (w.count - 1) - 0.5);
      spawnBullet(this.playerBullets, x, y, a, w.speed, damage, style, motion);
    }
  }

  /** 유도탄은 가장 가까운 적을 향해 조금씩 돈다. */
  private steerHomingBullets(delta: number) {
    const dt = delta / 1000;
    const enemies = this.enemies.getChildren().filter((e) => e.active) as Enemy[];
    if (enemies.length === 0) return;
    this.playerBullets.getChildren().forEach((c) => {
      const b = c as Bullet;
      if (!b.active || b.homing <= 0) return;
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of enemies) {
        const d = Phaser.Math.Distance.Squared(b.x, b.y, e.x, e.y);
        if (e.x > b.x - 40 && d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) b.steer(Phaser.Math.Angle.Between(b.x, b.y, best.x, best.y), dt);
    });
  }

  private onPlayerHit(bullet: Bullet | null) {
    const damage = bullet ? PLAYER.bulletHitDamage : PLAYER.bodyHitDamage;
    if (!this.player.hurt(damage, this.time.now)) return;
    bullet?.kill();
    this.clearEnemyBulletsNear(this.player.x, this.player.y, this.player.stats.hitClearRadius);
    if (!this.player.alive) this.onGameOver();
  }

  /** 적탄이 히트박스를 아슬아슬하게 스치면 탄마다 한 번씩 그레이즈로 센다. */
  private checkGraze() {
    if (!this.player.alive) return;
    const px = this.player.x;
    const py = this.player.y;
    const r2 = this.player.stats.grazeRadius * this.player.stats.grazeRadius;
    const list = this.enemyBullets.getChildren();
    for (let i = 0; i < list.length; i++) {
      const b = list[i] as Bullet;
      if (!b.active || b.grazed) continue;
      const dx = b.x - px;
      const dy = b.y - py;
      if (dx * dx + dy * dy <= r2) {
        b.grazed = true;
        this.graze++;
        this.score += 10;
        this.grazeFx.explode(3, (px + b.x) / 2, (py + b.y) / 2);
      }
    }
  }

  private clearEnemyBulletsNear(x: number, y: number, radius: number) {
    this.enemyBullets.getChildren().forEach((c) => {
      const b = c as Bullet;
      if (b.active && Phaser.Math.Distance.Between(x, y, b.x, b.y) <= radius) {
        this.sparks.explode(2, b.x, b.y);
        b.kill();
      }
    });
  }

  private onGameOver() {
    this.gameOver = true;
    this.sparks.explode(60, this.player.x, this.player.y);
    this.player.explode();
    this.hud.update(0, this.player.stats.maxHp, this.score, this.graze);
    this.physics.pause();

    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, GAME_HEIGHT * 0.42, 'GAME OVER', { fontFamily: 'monospace', fontSize: '28px', color: COLORS.accent })
      .setOrigin(0.5)
      .setDepth(200);
    this.add
      .text(cx, GAME_HEIGHT * 0.56, 'Z: RETRY   ESC: TITLE', { fontFamily: 'monospace', fontSize: '12px', color: COLORS.text })
      .setOrigin(0.5)
      .setDepth(200);

    // 사격 버튼을 누른 채 죽어도 바로 재시작되지 않도록 잠깐 기다린다.
    this.time.delayedCall(600, () => this.input.keyboard?.once('keydown-Z', () => this.scene.restart()));
  }

  // --- 배경 ---

  private createStarfield() {
    for (let i = 0; i < 120; i++) {
      const near = i % 3 === 0;
      const obj = this.add
        .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
        .setTint(near ? COLORS.starNear : COLORS.starFar)
        .setScale(near ? 2 : 1);
      this.stars.push({ obj, speed: near ? 90 : 30 });
    }
  }

  private updateStarfield(delta: number) {
    const dt = delta / 1000;
    for (const s of this.stars) {
      s.obj.x -= s.speed * dt;
      if (s.obj.x < 0) {
        s.obj.x += GAME_WIDTH;
        s.obj.y = Phaser.Math.Between(0, GAME_HEIGHT);
      }
    }
  }
}
