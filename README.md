# Chicken Master

메카 파츠를 하나씩 업그레이드하는 로그라이크 횡스크롤 탄막 슈팅 게임.
Phaser 3 + TypeScript + Vite.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 검사 후 dist/ 에 빌드
```

## 조작 (현재)

| 입력 | 동작 |
|---|---|
| 방향키 / WASD | 이동 |
| Z (홀드) | 사격 / 타이틀에서 새 런 시작 / 메뉴에서 결정 |
| Shift | 정밀 이동(감속) + 히트박스 표시 |
| C | 오버드라이브 (게이지가 차면 5초간 화력 1.5배·연사 2배, 발동 순간 적탄 소거) |
| M | 소리 켜기/끄기 |
| Esc | 타이틀로 돌아가기 |
| B (타이틀) | 설계실: 설계도로 파츠·시작 장비 해금 |
| G (타이틀) | 격납고: ↑↓ 슬롯, ←→ 파츠 교체, Q/E 레벨, Z 시험 비행 (끝없는 연습 스테이지) |
| P (타이틀) | 패턴 실험실: ←/→로 패턴 전환, Space로 1,000발 이상 부하 테스트 |

## 런 흐름

타이틀(Z) → 섹터 지도 → 노드 선택 → 전투 / 엘리트 / 정비소 / 이벤트 → 보상(파츠 3개 중 1개) → 지도 … → 섹터 보스 → 런 종료.
체력은 스테이지 사이에 회복되지 않고, 죽으면 런이 통째로 끝난다. 런이 끝나면 설계도 포인트를 받아 설계실에서 새 파츠(보상 풀)와 시작 코어·무기를 해금한다. 해금 상태는 브라우저 localStorage에 저장된다. Lv3 파츠가 다시 나오면 개조형 둘 중 하나로 바꿀 수 있다.

## 구조

```
src/
  main.ts          Phaser 게임 설정
  config.ts        해상도(640×360), 색상, 플레이어 기본 성능
  data/
    enemies.json   적 종류별 체력, 점수, 이동, 사용할 탄막 패턴
    parts.json     메카 파츠 16종 (슬롯, 태그, 레벨별 성능, 외형, 설명)
    synergies.json 태그 시너지 (같은 태그 2개/4개 장착 보너스)
    patterns.json  탄막 패턴 (조준, 부채꼴, 원형, 나선, 랜덤, 가속·휘는 탄)
    stages.json    런 스테이지 (일반 3, 엘리트 1, 보스 1) 웨이브 타임라인
    stage_test.json 격납고 시험 비행용 무한 반복 스테이지
    events.json    이벤트 노드 텍스트와 선택지 효과
    unlocks.json   설계실 해금 목록과 비용
    types.ts       위 데이터의 타입
  meta/Meta.ts     설계도 포인트, 해금, 저장
  audio/Sfx.ts     WebAudio로 합성하는 효과음
  run/
    RunState.ts    런 상태 (기체, 체력, 스크랩, 지도, 진행)
    MapGen.ts      섹터 지도 생성 (7칸, 노드 종류, 연결)
    Rewards.ts     보상 후보 뽑기, 장착·강화·개조 적용
  parts/
    Loadout.ts     장착 상태 → 최종 성능 계산 (스탯 합산, 시너지, 외형)
    types.ts       파츠 관련 타입
  objects/
    MechView.ts    파츠별로 겹쳐 그리는 메카 외형
    Bullet.ts      풀링되는 탄 (플레이어 탄, 적탄 공용)
    Enemy.ts       적 이동(직진, 사인파, 정지 후 사격)과 발사 타이밍
    Player.ts      이동, 히트박스, 피격 무적 (성능은 Loadout에서)
  systems/
    BulletPatterns.ts  patterns.json을 읽어 탄을 뿌리는 발사기
    SubWeapons.ts  보조무기 (드론, 실드 비트, 측면 포탑)
  ui/Hud.ts        체력 바, 점수, 그레이즈
  scenes/
    BootScene.ts   플레이스홀더 텍스처 생성
    TitleScene.ts  타이틀 화면
    GameScene.ts   핵심 루프: 사격, 웨이브, 탄막, 그레이즈, 게임 오버
    MapScene.ts    섹터 지도, 정비소·이벤트 선택지
    RewardScene.ts 파츠 3택1 보상
    ChoiceScene.ts 선택지 공용 화면
    RunEndScene.ts 런 종료 요약, 설계도 정산
    BlueprintScene.ts 설계실
    GarageScene.ts 격납고 (파츠 장착 테스트)
    PatternLabScene.ts  탄막 패턴 확인용 실험실
```

적, 웨이브, 탄막 패턴을 바꾸려면 `src/data/*.json`만 고치면 된다.

### 탄막 패턴 필드 (`patterns.json`)

| 필드 | 기본값 | 뜻 |
|---|---|---|
| `aim` | `player` | `player`면 플레이어 조준, `fixed`면 `angleDeg` 방향(180 = 왼쪽) |
| `count`, `spreadDeg` | 1, 0 | 한 번에 쏘는 탄 수와 퍼지는 각도. 360이면 원형 |
| `speed`, `layers`, `speedStep` | 120, 1, 0 | 탄 속도. layers를 늘리면 같은 각도로 속도만 다른 줄이 겹친다 |
| `bursts`, `burstGapMs`, `rotateDegPerBurst` | 1, 0, 0 | 연속 발사 횟수, 간격, 회전(나선) |
| `reaimEachBurst` | false | 연속 발사마다 다시 조준 |
| `randomAngleDeg`, `randomSpeed` | 0, 0 | 각도·속도 흔들림 |
| `accel`, `maxSpeed`, `curveDegPerSec` | 0, ∞, 0 | 탄의 가속과 휘어짐 |
| `bullet` | `small` | `small` 또는 `large` |
