import Phaser from 'phaser';
import { COLORS } from '../config';

// 에셋이 없는 동안은 도형으로 플레이스홀더 텍스처를 만들어 쓴다.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.make.graphics({}, false);

    // 플레이어 메카 플레이스홀더 (오른쪽을 향한 쐐기 + 코어)
    g.fillStyle(COLORS.player);
    g.fillTriangle(0, 0, 24, 8, 0, 16);
    g.fillStyle(0xffffff);
    g.fillRect(6, 6, 4, 4);
    g.generateTexture('player', 24, 16);
    g.clear();

    // 별 (배경용)
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('star', 1, 1);
    g.destroy();

    this.scene.start('Title');
  }
}
