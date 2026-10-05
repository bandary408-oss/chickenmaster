import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, COLORS } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { PatternLabScene } from './scenes/PatternLabScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, TitleScene, GameScene, PatternLabScene],
});

// 개발 중 콘솔과 자동 테스트에서 상태를 들여다볼 수 있게 노출한다.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
