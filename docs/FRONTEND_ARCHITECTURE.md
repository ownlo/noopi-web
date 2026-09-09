# NOOPI (누피) Frontend Architecture

## 1. 목적

이 문서는 NOOPI 모바일 웹 Frontend의 기술 구조와 구현 원칙을 정의한다.

Frontend 구현 시 다음 문서를 Source of Truth로 사용한다.

-   `SERVICE_SPEC.md`
-   `GAME_SESSION_SPEC.md`
-   `REALTIME_SPEC.md`
-   `API_SPEC.md`
-   `UI_SPEC.md`
-   `games/LIAR_GAME_SPEC.md`

Frontend는 서버가 결정한 Room/Game 상태를 표현하고 사용자의 행동을
서버에 전달하는 역할을 담당한다.

게임 규칙, 역할 배정, 투표 집계, 승패 판정을 Frontend에서 수행하지
않는다.

------------------------------------------------------------------------

# 2. 기술 스택

MVP 기준 권장 기술 스택:

``` text
Vite
React
TypeScript
React Router
TanStack Query
Zustand
WebSocket
CSS Modules 또는 일반 CSS
Vitest (필요한 핵심 로직만)
ESLint
Prettier
```

Next.js는 사용하지 않는다.

SSR은 필요하지 않다.

NOOPI는 모바일 웹이며 정적 Frontend 배포를 기본으로 한다.

------------------------------------------------------------------------

# 3. 핵심 아키텍처 원칙

## Server State와 Client State를 분리한다

Server State:

``` text
Room
Players
Host
GameSession
Game Phase
Role
Keyword
Vote State
Vote Result
Game Result
```

이 데이터는 Backend가 Source of Truth다.

TanStack Query 또는 이에 준하는 서버 상태 계층에서 관리한다.

Client State:

``` text
clientId
현재 입력 중인 nickname
현재 선택 중인 gender
투표 선택값
모달 상태
로컬 UI 상태
```

이 데이터는 Frontend가 관리할 수 있다.

서버 상태를 Zustand 등에 복제하여 두 개의 Source of Truth를 만들지
않는다.

------------------------------------------------------------------------

# 4. 권장 프로젝트 구조

``` text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── pages/
│   ├── HomePage/
│   ├── JoinRoomPage/
│   ├── CreateRoomPage/
│   └── RoomPage/
│
├── features/
│   ├── client/
│   ├── room/
│   ├── game-session/
│   └── games/
│       └── liar/
│
├── components/
│   ├── Button/
│   ├── Modal/
│   ├── PlayerAvatar/
│   ├── PlayerList/
│   ├── Loading/
│   └── ErrorMessage/
│
├── api/
│   ├── httpClient.ts
│   ├── apiError.ts
│   └── types.ts
│
├── realtime/
│   ├── websocketClient.ts
│   ├── realtimeEvents.ts
│   └── realtimeSync.ts
│
├── hooks/
│
├── store/
│   └── uiStore.ts
│
├── mocks/
│   ├── mockApi.ts
│   ├── mockRealtime.ts
│   ├── scenarios/
│   └── fixtures/
│
├── styles/
│   ├── global.css
│   └── tokens.css
│
├── utils/
│
└── main.tsx
```

게임별 코드는 반드시 `features/games/{game}` 아래로 분리한다.

향후:

``` text
features/games/
├── liar/
├── balance/
└── bomb/
```

처럼 확장할 수 있어야 한다.

------------------------------------------------------------------------

# 5. Room과 Game 코드 분리

Room 계층은 특정 게임의 규칙을 알지 않는다.

잘못된 예:

``` ts
if (room.gameType === 'LIAR') {
  calculateLiarVote()
}
```

Room은 다음 정도만 다룬다.

``` text
Room 정보
Player 목록
Host
현재 GameSession
연결 상태
```

라이어 게임의 UI와 상태 표현은:

``` text
features/games/liar
```

에서 담당한다.

------------------------------------------------------------------------

# 6. Route 구조

권장 Route:

``` text
/
 /rooms/create
 /rooms/join
 /rooms/:roomId
```

게임 단계마다 URL을 별도로 만들 필요는 없다.

예:

``` text
/rooms/100/role
/rooms/100/vote
/rooms/100/result
```

처럼 게임 상태를 URL에 중복 표현하지 않는다.

핵심 Room 화면은:

``` text
/rooms/:roomId
```

