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
- `VITE_ADSENSE_TEST_MODE=true`: 방 코드 입력과 추리타임에 클릭되지 않는 테스트 광고 배너 표시
- `VITE_ADSENSE_CLIENT_ID`, `VITE_ADSENSE_DISPLAY_SLOT_ID`: 운영 AdSense Display 광고 ID (`VITE_ADSENSE_TEST_MODE=false`에서 사용)

## AdSense 운영 설정

운영 빌드는 `.env.production`의 게시자 ID로 AdSense 스크립트를 페이지의 `<head>`에 한 번 로드합니다.
기존 배너 위치에 광고를 표시하려면 AdSense에서 디스플레이 광고 단위를 생성한 뒤,
광고 코드의 `data-ad-slot` 값을 `VITE_ADSENSE_DISPLAY_SLOT_ID`에 설정하고 다시 빌드해야 합니다.
게시자 스크립트만으로는 해당 배너 광고 단위가 지정되지 않습니다.
운영 모드에서 광고 ID가 누락되면 배너를 숨기며, 개발 환경에서는 기존 테스트 배너를 표시합니다.
실제 송출 여부는 AdSense의 사이트 승인 및 광고 제공 상태에 따라 달라집니다.
