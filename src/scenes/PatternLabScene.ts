import Phaser from 'phaser';
import { COLORS, ENEMY_BULLET_POOL, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../config';
import { createBulletGroup, spawnBullet } from '../objects/Bullet';
import { BULLET_STYLES, PATTERNS, firePattern } from '../systems/BulletPatterns';

// 탄막 패턴을 하나씩 돌려 보는 실험실. src/data/patterns.json을 고치고 여기서 확인한다.
export class PatternLabScene extends Phaser.Scene {
  private names: string[] = [];
  private index = 0;
  private pool!: Phaser.Physics.Arcade.Group;
  private source!: Phaser.GameObjects.Arc;
  private target!: Phaser.GameObjects.Arc;
  private info!: Phaser.GameObjects.Text;
  private nextFireAt = 0;
  private stress = false;
  private stressAngle = 0;

  constructor() {
    super('PatternLab');
  }

  create() {
    this.names = Object.keys(PATTERNS);
    this.index = 0;
    this.nextFireAt = 0;
    this.stress = false;
    this.pool = createBulletGroup(this, 'bullet_enemy', ENEMY_BULLET_POOL, 2);
    this.source = this.add.circle(GAME_WIDTH * 0.72, GAME_HEIGHT / 2, 8, COLORS.enemyBody);
    this.target = this.add.circle(GAME_WIDTH * 0.2, GAME_HEIGHT / 2, 4, COLORS.player);

    this.info = this.add
      .text(8, 8, '', { fontFamily: 'monospace', resolution: RENDER_SCALE, fontSize: '10px', color: COLORS.text, lineSpacing: 2, backgroundColor: '#0b0d17cc' })
      .setDepth(10);
    this.add
      .text(8, GAME_HEIGHT - 8, '←/→: PATTERN   SPACE: STRESS 1000+   ESC: TITLE', {
        fontFamily: 'monospace', resolution: RENDER_SCALE,
        fontSize: '8px',
        color: COLORS.text,
      })
      .setOrigin(0, 1);

    const kb = this.input.keyboard!;
    kb.on('keydown-RIGHT', () => this.select(this.index + 1));
    kb.on('keydown-LEFT', () => this.select(this.index - 1));
    kb.on('keydown-SPACE', () => {
      this.stress = !this.stress;
      this.clear();
    });
    kb.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private select(i: number) {
    this.index = Phaser.Math.Wrap(i, 0, this.names.length);
    this.stress = false;
    this.clear();
  }

  private clear() {
    this.time.removeAllEvents();
    this.pool.getChildren().forEach((b) => (b as Phaser.Physics.Arcade.Image).disableBody(true, true));
    this.nextFireAt = 0;
  }

  update(time: number) {
    // 조준 대상이 위아래로 움직여 조준탄이 따라오는지 볼 수 있게 한다.
    this.target.y = GAME_HEIGHT / 2 + Math.sin(time / 700) * 110;

    if (this.stress) {
      // 원형 60발을 0.1초마다 회전시키며 뿌려 풀을 가득 채운다.
      if (time >= this.nextFireAt) {
        this.stressAngle += 0.07;
        for (let i = 0; i < 60; i++) {
          const a = this.stressAngle + (Math.PI * 2 * i) / 60;
          spawnBullet(this.pool, GAME_WIDTH / 2, GAME_HEIGHT / 2, a, 45, 1, BULLET_STYLES.small);
        }
        this.nextFireAt = time + 100;
      }
    } else if (time >= this.nextFireAt) {
      const p = PATTERNS[this.names[this.index]];
      firePattern(this, this.pool, p, this.source, this.target);
      this.nextFireAt = time + Math.max(1200, p.bursts * p.burstGapMs + 700);
    }

    const label = this.stress ? 'STRESS TEST' : `${this.index + 1}/${this.names.length}  ${this.names[this.index]}`;
    this.info.setText([
      `PATTERN LAB   ${label}`,
      `BULLETS ${this.pool.countActive(true)}`,
      `FPS ${this.game.loop.actualFps.toFixed(0)}`,
    ]);
  }
}
