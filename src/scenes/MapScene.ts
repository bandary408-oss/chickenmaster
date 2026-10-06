import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import eventData from '../data/events.json';
import { computeStats, equippedList, getPart, maxLevel } from '../parts/Loadout';
import type { MapNode, NodeKind } from '../run/MapGen';
import { completeNode, endRun, getRun, reachableNodes, type RunState } from '../run/RunState';
import { UI_FONT, levelLabel } from '../ui/text';
import type { ChoiceOption, ChoiceSceneData } from './ChoiceScene';

interface EventDef {
  title: string;
  text: string;
  choices: { label: string; detail: string; effects: { hp?: number; scrap?: number; reward?: boolean } }[];
}
const EVENTS = eventData as Record<string, EventDef>;

const KIND_STYLE: Record<NodeKind, { color: number; label: string; name: string }> = {
  battle: { color: 0x8a6fb0, label: '전', name: '전투' },
  elite: { color: 0xff4f78, label: '엘', name: '엘리트 (희귀 파츠 확정)' },
  repair: { color: 0x3df27c, label: '정', name: '정비소' },
  event: { color: 0x7cf7ff, label: '?', name: '이벤트' },
  boss: { color: 0xffd23f, label: '보', name: '섹터 보스' },
};

const REPAIR_HP = 50;
const REPAIR_COST = 20;
const UPGRADE_COST = 60;

const MAP_X0 = 50;
const MAP_X1 = 590;
const MAP_Y0 = 78;
const MAP_Y1 = 262;

