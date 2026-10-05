import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { PatternLabScene } from './scenes/PatternLabScene';
import { GarageScene } from './scenes/GarageScene';
import { MapScene } from './scenes/MapScene';
import { RewardScene } from './scenes/RewardScene';
import { ChoiceScene } from './scenes/ChoiceScene';
import { RunEndScene } from './scenes/RunEndScene';
import { BlueprintScene } from './scenes/BlueprintScene';
import { initSfx, toggleMute } from './audio/Sfx';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH * RENDER_SCALE,
  height: GAME_HEIGHT * RENDER_SCALE,
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
  scene: [BootScene, TitleScene, MapScene, GameScene, RewardScene, ChoiceScene, RunEndScene, BlueprintScene, GarageScene, PatternLabScene],
});

// 모든 씬의 카메라가 640×360 세계를 2배로 보여 주게 한다 (config.ts RENDER_SCALE 참고).
function fitScene(scene: Phaser.Scene) {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  scene.physics?.world?.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
}
game.events.once(Phaser.Core.Events.READY, () => {
  initSfx(game);
  // M: 어느 화면에서든 소리 켜기/끄기
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') toggleMute();
  });
  for (const scene of game.scene.scenes) {
    // 카메라와 물리 월드는 씬이 시작될 때마다 새로 만들어지므로 매번 맞춘다.
    scene.sys.events.on(Phaser.Scenes.Events.CREATE, () => fitScene(scene));
    if (scene.sys.isActive()) fitScene(scene);
  }
});

// 개발 중 콘솔과 자동 테스트에서 상태를 들여다볼 수 있게 노출한다.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
