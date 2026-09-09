# NOOPI Frontend

모임에서 QR 또는 Room Code로 참가해 함께 즐기는 모바일 우선 실시간 게임 웹앱입니다. 현재는 라이어 게임의 전체 흐름을 Mock API/Realtime으로 실행할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

기본값은 Mock 모드입니다. 참가 흐름의 Room Code는 `NOOPI1`입니다.

```bash
npm run lint
npm run build
```

## Mock 시나리오

Room 화면 우측 하단의 `Mock Lab`을 열어 게임 시작 전에 시나리오를 선택합니다.

- 시민 승리: 라이어 검거 후 Mock 라이어가 오답 제출
- 시민 오지목: 시민을 지목해 라이어 즉시 승리
- 내가 라이어: 마지막 추측 입력 UI와 정답/오답 판정 (`별빛 캠핑`이 정답)
- 반복 동률: 두 번 연속 동률 후 다음 재투표에서 단독 지목
- 연결 끊김 재현: Player 연결 끊김/재접속 이벤트와 state resync

카테고리와 제시어 fixture는 Mock 서버 계층 안에만 있으며 Product UI에는 하드코딩되어 있지 않습니다.

## 환경 변수

`.env.example`을 참고하세요.

- `VITE_USE_MOCK_API=false`: 실제 HTTP/WebSocket Adapter 사용
- `VITE_API_BASE_URL`: REST API base URL
- `VITE_WS_URL`: WebSocket URL

실제 Backend 연결 전에는 API_SPEC에 정의되지 않은 게임 종료 후 `같은 게임 다시하기 / 다른 게임 선택 / 방 종료` 계약을 먼저 확정해야 합니다.
