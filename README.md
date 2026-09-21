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

## PWA

운영 빌드는 Web App Manifest와 Service Worker를 등록합니다. 앱 셸과 정적
에셋만 캐시하며 Room/Game 서버 상태와 API 응답은 캐시하지 않습니다.
Service Worker 동작은 HTTPS 환경 또는 `localhost`의 production preview에서
확인할 수 있습니다.

## 환경 변수

`.env.example`을 참고하세요.

- `VITE_API_BASE_URL`: REST API base URL (`development`: `http://localhost:8080/api`, `production`: `https://api.noopi.kr/api`)
- `VITE_WS_URL`: WebSocket URL (`development`: `ws://localhost:8080/ws`, `production`: `wss://api.noopi.kr/ws`)

## AdSense 소유권 확인

입력, 대기, 게임 화면에는 광고나 AdSense 스크립트를 로드하지 않습니다.
소유권 확인용 `google-adsense-account` 메타 태그는 `index.html`의 `<head>`에 직접 포함하며,
`public/ads.txt`에는 동일한 게시자 ID를 선언합니다. 게시자 계정을 변경할 때는 두 파일의 ID를 함께 변경해야 합니다.
