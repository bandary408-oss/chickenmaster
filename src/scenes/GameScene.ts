import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';

const PLAYER_SPEED = 160;
const PLAYER_SPEED_FOCUS = 70;

type Star = { obj: Phaser.GameObjects.Image; speed: number };

// 1단계 뼈대: 스크롤 배경 위에서 메카가 움직이기만 한다.
// 사격, 적, 피격은 2단계(핵심 루프)에서 추가한다.
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private stars: Star[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private focusKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('Game');
  }

  create() {
    this.stars = [];
    this.createStarfield();

    this.player = this.physics.add.image(GAME_WIDTH * 0.2, GAME_HEIGHT / 2, 'player');
    this.player.setCollideWorldBounds(true);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as typeof this.wasd;
    this.focusKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    kb.on('keydown-ESC', () => this.scene.start('Title'));

    this.add.text(4, 4, 'STAGE 0 - SKELETON', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: COLORS.text,
    });
  }

  update(_time: number, delta: number) {
    this.updateStarfield(delta);
    this.updatePlayer();
  }

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

  private updatePlayer() {
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    const dir = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    const speed = this.focusKey.isDown ? PLAYER_SPEED_FOCUS : PLAYER_SPEED;
    dir.normalize().scale(speed);
    this.player.setVelocity(dir.x, dir.y);
  }
}