하나를 사용하고 서버의 `gameSession.gameState.phase`에 따라 내부 View를
변경한다.

이렇게 하면 새로고침과 재접속 복구가 단순해진다.

------------------------------------------------------------------------

# 7. RoomPage 역할

`RoomPage`는 Room 안에서 화면을 결정하는 최상위 Orchestrator다.

개념:

``` tsx
function RoomPage() {
  const state = useRoomState(roomId)

  if (!state.gameSession) {
    return <RoomLobby />
  }

  return <GameRenderer gameSession={state.gameSession} />
}
```

`RoomPage`가 라이어 게임 내부 규칙을 직접 구현하지 않는다.

------------------------------------------------------------------------

# 8. GameRenderer

게임 타입에 따라 게임 UI를 선택한다.

개념:

``` tsx
switch (gameSession.gameType) {
  case 'LIAR':
    return <LiarGame />
}
```

향후 게임 추가 시 Room 코드를 크게 수정하지 않도록 한다.

------------------------------------------------------------------------

# 9. LiarGame 구조

권장 구조:

``` text
features/games/liar/
├── components/
├── hooks/
├── api/
├── types/
└── views/
    ├── LiarSetupView.tsx
    ├── RoleRevealView.tsx
    ├── RoleWaitView.tsx
    ├── FirstSpeakerView.tsx
    ├── DiscussionView.tsx
    ├── VotingView.tsx
    ├── VoteWaitView.tsx
    ├── VoteResultView.tsx
    ├── RevotingView.tsx
    ├── LiarRevealView.tsx
    ├── LiarGuessView.tsx
    ├── LiarGuessWaitView.tsx
    └── LiarResultView.tsx
```

하나의 거대한 `LiarGame.tsx` 안에 모든 화면과 로직을 넣지 않는다.

------------------------------------------------------------------------

# 10. Phase 기반 렌더링

서버의 `phase`가 화면 선택 기준이다.

개념:

``` ts
switch (gameState.phase) {
  case 'ROLE_REVEAL':
    return roleChecked
      ? <RoleWaitView />
      : <RoleRevealView />

  case 'DISCUSSION':
    return <DiscussionView />

  case 'VOTING':
    return myVoteSubmitted
      ? <VoteWaitView />
      : <VotingView />

  case 'REVOTING':
    return myVoteSubmitted
      ? <VoteWaitView />
      : <RevotingView />

  case 'VOTE_RESULT':
    return <VoteResultView />

  case 'LIAR_REVEAL':
    return <LiarRevealView />

  case 'LIAR_GUESS':
    return myRole === 'LIAR'
      ? <LiarGuessView />
      : <LiarGuessWaitView />

  case 'FINISHED':
    return <LiarResultView />
}
```

Frontend가 다음 phase를 추측해서 이동하지 않는다.

서버 상태가 바뀐 후 새로운 상태를 기준으로 렌더링한다.

------------------------------------------------------------------------

# 11. clientId

회원가입이 없으므로 브라우저별 익명 `clientId`를 사용한다.

최초 실행:

``` ts
let clientId = localStorage.getItem('noopi.clientId')

if (!clientId) {
  clientId = crypto.randomUUID()
  localStorage.setItem('noopi.clientId', clientId)
}
```

API 요청:

``` text
X-Client-Id: <clientId>
```

`clientId`는 보안 인증 토큰처럼 취급하지 않는다.

브라우저 저장소가 삭제되면 새로운 Client로 간주될 수 있다.

------------------------------------------------------------------------

# 12. Room 정보 로컬 저장

재접속 UX를 위해 최소한의 Room 참조값을 저장할 수 있다.

예:

``` text
noopi.clientId
noopi.lastRoomId
```

단, 다음 데이터는 신뢰 가능한 상태로 localStorage에 저장하지 않는다.

``` text
role
keyword
vote result
game phase
winner
```

이 정보는 서버에서 다시 조회한다.

------------------------------------------------------------------------

# 13. HTTP Client

공통 HTTP Client를 하나 둔다.

책임:

``` text
Base URL
JSON 직렬화
X-Client-Id Header
공통 오류 변환
Network Error 처리
```

예:

``` ts
type ApiError = {
  code: string
  message: string
}
```

화면 컴포넌트에서 직접 `fetch()`를 반복 호출하지 않는다.

------------------------------------------------------------------------

# 14. API 모듈 분리

권장:

