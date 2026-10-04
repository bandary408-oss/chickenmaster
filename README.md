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
| Shift | 정밀 이동(감속) |
| Z / Enter | 타이틀에서 시작 |
| Esc | 타이틀로 돌아가기 |

## 구조

```
src/
  main.ts          Phaser 게임 설정
  config.ts        해상도(640×360), 색상 상수
  scenes/
    BootScene.ts   플레이스홀더 텍스처 생성
    TitleScene.ts  타이틀 화면
    GameScene.ts   스크롤 배경 + 플레이어 이동
```
