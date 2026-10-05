import Phaser from 'phaser';
import type { MechVisual } from '../parts/types';

/**
 * 파츠 장착에 따라 겹쳐 그리는 메카 외형 (기획서 5.2.1).
 * 추진기(부스터) → 몸통(장갑) → 무장(주무기) → 코어 발광 순서로 쌓는다.
 * 드론과 실드 비트는 SubWeapons가 따로 그린다.
 */
export class MechView extends Phaser.GameObjects.Container {
  private thruster: Phaser.GameObjects.Image;
  private flame: Phaser.GameObjects.Rectangle;
  private hull: Phaser.GameObjects.Image;
  private weapon: Phaser.GameObjects.Image;
  private core: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, visual: MechVisual) {
    super(scene, x, y);
    this.flame = scene.add.rectangle(0, 0, 6, 3, 0xffd23f);
    this.thruster = scene.add.image(0, 0, 'mech_boost_none');
    this.hull = scene.add.image(0, 0, 'mech_body_none');
    this.weapon = scene.add.image(0, 0, 'mech_wpn_none');
    this.core = scene.add.circle(0, 0, 2, 0xffffff);
    this.add([this.flame, this.thruster, this.hull, this.weapon, this.core]);
    scene.add.existing(this);
    this.apply(visual);

    scene.tweens.add({ targets: this.flame, scaleX: 1.8, alpha: 0.6, duration: 70, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: this.core, alpha: 0.45, duration: 420, yoyo: true, repeat: -1 });
  }

  apply(v: MechVisual) {
    this.hull.setTexture(`mech_body_${v.armor ?? 'none'}`);
    this.weapon.setTexture(`mech_wpn_${v.weapon ?? 'none'}`);
    this.thruster.setTexture(`mech_boost_${v.booster ?? 'none'}`);

    const bw = this.hull.width;
    // 무장은 몸통 아래 앞쪽(팔 위치), 추진기는 몸통 뒤에 붙인다.
    this.weapon.setPosition(bw * 0.2 + this.weapon.width * 0.3, this.hull.height * 0.3);
    this.thruster.setPosition(-bw / 2 - this.thruster.width / 2 + 2, 0);
    this.flame.setPosition(this.thruster.x - this.thruster.width / 2 - 2, 0);
    this.flame.setFillStyle(v.booster === 'dash' ? 0xff8a3d : 0xffd23f);
    this.flame.setSize(v.booster === 'dash' ? 9 : 6, v.booster === 'hover' ? 2 : 3);
    this.flame.setOrigin(1, 0.5);
    this.core.setFillStyle(v.coreColor);
    this.core.setPosition(-2, -1);
  }

  /** 총구 위치 (월드 좌표 기준 오프셋) */
  get muzzleOffset() {
    return { x: (this.weapon.x + this.weapon.width / 2) * this.scaleX, y: this.weapon.y * this.scaleY };
  }
}