``` text
features/room/api/
├── createRoom.ts
├── joinRoom.ts
├── getRoomState.ts
└── leaveRoom.ts

features/game-session/api/
├── createGameSession.ts
├── startGameSession.ts
└── cancelGameSession.ts

features/games/liar/api/
├── getCategories.ts
├── confirmRole.ts
├── startVote.ts
├── submitVote.ts
└── submitGuess.ts
```

API DTO는 `API_SPEC.md`와 일치해야 한다.

------------------------------------------------------------------------

# 15. TanStack Query

Server State 조회/Mutation 관리에 사용한다.

대표 Query:

``` text
roomState(roomId)
liarCategories
games
```

대표 Mutation:

``` text
createRoom
joinRoom
leaveRoom
createGameSession
startGame
confirmRole
startVote
submitVote
submitGuess
excludePlayer
```

------------------------------------------------------------------------

# 16. Room State Query

Room 화면의 핵심 Query Key 예:

``` ts
['room-state', roomId]
```

`GET /api/rooms/{roomId}/state`를 호출한다.

이 Query가 현재 Room 화면의 핵심 상태 기준이다.

------------------------------------------------------------------------

# 17. WebSocket 역할

WebSocket은 서버 상태 변경을 빠르게 알려주는 수단이다.

WebSocket 자체를 상태 저장소로 사용하지 않는다.

흐름:

``` text
REST Action
   ↓
Backend State Change
   ↓
WebSocket Event
   ↓
Frontend
   ↓
Query invalidate / 필요한 상태 반영
   ↓
GET /state
```

모든 이벤트마다 무조건 전체 state를 조회해야 한다는 의미는 아니다.

하지만 상태 전환이 중요한 이벤트에서는 `/state` 재조회가 가장 안전하다.

------------------------------------------------------------------------

# 18. 이벤트 처리 전략

대표 전략:

  Event                    Frontend 처리
  ------------------------ -----------------------------------------
  `PLAYER_JOINED`          room state invalidate
  `PLAYER_LEFT`            room state invalidate
  `PLAYER_DISCONNECTED`    room state invalidate
  `PLAYER_RECONNECTED`     room state invalidate
  `HOST_CHANGED`           room state invalidate
  `GAME_SESSION_CREATED`   room state invalidate
  `GAME_STARTED`           room state invalidate
  `ROLE_CHECKED`           room state invalidate 또는 카운트 갱신
  `DISCUSSION_STARTED`     room state invalidate
  `VOTE_STARTED`           room state invalidate
  `PLAYER_VOTED`           room state invalidate 또는 완료 수 갱신
  `VOTE_RESULT`            room state invalidate
  `REVOTE_STARTED`         room state invalidate
  `LIAR_GUESS_STARTED`     room state invalidate
  `GAME_FINISHED`          room state invalidate
  `GAME_CANCELLED`         room state invalidate

MVP에서는 단순성과 정확성을 위해 `room-state` invalidate를 적극적으로
사용해도 된다.

------------------------------------------------------------------------

# 19. WebSocket 재연결

연결이 끊기면 자동 재연결을 시도한다.

재연결 성공:

``` text
WebSocket Connected
   ↓
invalidate room-state
   ↓
GET /state
   ↓
현재 화면 복구
```

과거 이벤트를 전부 재생해서 상태를 복원하지 않는다.

------------------------------------------------------------------------

# 20. Polling

정상적인 게임 진행에서 `/state`를 1초마다 Polling하지 않는다.

기본:

``` text
REST + WebSocket
```

Polling은 WebSocket 연결 실패 등에 대한 제한적인 fallback으로만
고려한다.

------------------------------------------------------------------------

# 21. Mutation 처리

사용자 행동:

``` text
버튼 클릭
 ↓
버튼 disabled
 ↓
Mutation
 ↓
성공
 ↓
서버 이벤트 또는 Query invalidate
 ↓
새 state 렌더링
```

Mutation 요청 중 같은 행동을 다시 실행하지 못하게 한다.

예:

``` text
게임 시작 중...
투표 제출 중...
정답 제출 중...
```

------------------------------------------------------------------------

# 22. Optimistic Update

게임의 핵심 상태에는 적극적인 Optimistic Update를 사용하지 않는다.

특히:

``` text
role
vote submitted
vote result
game phase
winner
liar guess result
```

는 서버 응답을 기다린다.

Player 목록 같은 비핵심 UI에서도 MVP에서는 정확성을 우선한다.

------------------------------------------------------------------------

