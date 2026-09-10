import { getClientId } from '../features/client/clientId'
import type { NoopiApi, RealtimeEvent } from './types'

const base = import.meta.env.VITE_API_BASE_URL

if (!base) {
  throw new Error('VITE_API_BASE_URL 환경 변수가 설정되지 않았습니다.')
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId(), ...init?.headers } })
  if (!response.ok) throw await response.json()
  return response.status === 204 ? undefined as T : response.json()
}
export const httpApi: NoopiApi = {
  createRoom: input => request('/rooms', { method: 'POST', body: JSON.stringify(input) }),
  findRoom: code => request(`/rooms/by-code/${code}`),
  joinRoom: (id, input) => request(`/rooms/${id}/players`, { method: 'POST', body: JSON.stringify(input) }),
  getRoomState: (id, signal) => request(`/rooms/${id}/state`, { cache: 'no-store', signal }), getGames: () => request('/games'), getCategories: () => request('/games/liar/categories'),
  createGameSession: (id, categoryCode) => request(`/rooms/${id}/game-sessions`, { method: 'POST', body: JSON.stringify({ gameType: 'LIAR', config: { categoryCode } }) }),
  startGame: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/start`, { method: 'POST' }),
  confirmRole: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/role-check`, { method: 'POST' }),
  startVote: (id, gameSessionId) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/votes/start`, { method: 'POST' }),
  submitVote: (id, gameSessionId, input) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/votes`, { method: 'POST', body: JSON.stringify(input) }),
  submitGuess: (id, gameSessionId, answer) => request(`/rooms/${id}/game-sessions/${gameSessionId}/liar/guess`, { method: 'POST', body: JSON.stringify({ answer }) }),
  subscribe(roomId, listener, connection) {
    const wsUrl = import.meta.env.VITE_WS_URL
    if (!wsUrl) throw new Error('VITE_WS_URL 환경 변수가 설정되지 않았습니다.')
    let stopped = false; let ws: WebSocket; let timer: number
    const connect = () => { ws = new WebSocket(`${wsUrl}?roomId=${roomId}&clientId=${getClientId()}`); ws.onopen = () => connection(true); ws.onmessage = e => listener(JSON.parse(e.data) as RealtimeEvent); ws.onclose = () => { connection(false); if (!stopped) timer = window.setTimeout(connect, 1500) } }
    connect(); return () => { stopped = true; clearTimeout(timer); ws?.close() }
  },
} satisfies NoopiApi
