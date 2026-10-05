import Phaser from 'phaser';
import { COLORS } from '../config';

// 에셋이 없는 동안은 도형으로 플레이스홀더 텍스처를 만들어 쓴다.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.make.graphics({}, false);
    const bake = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    // 플레이어 메카 (오른쪽을 향한 쐐기 + 코어)
    bake('player', 24, 16, () => {
      g.fillStyle(COLORS.player).fillTriangle(0, 0, 24, 8, 0, 16);
      g.fillStyle(0xffffff).fillRect(10, 6, 4, 4);
    });

    bake('star', 1, 1, () => g.fillStyle(0xffffff).fillRect(0, 0, 1, 1));

    bake('bullet_player', 10, 3, () => g.fillStyle(COLORS.playerBullet, 0.85).fillRect(0, 0, 10, 3));

    // 적탄: 붉은 테두리 + 흰 심지. 배경 위에서 가장 눈에 띄어야 한다.
    bake('bullet_enemy', 8, 8, () => {
      g.fillStyle(COLORS.enemyBullet).fillCircle(4, 4, 4);
      g.fillStyle(0xffffff).fillCircle(4, 4, 2);
    });

    bake('enemy_dart', 16, 10, () => {
      g.fillStyle(COLORS.enemyBody).fillTriangle(0, 5, 16, 0, 16, 10);
    });

    bake('enemy_drone', 16, 16, () => {
      g.fillStyle(COLORS.enemyBody).fillPoints(
        [new Phaser.Math.Vector2(8, 0), new Phaser.Math.Vector2(16, 8), new Phaser.Math.Vector2(8, 16), new Phaser.Math.Vector2(0, 8)],
        true,
      );
      g.fillStyle(COLORS.enemyBullet).fillRect(6, 6, 4, 4);
    });

    bake('enemy_gunship', 40, 28, () => {
      g.fillStyle(COLORS.enemyBodyHeavy).fillRect(8, 4, 32, 20);
      g.fillStyle(COLORS.enemyBody).fillTriangle(0, 14, 10, 4, 10, 24);
      g.fillStyle(COLORS.enemyBullet).fillRect(14, 11, 6, 6);
    });

    bake('spark', 2, 2, () => g.fillStyle(0xffffff).fillRect(0, 0, 2, 2));

    g.destroy();
    this.scene.start('Title');
  }
}