# 23. Zustand 사용 범위

Zustand는 선택 사항이며 Client-only UI State에만 사용한다.

예:

``` text
Modal
Toast
현재 임시 입력값
UI Preference
```

다음은 Zustand에 별도 복제하지 않는다.

``` text
Room
Players
GameSession
GameState
Vote Result
```

TanStack Query 데이터와 Zustand 데이터를 수동 동기화하는 구조를 만들지
않는다.

------------------------------------------------------------------------

# 24. 비밀 정보 처리

Frontend는 Backend가 전달하지 않은 정보를 추론하거나 생성하지 않는다.

시민:

``` text
myRole = CITIZEN
keyword = 떡볶이
```

라이어:

``` text
myRole = LIAR
keyword = null
```

라이어의 `keyword === null`을 Frontend가 다른 데이터로 채우지 않는다.

다른 Player의 역할을 클라이언트 상태에 저장하지 않는다.

------------------------------------------------------------------------

# 25. 투표 정보 처리

투표는 완전 비밀투표다.

Frontend가 저장할 수 있는 정보:

``` text
내가 선택 중인 후보
내 투표 제출 여부
현재 투표 완료 인원
현재 후보
라운드 종료 후 후보별 득표수
```

Frontend가 다른 Player의 투표 대상을 받아서는 안 된다.

WebSocket `PLAYER_VOTED`에도 대상 정보가 없어야 한다.

------------------------------------------------------------------------

# 26. 재투표

`REVOTING`은 별도의 게임 규칙 계산 없이 서버 state를 그대로 사용한다.

``` text
eligibleCandidates
voteRound
myVoteSubmitted
```

Frontend가 이전 득표수를 보고 자체적으로 재투표 후보를 계산하지 않는다.

재투표 횟수 제한을 Frontend에 두지 않는다.

------------------------------------------------------------------------

# 27. Host UI

Host 전용 행동은 서버의:

``` text
me.host
```

기준으로 표시한다.

예:

``` text
게임 선택
게임 생성
게임 시작
투표 시작
장기 미접속 Player 제외
게임 취소
다음 게임 선택
```

Host가 아니면 해당 행동 UI를 표시하지 않는다.

하지만 Backend 권한 검증은 별도로 반드시 존재해야 한다.

------------------------------------------------------------------------

# 28. Player Action UI

현재 Player가 할 수 있는 행동만 보여준다.

예:

``` text
ROLE_REVEAL + roleChecked=false
→ 확인했어요 버튼

ROLE_REVEAL + roleChecked=true
→ 대기 화면

VOTING + myVoteSubmitted=false
→ 투표

VOTING + myVoteSubmitted=true
→ 대기

LIAR_GUESS + LIAR
→ 입력

LIAR_GUESS + CITIZEN
→ 대기
```

------------------------------------------------------------------------

# 29. Error 처리

API 오류는 공통 `ApiError`로 변환한다.

예:

``` ts
type ApiError = {
  code: string
  message: string
}
```

화면에서는 `code`를 기준으로 필요한 동작을 결정한다.

상태 충돌 계열:

``` text
INVALID_GAME_PHASE
ALREADY_VOTED
ROLE_ALREADY_CHECKED
GUESS_ALREADY_SUBMITTED
```

이런 오류가 발생하면:

``` text
사용자 메시지
+
room-state invalidate
```

를 기본 전략으로 한다.

------------------------------------------------------------------------

# 30. Network Error

네트워크 자체가 끊긴 경우 서버 오류와 구분한다.

예:

``` text
연결이 불안정해요.
다시 연결하고 있습니다...
```

재연결 성공 후 `/state`를 다시 조회한다.

------------------------------------------------------------------------

# 31. Loading 처리

초기 Room 상태 조회:

``` text
게임 상태를 불러오는 중...
```

버튼 Mutation:

``` text
투표 제출 중...
```

페이지 전체를 불필요하게 깜빡이게 하지 않는다.

기존 화면을 유지할 수 있다면 유지하면서 필요한 행동만 비활성화한다.

------------------------------------------------------------------------

# 32. Mock Architecture

Backend가 없어도 Frontend 전체 흐름을 개발할 수 있어야 한다.

권장:

``` text
src/mocks/
├── mockApi.ts
├── mockRealtime.ts
├── fixtures/
│   ├── players.ts
│   └── categories.ts
└── scenarios/
    ├── citizenWin.ts
    ├── liarWinByWrongAccusation.ts
    ├── liarWinByGuess.ts
    ├── tieVote.ts
    └── reconnect.ts
```

