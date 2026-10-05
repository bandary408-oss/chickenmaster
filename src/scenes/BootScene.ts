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

    bake('bullet_enemy_large', 14, 14, () => {
      g.fillStyle(COLORS.enemyBullet).fillCircle(7, 7, 7);
      g.fillStyle(0xffffff).fillCircle(7, 7, 4);
    });

    bake('graze', 3, 3, () => g.fillStyle(0xffffff).fillRect(0, 0, 3, 3));

    bake('enemy_spinner', 28, 28, () => {
      g.fillStyle(COLORS.enemyBodyHeavy).fillCircle(14, 14, 14);
      g.fillStyle(COLORS.enemyBody).fillCircle(14, 14, 9);
      g.fillStyle(COLORS.enemyBullet).fillCircle(14, 14, 4);
    });

    // 섹터 보스: 강철 수탉 MK-I (왼쪽을 바라보는 거대 닭 메카)
    bake('enemy_boss_rooster', 84, 72, () => {
      g.fillStyle(COLORS.enemyBodyHeavy).fillRect(20, 22, 54, 38); // 몸통
      g.fillStyle(COLORS.enemyBody).fillRect(26, 26, 42, 30);
      g.fillStyle(0x3a4466).fillTriangle(74, 18, 84, 30, 74, 52).fillTriangle(70, 10, 82, 14, 72, 30); // 꽁지 날개
      g.fillStyle(COLORS.enemyBody).fillRect(8, 8, 24, 22); // 머리
      g.fillStyle(0xff4f78).fillTriangle(10, 8, 16, 0, 20, 8).fillTriangle(18, 8, 24, 0, 28, 8); // 볏
      g.fillStyle(0xffd23f).fillTriangle(0, 18, 8, 14, 8, 22); // 부리
      g.fillStyle(0xff4f78).fillRect(8, 22, 5, 7); // 턱살
      g.fillStyle(0xffffff).fillRect(13, 13, 5, 5);
      g.fillStyle(0xff4f78).fillRect(14, 14, 3, 3); // 눈
      g.fillStyle(0x8b9bb4).fillRect(30, 60, 6, 12).fillRect(54, 60, 6, 12); // 다리
      g.fillStyle(COLORS.enemyBullet).fillCircle(46, 41, 7); // 코어
      g.fillStyle(0xffffff).fillCircle(46, 41, 3);
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

    // --- 플레이어 탄 (주무기별) ---
    bake('bullet_laser', 18, 3, () => {
      g.fillStyle(0x7cf7ff).fillRect(0, 0, 18, 3);
      g.fillStyle(0xffffff).fillRect(2, 1, 14, 1);
    });
    bake('bullet_pellet', 4, 4, () => g.fillStyle(0xffe58a).fillRect(0, 0, 4, 4));
    bake('bullet_missile', 9, 5, () => {
      g.fillStyle(0xdfe7f5).fillRect(0, 0, 7, 5);
      g.fillStyle(0xff8a3d).fillTriangle(7, 0, 9, 2.5, 7, 5);
    });

    // --- 메카 외형 레이어 (기획서 5.2.1) ---
    const hull = 0x2ce8f5;
    const hullDark = 0x1a8f99;
    bake('hitbox', 6, 6, () => g.fillStyle(0xffffff).fillCircle(3, 3, 3));
    // 몸통 = 장갑
    bake('mech_body_none', 20, 14, () => {
      g.fillStyle(hull).fillTriangle(0, 0, 20, 7, 0, 14);
    });
    bake('mech_body_light', 22, 10, () => {
      g.fillStyle(hull).fillTriangle(0, 0, 22, 5, 0, 10);
      g.fillStyle(0xffffff).fillRect(10, 4, 6, 1);
    });
    bake('mech_body_heavy', 26, 20, () => {
      g.fillStyle(hullDark).fillRect(0, 2, 18, 16);
      g.fillStyle(hull).fillRect(2, 0, 16, 20);
      g.fillStyle(hull).fillTriangle(18, 0, 26, 10, 18, 20);
      g.fillStyle(hullDark).fillRect(4, 3, 12, 2).fillRect(4, 15, 12, 2);
    });
    bake('mech_body_reactive', 24, 16, () => {
      g.fillStyle(hull).fillTriangle(0, 0, 24, 8, 0, 16);
      // 반응 장갑판
      g.fillStyle(0xff8a3d).fillRect(1, 1, 5, 3).fillRect(1, 12, 5, 3).fillRect(7, 3, 4, 2).fillRect(7, 11, 4, 2);
    });
    // 무장 = 주무기
    bake('mech_wpn_none', 6, 4, () => g.fillStyle(0x8b9bb4).fillRect(0, 0, 6, 4));
    bake('mech_wpn_vulcan', 16, 6, () => {
      g.fillStyle(0x8b9bb4).fillRect(0, 0, 8, 6);
      g.fillStyle(0xdfe7f5).fillRect(8, 1, 8, 1).fillRect(8, 3, 8, 1).fillRect(8, 5, 8, 1);
    });
    bake('mech_wpn_laser', 20, 4, () => {
      g.fillStyle(0x8b9bb4).fillRect(0, 0, 16, 4);
      g.fillStyle(0x7cf7ff).fillRect(16, 0, 4, 4);
    });
    bake('mech_wpn_shotgun', 12, 8, () => {
      g.fillStyle(0x8b9bb4).fillRect(0, 1, 8, 6);
      g.fillStyle(0xffe58a).fillRect(8, 0, 4, 8);
    });
    bake('mech_wpn_missile', 12, 10, () => {
      g.fillStyle(0x8b9bb4).fillRect(0, 0, 12, 10);
      g.fillStyle(0xff8a3d).fillRect(9, 1, 3, 2).fillRect(9, 4, 3, 2).fillRect(9, 7, 3, 2);
    });
    // 추진기 = 부스터
    bake('mech_boost_none', 4, 6, () => g.fillStyle(0x5d6b85).fillRect(0, 0, 4, 6));
    bake('mech_boost_dash', 10, 12, () => {
      g.fillStyle(0x5d6b85).fillRect(2, 0, 8, 12);
      g.fillStyle(0x3a4466).fillRect(0, 2, 2, 8);
    });
    bake('mech_boost_hover', 8, 18, () => {
      g.fillStyle(0x5d6b85).fillRect(2, 0, 6, 4).fillRect(2, 14, 6, 4).fillRect(4, 4, 2, 10);
      g.fillStyle(0x7cf7ff).fillRect(0, 1, 2, 2).fillRect(0, 15, 2, 2);
    });
    // 보조무기
    bake('sub_drone', 8, 6, () => {
      g.fillStyle(0xdfe7f5).fillTriangle(0, 0, 8, 3, 0, 6);
      g.fillStyle(hull).fillRect(1, 2, 2, 2);
    });
    bake('sub_shieldbit', 8, 8, () => {
      g.lineStyle(1, 0x7cf7ff).strokeCircle(4, 4, 3.5);
      g.fillStyle(0xffffff).fillCircle(4, 4, 1.5);
    });

    bake('spark', 2, 2, () => g.fillStyle(0xffffff).fillRect(0, 0, 2, 2));

    g.destroy();
    this.scene.start('Title');
  }
}
