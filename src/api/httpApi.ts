import { getClientId } from '../features/client/clientId'
import type { NoopiApi, RealtimeEvent } from './types'

const base = import.meta.env.VITE_API_BASE_URL

if (!base) {
  throw new Error('VITE_API_BASE_URL 환경 변수가 설정되지 않았습니다.')
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId(), ...init?.headers } })
  if (!response.ok) throw await response.json()
  // Path selection may return 202 with no body; successful empty responses are valid.
  const body = await response.text()
  return body ? JSON.parse(body) as T : undefined as T
}
export const httpApi: NoopiApi = {
  rollPig: (id, session, key) => request(`/rooms/${id}/game-sessions/${session}/pig/roll`, { method: 'POST', headers: { 'Idempotency-Key': key } }),
  stopPig: (id, session, key) => request(`/rooms/${id}/game-sessions/${session}/pig/stop`, { method: 'POST', headers: { 'Idempotency-Key': key } }),
  selectTooth: (id, session, toothId, key) => request(`/rooms/${id}/game-sessions/${session}/tooth/selections`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ toothId }) }),
  createRoom: input => request('/rooms', { method: 'POST', body: JSON.stringify(input) }),
  findRoom: code => request(`/rooms/by-code/${code}`),
  joinRoom: (id, input) => request(`/rooms/${id}/players`, { method: 'POST', body: JSON.stringify(input) }),
  leaveRoom: id => request(`/rooms/${id}/players/me`, { method: 'DELETE' }),
  returnToLobby: id => request(`/rooms/${id}/lobby`, { method: 'POST' }),
  getRoomState: (id, signal) => request(`/rooms/${id}/state`, { cache: 'no-store', signal }), getGames: () => request('/games'), getCategories: () => request('/games/liar/categories'),
  createGameSession: (id, gameType, config) => request(`/rooms/${id}/game-sessions`, { method: 'POST', body: JSON.stringify({ gameType, config }) }),
  startGame: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/start`, { method: 'POST' }),
  confirmRole: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/role-check`, { method: 'POST' }),
  startVote: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/votes/start`, { method: 'POST' }),
  submitVote: (id, gameSessionId, input) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/votes`, { method: 'POST', body: JSON.stringify(input) }),
  submitGuess: (id, gameSessionId, answer) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/guess`, { method: 'POST', body: JSON.stringify({ answer }) }),
  submitBlindGuess: (id, gameSessionId, answer) => request(`/rooms/${id}/game-sessions/${gameSessionId}/blind/guesses`, { method: 'POST', body: JSON.stringify({ answer }) }),
  confirmMafiaRole: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/mafia/role-check`, { method: 'POST' }),
  submitMafiaNightAction: (id, gameSessionId, input) => request(`/rooms/${id}/game-sessions/${gameSessionId}/mafia/night-actions`, { method: 'POST', body: JSON.stringify(input) }),
  startMafiaVote: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/mafia/votes/start`, { method: 'POST' }),
  submitMafiaVote: (id, gameSessionId, input) => request(`/rooms/${id}/game-sessions/${gameSessionId}/mafia/votes`, { method: 'POST', body: JSON.stringify(input) }),
  submitMafiaJudgment: (id, gameSessionId, choice) => request(`/rooms/${id}/game-sessions/${gameSessionId}/mafia/judgment-votes`, { method: 'POST', body: JSON.stringify({ choice }) }),
  advanceMafia: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/mafia/advance`, { method: 'POST' }),
  selectYutTeam: (id, gameSessionId, team) => request(`/rooms/${id}/game-sessions/${gameSessionId}/yut/team`, { method: 'PUT', body: JSON.stringify({ team }) }),
  throwYut: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/yut/throws`, { method: 'POST' }),
  selectYutMoveToken: (id, gameSessionId, moveTokenId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/yut/move-selections`, { method: 'POST', body: JSON.stringify({ moveTokenId }) }),
  selectYutPiece: (id, gameSessionId, pieceId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/yut/piece-selections`, { method: 'POST', body: JSON.stringify({ pieceId }) }),
  selectYutPath: (id, gameSessionId, pathId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/yut/path-selections`, { method: 'POST', body: JSON.stringify({ pathId }) }),
  subscribe(roomId, listener, connection) {
    const wsUrl = import.meta.env.VITE_WS_URL
    if (!wsUrl) throw new Error('VITE_WS_URL 환경 변수가 설정되지 않았습니다.')
    let stopped = false; let ws: WebSocket; let timer: number
    const connect = () => { ws = new WebSocket(`${wsUrl}?roomId=${roomId}&clientId=${getClientId()}`); ws.onopen = () => connection(true); ws.onmessage = e => listener(JSON.parse(e.data) as RealtimeEvent); ws.onclose = () => { connection(false); if (!stopped) timer = window.setTimeout(connect, 1500) } }
    connect(); return () => { stopped = true; clearTimeout(timer); ws?.close() }
  },
} satisfies NoopiApi