Mock DTO는 실제 API DTO와 동일해야 한다.

Mock 전용 필드를 Product DTO에 추가하지 않는다.

------------------------------------------------------------------------

# 33. Mock 모드

환경 변수 예:

``` text
VITE_API_MODE=mock
```

또는:

``` text
VITE_USE_MOCK_API=true
```

Production Build에서는 실제 API Client를 사용한다.

코드 곳곳에서:

``` ts
if (mock) ...
```

를 반복하지 않는다.

API Adapter 경계에서 실제/Mock 구현을 교체한다.

------------------------------------------------------------------------

# 34. API Adapter

개념:

``` ts
interface RoomApi {
  createRoom(...)
  joinRoom(...)
  getRoomState(...)
}
```

실제:

``` text
HttpRoomApi
```

Mock:

``` text
MockRoomApi
```

게임 코드에서는 어떤 구현인지 몰라도 된다.

과도한 추상화는 피하고 Mock 교체에 필요한 최소 경계만 둔다.

------------------------------------------------------------------------

# 35. Mock Realtime

Mock 환경에서도 다음 이벤트를 재현할 수 있어야 한다.

``` text
PLAYER_JOINED
GAME_STARTED
ROLE_CHECKED
DISCUSSION_STARTED
VOTE_STARTED
PLAYER_VOTED
VOTE_RESULT
REVOTE_STARTED
LIAR_GUESS_STARTED
GAME_FINISHED
```

실제 WebSocket과 동일한 Event Envelope 형태를 사용한다.

------------------------------------------------------------------------

# 36. Styling

전역 디자인 토큰을 별도로 관리한다.

예:

``` css
:root {
  --color-background: ...;
  --color-surface: ...;
  --color-primary: ...;
  --color-secondary: ...;
  --color-text: ...;
  --radius-card: ...;
  --radius-button: ...;
}
```

정확한 색상 값은 디자인 단계에서 확정할 수 있다.

컴포넌트 안에 임의의 색상/spacing 값을 반복해서 작성하지 않는다.

------------------------------------------------------------------------

# 37. Responsive

Mobile First.

주 대상:

``` text
스마트폰 세로 화면
```

권장:

``` text
max-width: 430px
```

PC에서는 중앙 정렬된 모바일 레이아웃을 사용할 수 있다.

가로 스크롤이 생기지 않도록 한다.

------------------------------------------------------------------------

# 38. Touch UX

주요 버튼은 한 손 터치가 가능하도록 충분한 높이를 확보한다.

특히:

``` text
게임 시작
역할 확인
투표
정답 제출
```

등 핵심 버튼은 작은 텍스트 링크로 만들지 않는다.

------------------------------------------------------------------------

# 39. Accessibility

MVP에서도 최소한 다음을 지킨다.

-   버튼은 실제 `<button>` 사용
-   Form input에 label 제공
-   선택 상태를 색상만으로 표현하지 않음
-   disabled 상태 명확히 표시
-   키보드 focus 기본 동작 훼손 금지
-   충분한 텍스트 대비

------------------------------------------------------------------------

# 40. Animation

애니메이션은 게임의 재미를 강화하는 범위에서 사용한다.

적합:

``` text
첫 발언자 공개
투표 결과 공개
라이어 정체 공개
최종 승패
```

부적합:

``` text
모든 버튼
모든 화면 전환
지속적으로 움직이는 배경
```

애니메이션 때문에 게임 진행이 느려지지 않게 한다.

------------------------------------------------------------------------

# 41. Sound

MVP의 핵심 기능으로 간주하지 않는다.

추후 효과음을 넣더라도:

``` text
사용자가 음소거 가능
자동 재생 정책 준수
게임 진행에 필수 정보로 사용하지 않음
```

을 지킨다.

------------------------------------------------------------------------

# 42. TypeScript

API DTO와 Game State는 명시적으로 타입을 정의한다.

예:

``` ts
type Gender = 'MALE' | 'FEMALE'

type GameType = 'LIAR'

type LiarPhase =
  | 'ROLE_REVEAL'
  | 'DISCUSSION'
  | 'VOTING'
  | 'VOTE_RESULT'
  | 'REVOTING'
  | 'LIAR_REVEAL'
  | 'LIAR_GUESS'
  | 'FINISHED'
```

