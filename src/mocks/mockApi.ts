import type { Candidate, LiarGameState, NoopiApi, Player, RealtimeEvent, RoomState, Scenario, VoteResult } from '../api/types'

const wait = (ms = 180) => new Promise<void>(resolve => setTimeout(resolve, ms))
const TRANSITION_DELAY = {
  voteStatus: 2_000,
  voteResult: 3_000,
  identityReveal: 2_500,
  liarGuess: 2_000,
} as const
const players: Player[] = [
  { playerId: 1, nickname: '나', gender: 'MALE', host: true, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  { playerId: 2, nickname: '누리', gender: 'FEMALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  { playerId: 3, nickname: '피오', gender: 'MALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  { playerId: 4, nickname: '몽글', gender: 'FEMALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true },
]
type Server = { room: RoomState['room']; me: Player; players: Player[]; gameSession: RoomState['gameSession']; scenario: Scenario; listeners: Set<(event: RealtimeEvent) => void>; sequence: number; tieCount: number }
const server: Server = { room: { roomId: 100, roomCode: 'NOOPI1', status: 'WAITING', hostPlayerId: 1 }, me: players[0], players, gameSession: null, scenario: 'CITIZEN_WIN', listeners: new Set(), sequence: 0, tieCount: 0 }
const categories = [
  { code: 'RANDOM', name: '랜덤', virtual: true }, { code: 'FOOD', name: '맛있는 것', virtual: false },
  { code: 'PLACE', name: '어디일까?', virtual: false }, { code: 'HOBBY', name: '취미 생활', virtual: false },
]
const emit = (type: string, payload: Record<string, unknown> = {}) => {
  const event: RealtimeEvent = { eventId: `mock-${++server.sequence}`, type, roomId: server.room.roomId, gameSessionId: server.gameSession?.gameSessionId ?? null, occurredAt: new Date().toISOString(), payload }
  server.listeners.forEach(listener => listener(event))
}
const person = (id: number): Candidate => { const p = server.players.find(item => item.playerId === id)!; return { playerId: p.playerId, nickname: p.nickname } }
const role = () => server.scenario === 'LIAR_GUESS' ? 'LIAR' as const : 'CITIZEN' as const
const updateGame = (state: LiarGameState, status: 'READY' | 'PLAYING' | 'FINISHED' | 'CANCELLED' = 'PLAYING') => { if (server.gameSession) server.gameSession = { ...server.gameSession, status, gameState: state } }
const voteState = (phase: 'VOTING' | 'REVOTING', round: number, ids: number[]): Extract<LiarGameState, { phase: 'VOTING' | 'REVOTING' }> => ({ type: 'LIAR', phase, myRole: role(), vote: { round, eligibleCandidates: ids.filter(id => id !== server.me.playerId).map(person), requiredVoteCount: 4, completedVoteCount: 0, myVoteSubmitted: false, playerVoteStatuses: server.players.map(p => ({ playerId: p.playerId, submitted: false })) } })

export const mockApi: NoopiApi = {
  async createRoom(input) { await wait(); server.me = { ...server.players[0], nickname: input.nickname, gender: input.gender, host: true }; server.players = [server.me, ...players.slice(1)]; server.room = { roomId: 100, roomCode: 'NOOPI1', status: 'WAITING', hostPlayerId: 1 }; server.gameSession = null; return { room: server.room, me: server.me } },
  async findRoom(code) { await wait(); if (code.toUpperCase() !== 'NOOPI1') throw { code: 'ROOM_NOT_FOUND', message: '방을 찾을 수 없어요.' }; return { roomId: 100, roomCode: 'NOOPI1', status: 'WAITING', playerCount: 4, joinable: true } },
  async joinRoom(_roomId, input) { await wait(); server.me = { ...server.players[0], nickname: input.nickname, gender: input.gender, host: false }; server.players = [{ ...server.me }, { ...players[1], host: true }, ...players.slice(2)]; server.room.hostPlayerId = 2; emit('PLAYER_JOINED', { playerId: 1, nickname: input.nickname }); return { player: server.me } },
  async getRoomState() { await wait(60); return structuredClone({ room: server.room, me: server.me, players: server.players, gameSession: server.gameSession }) },
  async getGames() { return { games: [{ gameType: 'LIAR', name: '라이어 게임', minPlayers: 3, maxPlayers: 12, enabled: true }] } },
  async getCategories() { return { categories } },
  async createGameSession(_roomId, categoryCode) { await wait(); const categoryName = categories.find(c => c.code === categoryCode)?.name ?? categoryCode; server.room.status = 'ACTIVE'; server.gameSession = { gameSessionId: Date.now(), gameType: 'LIAR', status: 'READY', gameState: { type: 'LIAR', phase: 'READY', categoryCode, categoryName } }; emit('GAME_SESSION_CREATED', { gameType: 'LIAR' }); return { gameSessionId: server.gameSession.gameSessionId, gameType: 'LIAR', status: 'READY' } },
  async startGame() { await wait(); updateGame({ type: 'LIAR', phase: 'ROLE_REVEAL', myRole: role(), keyword: role() === 'LIAR' ? null : '별빛 캠핑', roleChecked: false, roleCheckedCount: 2, participantCount: 4 }); emit('GAME_STARTED', { gameType: 'LIAR' }) },
  async confirmRole() { await wait(); updateGame({ type: 'LIAR', phase: 'ROLE_REVEAL', myRole: role(), keyword: role() === 'LIAR' ? null : '별빛 캠핑', roleChecked: true, roleCheckedCount: 3, participantCount: 4 }); emit('ROLE_CHECKED', { playerId: 1, roleCheckedCount: 3, participantCount: 4 }); setTimeout(() => { updateGame({ type: 'LIAR', phase: 'DISCUSSION', myRole: role(), keyword: role() === 'LIAR' ? null : '별빛 캠핑', firstSpeakerPlayerId: 3 }); emit('DISCUSSION_STARTED', { firstSpeakerPlayerId: 3 }) }, 900) },
  async startVote() { await wait(); updateGame(voteState('VOTING', 1, [1, 2, 3, 4])); emit('VOTE_STARTED', { voteRound: 1 }); return { voteRound: 1 } },
  async submitVote(_roomId, _sessionId, input) { await wait(); const current = server.gameSession?.gameState; if (!current || (current.phase !== 'VOTING' && current.phase !== 'REVOTING')) return; updateGame({ ...current, vote: { ...current.vote, myVoteSubmitted: true, completedVoteCount: 3, playerVoteStatuses: server.players.map((p, i) => ({ playerId: p.playerId, submitted: i < 3 })) } }); emit('PLAYER_VOTED', { playerId: 1, voteRound: input.voteRound, completedVoteCount: 3, requiredVoteCount: 4 }); setTimeout(() => resolveVote(input.voteRound), TRANSITION_DELAY.voteStatus) },
  async submitGuess(_roomId, _sessionId, answer) { await wait(); const correct = answer.trim().replace(/\s+/g, ' ').toLowerCase() === '별빛 캠핑'; finish(correct ? 'LIAR' : 'CITIZEN', { answer, correct }, person(1)); return { correct } },
  async finishAndChoose(_roomId, action) { await wait(); server.gameSession = null; server.room.status = 'WAITING'; server.tieCount = 0; emit(action === 'REPLAY' ? 'GAME_SESSION_CREATED' : 'GAME_FINISHED') },
  subscribe(_roomId, listener, connection) { server.listeners.add(listener); connection(true); return () => server.listeners.delete(listener) },
  setScenario(scenario) { server.scenario = scenario; server.tieCount = 0 },
  simulateDisconnect() { const other = server.players[2]; other.connectionStatus = 'DISCONNECTED'; emit('PLAYER_DISCONNECTED', { playerId: other.playerId }); setTimeout(() => { other.connectionStatus = 'CONNECTED'; emit('PLAYER_RECONNECTED', { playerId: other.playerId }) }, 1800) },
}

function resolveVote(round: number) {
  const tie = server.scenario === 'REPEATED_TIE' && server.tieCount < 2
  const result: VoteResult = tie
    ? { round, tied: true, counts: [{ ...person(2), voteCount: 2 }, { ...person(3), voteCount: 2 }], accusedPlayerId: null }
    : { round, tied: false, counts: [{ ...person(server.scenario === 'WRONG_ACCUSATION' ? 2 : server.scenario === 'LIAR_GUESS' ? 1 : 4), voteCount: 3 }, { ...person(3), voteCount: 1 }], accusedPlayerId: server.scenario === 'WRONG_ACCUSATION' ? 2 : server.scenario === 'LIAR_GUESS' ? 1 : 4 }
  if (tie) { server.tieCount++; const next = voteState('REVOTING', round + 1, [2, 3]); updateGame({ ...next, previousVoteResult: result }); emit('REVOTE_STARTED', { voteRound: round + 1, candidatePlayerIds: [2, 3] }); return }
  updateGame({ type: 'LIAR', phase: 'VOTE_RESULT', myRole: role(), voteResult: result }); emit('VOTE_RESULT', { voteRound: round, tied: false, accusedPlayerId: result.accusedPlayerId ?? null }); setTimeout(() => reveal(result.accusedPlayerId!), TRANSITION_DELAY.voteResult)
}
function reveal(accusedId: number) {
  const accusedWasLiar = server.scenario !== 'WRONG_ACCUSATION'
  updateGame({ type: 'LIAR', phase: 'LIAR_REVEAL', myRole: role(), accusedPlayer: person(accusedId), accusedWasLiar }); emit('LIAR_REVEALED', { accusedPlayerId: accusedId, accusedWasLiar })
  setTimeout(() => {
    if (!accusedWasLiar) { finish('LIAR', null, person(2)); return }
    updateGame({ type: 'LIAR', phase: 'LIAR_GUESS', myRole: role(), liarPlayer: person(server.scenario === 'LIAR_GUESS' ? 1 : 4) }); emit('LIAR_GUESS_STARTED')
    if (server.scenario !== 'LIAR_GUESS') setTimeout(() => finish('CITIZEN', { answer: '달빛 피크닉', correct: false }, person(4)), TRANSITION_DELAY.liarGuess)
  }, TRANSITION_DELAY.identityReveal)
}
function finish(winner: 'CITIZEN' | 'LIAR', liarGuess: { answer: string; correct: boolean } | null, accused: Candidate) {
  const liar = server.scenario === 'LIAR_GUESS' ? person(1) : person(4)
  updateGame({ type: 'LIAR', phase: 'FINISHED', result: { winner, liarPlayer: liar, keyword: '별빛 캠핑', accusedPlayer: accused, liarGuess } }, 'FINISHED'); emit('GAME_FINISHED')
}
