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
| Z (홀드) | 사격 / 타이틀에서 시작 / 게임 오버 후 재시작 |
| Shift | 정밀 이동(감속) + 히트박스 표시 |
| Esc | 타이틀로 돌아가기 |
| P (타이틀) | 패턴 실험실: ←/→로 패턴 전환, Space로 1,000발 이상 부하 테스트 |

## 구조

```
src/
  main.ts          Phaser 게임 설정
  config.ts        해상도(640×360), 색상, 플레이어 기본 성능
  data/
    enemies.json   적 종류별 체력, 점수, 이동, 사용할 탄막 패턴
    patterns.json  탄막 패턴 (조준, 부채꼴, 원형, 나선, 랜덤, 가속·휘는 탄)
    stage0.json    웨이브 타임라인 (시간, 적 종류, 수, 높이)
    types.ts       위 데이터의 타입
  objects/
    Bullet.ts      풀링되는 탄 (플레이어 탄, 적탄 공용)
    Enemy.ts       적 이동(직진, 사인파, 정지 후 사격)과 발사 타이밍
    Player.ts      이동, 히트박스, 피격 무적
  systems/
    BulletPatterns.ts  patterns.json을 읽어 탄을 뿌리는 발사기
  ui/Hud.ts        체력 바, 점수, 그레이즈
  scenes/
    BootScene.ts   플레이스홀더 텍스처 생성
    TitleScene.ts  타이틀 화면
    GameScene.ts   핵심 루프: 사격, 웨이브, 탄막, 그레이즈, 게임 오버
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