무분별한 `any` 사용을 금지한다.

------------------------------------------------------------------------

# 43. Game State Type

게임별 상태는 discriminated union 형태를 권장한다.

개념:

``` ts
type GameState =
  | LiarGameState
  // | BalanceGameState
  // | BombGameState
```

``` ts
type LiarGameState = {
  type: 'LIAR'
  phase: LiarPhase
  // phase별 데이터
}
```

게임 타입 확장 시 타입 안정성을 유지한다.

------------------------------------------------------------------------

# 44. 컴포넌트 책임

Page:

``` text
Route 단위
Query 연결
큰 화면 조합
```

Feature View:

``` text
게임 phase별 화면
현재 행동
```

Component:

``` text
재사용 가능한 UI
```

API:

``` text
HTTP 호출
DTO
```

Realtime:

``` text
WebSocket 연결
Event parsing
Query synchronization
```

한 컴포넌트가 이 책임을 모두 가지지 않는다.

------------------------------------------------------------------------

# 45. 과도한 추상화 금지

MVP에서 다음과 같은 구조를 미리 만들지 않는다.

``` text
범용 Game Engine Framework
복잡한 Plugin System
Frontend Event Sourcing
Redux 기반 거대한 Global State
Custom WebSocket Protocol Framework
```

현재 필요한 구조만 구현하되 새 게임을 추가할 수 있는 정도의 경계만
유지한다.

------------------------------------------------------------------------

# 46. 테스트 전략

테스트를 작성한다면 게임 규칙 자체가 아니라 Frontend가 책임지는 핵심
분기를 우선한다.

예:

``` text
라이어에게 keyword가 표시되지 않음
시민에게 guess input이 표시되지 않음
투표 완료 후 다시 투표 버튼이 표시되지 않음
Host가 아닌 Player에게 투표 시작 버튼이 없음
REVOTING에서 eligibleCandidates만 표시
```

서버의 승패 계산을 Frontend 테스트에서 다시 구현하지 않는다.

------------------------------------------------------------------------

# 47. 환경 변수

예:

``` text
VITE_API_BASE_URL
VITE_WS_URL
VITE_USE_MOCK_API
```

환경별 URL을 소스에 하드코딩하지 않는다.

------------------------------------------------------------------------

# 48. Production Build

Frontend는 정적 빌드 결과물을 생성한다.

``` text
npm run build
```

결과:

``` text
dist/
```

정적 호스팅을 기본으로 한다.

향후 CDN 사용이 가능하도록 Backend와 Frontend 배포를 분리한다.

------------------------------------------------------------------------

# 49. Backend 연결 전 개발 순서

Frontend를 먼저 개발할 경우 권장 순서:

``` text
1. 프로젝트 기본 구조
2. 디자인 토큰 / 공통 컴포넌트
3. clientId
4. Mock API Adapter
5. 홈 / Room 생성 / 참가
6. Room Lobby
7. 게임 선택
8. Liar Setup
9. Role Reveal
10. Discussion
11. Voting
12. Vote Result
13. Revoting
14. Liar Reveal
15. Liar Guess
16. Final Result
17. Mock WebSocket
18. Reconnect 시나리오
19. 실제 Backend API Adapter 연결
20. 실제 WebSocket 연결
```

------------------------------------------------------------------------

# 50. Frontend 완료 기준

MVP Frontend는 Backend 없이 Mock 환경에서 다음 시나리오를 처음부터
끝까지 실행할 수 있어야 한다.

``` text
Room 생성
→ Player 참가
→ 라이어 게임 선택
→ 게임 시작
→ 역할 확인
→ 첫 발언자
→ 추리
→ 비밀투표
→ 동률
→ 재투표
→ 최종 지목
→ 라이어 판정
→ 제시어 추측
→ 승패
→ 다음 게임
```

추가로:

``` text
시민 오지목
라이어 정답
라이어 오답
연결 끊김
재접속
Host 변경
```

상태를 Mock으로 확인할 수 있어야 한다.

------------------------------------------------------------------------

# 51. 최종 원칙

NOOPI Frontend의 책임은 다음 세 가지다.

``` text
서버 상태를 정확하게 보여준다.
사용자가 지금 할 수 있는 행동만 제공한다.
사용자의 행동을 서버에 정확하게 전달한다.
```

Frontend가 게임의 진실을 결정하지 않는다.

> **게임은 사람끼리, 진행은 웹이.**
