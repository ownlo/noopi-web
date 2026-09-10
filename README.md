# NOOPI Frontend

모임에서 QR 또는 Room Code로 참가해 함께 즐기는 모바일 우선 실시간 게임 웹앱입니다. 실제 Backend의 REST API와 WebSocket에 연결합니다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

로컬 Backend를 `localhost:8080`에서 실행한 후 사용합니다.

```bash
npm run lint
npm run build
```

## 환경 변수

`.env.example`을 참고하세요.

- `VITE_API_BASE_URL`: REST API base URL (`development`: `http://localhost:8080/api`, `production`: `https://api.noopi.kr/api`)
- `VITE_WS_URL`: WebSocket URL (`development`: `ws://localhost:8080/ws`, `production`: `wss://api.noopi.kr/ws`)
- `VITE_ADSENSE_TEST_MODE=true`: 추리타임에 클릭되지 않는 테스트 광고 배너 표시
- `VITE_ADSENSE_CLIENT_ID`, `VITE_ADSENSE_DISPLAY_SLOT_ID`: 운영 AdSense Display 광고 ID (`VITE_ADSENSE_TEST_MODE=false`에서 사용)
