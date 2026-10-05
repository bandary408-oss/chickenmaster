import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, PLAYER } from '../config';
import enemyDefs from '../data/enemies.json';
import stage0 from '../data/stage0.json';
import type { EnemyDef, StageDef, WaveDef } from '../data/types';
import { Bullet, createBulletGroup, spawnBullet } from '../objects/Bullet';
import { Enemy, type EnemyHost } from '../objects/Enemy';
import { Player } from '../objects/Player';
import { Hud } from '../ui/Hud';

const ENEMIES = enemyDefs as Record<string, EnemyDef>;
const STAGE = stage0 as StageDef;

type Star = { obj: Phaser.GameObjects.Image; speed: number };

// 2단계 핵심 루프: 이동, 사격, 적 웨이브, 적탄, 피격, 게임 오버.
export class GameScene extends Phaser.Scene implements EnemyHost {
  private player!: Player;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
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
    this.gameOver = false;
    // 게임 오버로 멈춘 물리 월드는 씬을 다시 시작해도 멈춘 채 남는다.
    this.physics.resume();

    this.createStarfield();

    this.playerBullets = createBulletGroup(this, 'bullet_player', 64, 2);
    this.enemyBullets = createBulletGroup(this, 'bullet_enemy', 600, 2);
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: 48, runChildUpdate: false });

    this.player = new Player(this, GAME_WIDTH * 0.2, GAME_HEIGHT / 2);

    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: 350,
      scale: { start: 1.5, end: 0 },
      tint: [0xffd23f, 0xff4f78, 0xffffff],
      emitting: false,
    });

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
    this.hud.update(this.player.hp, this.score);
  }

  update(time: number, delta: number) {
    this.updateStarfield(delta);
    if (this.gameOver) return;

    this.updateWaves(delta);
    this.updatePlayer(time);
    this.enemies.getChildren().forEach((e) => (e as Enemy).tick(delta, this));
    this.hud.update(this.player.hp, this.score);
  }

  // --- 적 ---

  enemyFire(enemy: Enemy) {
    const f = enemy.def.fire!;
    const base = f.aimed
      ? Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
      : Math.PI;
    const spread = Phaser.Math.DegToRad(f.spreadDeg);
    for (let i = 0; i < f.count; i++) {
      const t = f.count === 1 ? 0 : i / (f.count - 1) - 0.5;
      const a = base + spread * t;
      spawnBullet(this.enemyBullets, enemy.x, enemy.y, Math.cos(a) * f.speed, Math.sin(a) * f.speed);
    }
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
    if (!bullet.active || !enemy.active) return;
    bullet.kill();
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
      spawnBullet(this.playerBullets, this.player.x + 12, this.player.y, PLAYER.bulletSpeed, 0, PLAYER.bulletDamage);
      this.nextShotAt = time + PLAYER.fireIntervalMs;
    }
  }

  private onPlayerHit(bullet: Bullet | null) {
    const damage = bullet ? PLAYER.bulletHitDamage : PLAYER.bodyHitDamage;
    if (!this.player.hurt(damage, this.time.now)) return;
    bullet?.kill();
    this.clearEnemyBulletsNear(this.player.x, this.player.y, PLAYER.hitClearRadius);
    if (!this.player.alive) this.onGameOver();
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
    this.hud.update(0, this.score);
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