/** 섹터 지도: 다음에 갈 노드를 고른다 (기획서 4장, 7장) */
export class MapScene extends Phaser.Scene {
  private run!: RunState;
  private choices: number[] = [];
  private cursor = 0;
  private marker!: Phaser.GameObjects.Arc;
  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super('Map');
  }

  create() {
    const run = getRun(this.registry);
    if (!run) {
      this.scene.start('Title');
      return;
    }
    this.run = run;
    this.choices = reachableNodes(run);
    this.cursor = 0;

    const stats = computeStats(run.loadout);
    this.add.text(16, 10, `SECTOR ${run.sector}`, { ...UI_FONT, fontSize: '14px', color: COLORS.accent });
    this.add.text(GAME_WIDTH - 16, 12, `HP ${Math.ceil(run.hp)}/${stats.maxHp}   스크랩 ${run.scrap}   점수 ${run.score}`, {
      ...UI_FONT, fontSize: '10px',
    }).setOrigin(1, 0);

    this.drawMap();

    this.infoText = this.add.text(GAME_WIDTH / 2, 282, '', { ...UI_FONT, fontSize: '11px', color: COLORS.accent }).setOrigin(0.5, 0);
    const gear = equippedList(run.loadout).map((e) => `${getPart(e.id).name} ${levelLabel(e)}`).join(' · ');
    this.add.text(16, 304, `장착: ${gear}`, {
      ...UI_FONT, fontSize: '9px', wordWrap: { width: GAME_WIDTH - 32, useAdvancedWrap: true }, lineSpacing: 2,
    }).setAlpha(0.8);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 6, '↑↓ 경로 선택   Z 출발   ESC 런 포기', { ...UI_FONT, fontSize: '9px' })
      .setOrigin(0.5, 1).setAlpha(0.7);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-RIGHT', () => this.move(1));
    this.time.delayedCall(250, () => kb.on('keydown-Z', () => this.enter()));
    kb.on('keydown-ESC', () => {
      endRun(this.registry);
      this.scene.start('Title');
    });
    this.refresh();
  }

  private nodePos(n: MapNode) {
    const col = this.run.map.nodes.filter((m) => m.col === n.col);
    const t = col.length === 1 ? 0.5 : n.row / (col.length - 1);
    return {
      x: MAP_X0 + (n.col / (this.run.map.cols - 1)) * (MAP_X1 - MAP_X0),
      y: MAP_Y0 + t * (MAP_Y1 - MAP_Y0),
    };
  }

  private drawMap() {
    const { nodes } = this.run.map;
    const g = this.add.graphics();
    const visited = new Set(this.run.cleared);
    for (const n of nodes) {
      const a = this.nodePos(n);
      for (const id of n.next) {
        const b = this.nodePos(nodes[id]);
        const walked = visited.has(n.id) && visited.has(id);
        g.lineStyle(walked ? 2 : 1, walked ? 0xffd23f : 0x3a4466, walked ? 1 : 0.9).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    for (const n of nodes) {
      const { x, y } = this.nodePos(n);
      const st = KIND_STYLE[n.kind];
      const r = n.kind === 'boss' ? 15 : 11;
      const done = visited.has(n.id);
      const passed = !done && this.run.current !== null && n.col <= nodes[this.run.current].col;
      this.add.circle(x, y, r, done ? 0x262b44 : st.color, passed ? 0.25 : 1).setStrokeStyle(1, done ? 0xffd23f : 0x0b0d17);
      this.add.text(x, y, done ? '✓' : st.label, { ...UI_FONT, fontSize: n.kind === 'boss' ? '13px' : '10px', color: '#0b0d17' })
        .setOrigin(0.5)
        .setColor(done ? COLORS.accent : '#0b0d17');
    }
    if (this.run.current !== null) {
      const c = this.nodePos(nodes[this.run.current]);
      this.add.text(c.x, c.y - 22, '나', { ...UI_FONT, fontSize: '9px', color: COLORS.accent }).setOrigin(0.5);
    }
    this.marker = this.add.circle(0, 0, 16).setStrokeStyle(2, 0xffffff);
    this.tweens.add({ targets: this.marker, scale: 1.2, alpha: 0.5, duration: 400, yoyo: true, repeat: -1 });
  }

  private move(d: number) {
    this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.choices.length);
    sfx('select');
    this.refresh();
  }

  private refresh() {
    const n = this.run.map.nodes[this.choices[this.cursor]];
    const { x, y } = this.nodePos(n);
    this.marker.setPosition(x, y);
    const st = KIND_STYLE[n.kind];
    const detail = n.kind === 'event' ? EVENTS[n.ref!].title : n.ref ? '' : '';
    this.infoText.setText(`다음: ${st.name}${detail ? ` - ${detail}` : ''}`);
  }

  private enter() {
    const n = this.run.map.nodes[this.choices[this.cursor]];
    sfx('confirm');
    switch (n.kind) {
      case 'battle':
      case 'elite':
      case 'boss':
        this.scene.start('Game', { mode: 'run', nodeId: n.id });
        break;
      case 'repair':
        completeNode(this.run, n.id);
        this.scene.start('Choice', this.repairChoices());
        break;
      case 'event':
        completeNode(this.run, n.id);
        this.scene.start('Choice', this.eventChoices(EVENTS[n.ref!]));
        break;
    }
  }

  private status() {
    const max = computeStats(this.run.loadout).maxHp;
    return `HP ${Math.ceil(this.run.hp)}/${max}   스크랩 ${this.run.scrap}`;
  }

  private repairChoices(): ChoiceSceneData {
    const run = this.run;
    const max = computeStats(run.loadout).maxHp;
    const back = (s: Phaser.Scene) => s.scene.start('Map');
    const upgradable = equippedList(run.loadout).filter((e) => e.level < maxLevel(e.id));
    return {
      title: '정비소',
      status: this.status(),
      body: '"공구 냄새… 여기가 천국인가?"\n한 가지만 할 수 있다.',
      options: [
        {
          label: `수리: 체력 +${REPAIR_HP}`,
          detail: `스크랩 ${REPAIR_COST}`,
          disabledReason: run.scrap < REPAIR_COST ? `스크랩이 부족하다 (${REPAIR_COST} 필요)` : run.hp >= max ? '이미 멀쩡하다' : undefined,
          onPick: (s) => {
            run.scrap -= REPAIR_COST;
            run.hp = Math.min(max, run.hp + REPAIR_HP);
            back(s);
          },
        },
        {
          label: '파츠 강화: 장착한 파츠 하나 레벨 +1',
          detail: `스크랩 ${UPGRADE_COST}`,
          disabledReason:
            run.scrap < UPGRADE_COST ? `스크랩이 부족하다 (${UPGRADE_COST} 필요)` : upgradable.length === 0 ? '강화할 파츠가 없다' : undefined,
          onPick: (s) => {
            const options: ChoiceOption[] = upgradable.map((e) => ({
              label: `${getPart(e.id).name} Lv${e.level} → Lv${e.level + 1}`,
              onPick: (s2) => {
                run.scrap -= UPGRADE_COST;
                e.level++;
                back(s2);
              },
            }));
            s.scene.start('Choice', { title: '무엇을 강화할까?', status: this.status(), options });
          },
        },
        { label: '그냥 떠난다', detail: '체력 +20 (쉬어 가기)', onPick: (s) => ((run.hp = Math.min(max, run.hp + 20)), back(s)) },
      ],
    };
  }

  private eventChoices(ev: EventDef): ChoiceSceneData {
    const run = this.run;
    const max = computeStats(run.loadout).maxHp;
    return {
      title: ev.title,
      status: this.status(),
      body: ev.text,
      options: ev.choices.map((c) => ({
        label: c.label,
        detail: c.detail,
        disabledReason: c.effects.scrap && run.scrap + c.effects.scrap < 0 ? `스크랩이 부족하다 (${-c.effects.scrap} 필요)` : undefined,
        onPick: (s) => {
          const e = c.effects;
          if (e.scrap) run.scrap += e.scrap;
          if (e.hp) run.hp = Phaser.Math.Clamp(run.hp + e.hp, 1, max);
          if (e.reward) s.scene.start('Reward', { guaranteeRare: false, title: '고물상의 물건' });
          else s.scene.start('Map');
        },
      })),
    };
  }
}
