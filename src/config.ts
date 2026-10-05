// 게임 전역 상수. 기획서 3장: 640×360 픽셀아트, 정수 배율 확대.
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const COLORS = {
  background: 0x0b0d17,
  starFar: 0x3a4466,
  starNear: 0x8b9bb4,
  player: 0x2ce8f5,
  playerBullet: 0x9ff7fb,
  enemyBody: 0x8a6fb0,
  enemyBodyHeavy: 0x5d4a80,
  enemyBullet: 0xff4f78,
  hpBar: 0x3df27c,
  hpBarLow: 0xff4f78,
  hpBarBack: 0x262b44,
  text: '#e8ecf5',
  accent: '#ffd23f',
} as const;

// 플레이어 기본 성능. 4단계에서 파츠 스탯으로 대체된다.
export const PLAYER = {
  maxHp: 100,
  speed: 160,
  focusSpeed: 70,
  // 기획서 2장: 히트박스 4~6px. 지름 6px 원.
  hitboxRadius: 3,
  fireIntervalMs: 80,
  bulletSpeed: 480,
  bulletDamage: 1,
  invulnMs: 1500,
  // 피격 시 이 반경 안의 적탄을 지운다 (기획서 6장).
  hitClearRadius: 80,
  bulletHitDamage: 20,
  bodyHitDamage: 25,
  // 적탄 중심이 이 거리 안을 스치면 그레이즈 (기획서 6장)
  grazeRadius: 14,
} as const;

/** 적탄 풀 크기. 기획서 6장 목표: 1,000발에서 60fps. */
export const ENEMY_BULLET_POOL = 1500;
