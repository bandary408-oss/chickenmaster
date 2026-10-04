// 게임 전역 상수. 기획서 3장: 640×360 픽셀아트, 정수 배율 확대.
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const COLORS = {
  background: 0x0b0d17,
  starFar: 0x3a4466,
  starNear: 0x8b9bb4,
  player: 0x2ce8f5,
  enemyBullet: 0xff4f78,
  text: '#e8ecf5',
  accent: '#ffd23f',
} as const;
