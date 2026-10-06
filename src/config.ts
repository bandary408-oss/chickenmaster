// 게임 전역 상수. 기획서 3장: 640×360 픽셀아트, 정수 배율 확대.
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
/**
 * 실제 캔버스는 2배 해상도(1280×720)로 그리고, 카메라 줌 2로 640×360 세계를 보여 준다.
 * 픽셀아트는 그대로 두 배가 되고, 글자는 2배 해상도로 그려져 한글이 뭉개지지 않는다.
 */
export const RENDER_SCALE = 2;

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

// 플레이어 기본 성능. 파츠 스탯은 이 값 위에 더해진다 (src/parts/Loadout.ts).
export const PLAYER = {
  maxHp: 100,
  speed: 160,
  focusSpeed: 70,
  // 기획서 2장: 히트박스 4~6px. 지름 4px 원 (난이도 완화).
  hitboxRadius: 2,
  invulnMs: 2000,
  // 피격 시 이 반경 안의 적탄을 지운다 (기획서 6장).
  hitClearRadius: 110,
  bulletHitDamage: 12,
  bodyHitDamage: 15,
  // 적탄 중심이 이 거리 안을 스치면 그레이즈 (기획서 6장)
  grazeRadius: 16,
  /** 스테이지 클리어 때마다 회복하는 체력 */
  clearHeal: 15,
} as const;

/** 오버드라이브: 그레이즈와 처치로 게이지를 채우고 C로 발동 */
export const OVERDRIVE = {
  max: 100,
  perGraze: 4,
  perKill: 1,
  durationMs: 5000,
  damageMul: 1.5,
  fireRateMul: 2,
} as const;

/** 적탄 풀 크기. 기획서 6장 목표: 1,000발에서 60fps. */
export const ENEMY_BULLET_POOL = 1500;
