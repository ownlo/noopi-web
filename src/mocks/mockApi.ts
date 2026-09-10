import type { CategoryCatalog, GameCatalog, LiarGameState, NoopiApi, Player, RealtimeEvent, RoomState } from '../api/types'

const wait = (ms = 180) => new Promise(resolve => window.setTimeout(resolve, ms))
const PHASE_TRANSITION_DELAY_MS = 3_000
const listeners = new Set<(event: RealtimeEvent) => void>()

const games: GameCatalog = { games: [{ gameType: 'LIAR', name: '라이어 게임', minPlayers: 3, maxPlayers: 12, enabled: true }] }
const categories: CategoryCatalog = { categories: [
  { code: 'RANDOM', name: '랜덤', virtual: true },
  { code: 'FOOD', name: '음식', virtual: false },
  { code: 'PLACE', name: '장소', virtual: false },
] }

let nextRoomId = 100
let nextSessionId = 500
let currentRoom: RoomState | null = null

const mockPlayers = (nickname: string, gender: Player['gender']): Player[] => [
  { playerId: 1, nickname, gender, host: true, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  { playerId: 2, nickname: '모모', gender: 'FEMALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  { playerId: 3, nickname: '두부', gender: 'MALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  { playerId: 4, nickname: '보리', gender: 'FEMALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true },
]

function createState(nickname = '누피', gender: Player['gender'] = 'MALE'): RoomState {
  const players = mockPlayers(nickname, gender)
  return {
    room: { roomId: nextRoomId++, roomCode: 'MOCK01', status: 'WAITING', hostPlayerId: 1 },
    me: players[0],
    players,
    gameSession: null,
  }
}

function room(): RoomState {
  currentRoom ??= createState()
  return currentRoom
}

function requireConnectedHost(state: RoomState) {
  const host = state.players.find(player => player.playerId === state.room.hostPlayerId)
  if (!host || host.connectionStatus !== 'CONNECTED') throw { code: 'ROOM_NOT_FOUND', message: '방을 찾을 수 없습니다.' }
}

function emit(type: string) {
  const state = room()
  const event: RealtimeEvent = {
    eventId: crypto.randomUUID(), type, roomId: state.room.roomId,
    gameSessionId: state.gameSession?.gameSessionId ?? null,
    occurredAt: new Date().toISOString(), payload: {},
  }
  listeners.forEach(listener => listener(event))
}

function setGameState(gameState: LiarGameState, status: NonNullable<RoomState['gameSession']>['status'] = 'PLAYING') {
  const state = room()
  if (!state.gameSession) throw new Error('GAME_SESSION_NOT_FOUND')
  state.gameSession = { ...state.gameSession, status, gameState }
}

function scheduleVoteReveal() {
  window.setTimeout(() => {
    setGameState({ type: 'LIAR', phase: 'LIAR_REVEAL', myRole: 'CITIZEN', accusedPlayer: { playerId: 2, nickname: '모모' }, accusedWasLiar: true })
    emit('LIAR_REVEALED')
  }, PHASE_TRANSITION_DELAY_MS)
  window.setTimeout(() => {
    setGameState({ type: 'LIAR', phase: 'LIAR_GUESS', myRole: 'CITIZEN', liarPlayer: { playerId: 2, nickname: '모모' } })
    emit('LIAR_GUESS_STARTED')
  }, PHASE_TRANSITION_DELAY_MS * 2)
  window.setTimeout(() => {
    setGameState({ type: 'LIAR', phase: 'FINISHED', result: { winner: 'CITIZEN', liarPlayer: { playerId: 2, nickname: '모모' }, keyword: '떡볶이', accusedPlayer: { playerId: 2, nickname: '모모' }, liarGuess: { answer: '김밥', correct: false } } }, 'FINISHED')
    emit('GAME_FINISHED')
  }, PHASE_TRANSITION_DELAY_MS * 3)
}

export const mockApi: NoopiApi = {
  async createRoom(input) {
    await wait()
    currentRoom = createState(input.nickname, input.gender)
    return { room: currentRoom.room, me: currentRoom.me }
  },
  async findRoom(roomCode) {
    await wait()
    const state = room()
    if (roomCode !== 'MOCK01' && roomCode !== state.room.roomCode) throw new Error('ROOM_NOT_FOUND')
    requireConnectedHost(state)
    return { roomId: state.room.roomId, roomCode: state.room.roomCode, status: state.room.status, playerCount: state.players.length, joinable: true }
  },
  async joinRoom(_roomId, input) {
    await wait()
    requireConnectedHost(room())
    currentRoom = createState(input.nickname, input.gender)
    return { player: currentRoom.me }
  },
  async leaveRoom() {
    await wait()
    const state = room()
    if (state.me.host) emit('ROOM_CLOSED')
    currentRoom = null
  },
  async getRoomState() { await wait(80); return structuredClone(room()) },
  async getGames() { await wait(80); return games },
  async getCategories() { await wait(80); return categories },
  async createGameSession(_roomId, categoryCode) {
    await wait()
    const state = room()
    const selected = categories.categories.find(category => category.code === categoryCode)
    if (!selected) throw new Error('INVALID_CATEGORY')
    const gameSessionId = nextSessionId++
    state.room.status = 'ACTIVE'
    state.gameSession = { gameSessionId, gameType: 'LIAR', status: 'READY', gameState: { type: 'LIAR', phase: 'READY', categoryCode, categoryName: selected.name } }
    emit('GAME_SESSION_CREATED')
    return { gameSessionId, gameType: 'LIAR', status: 'READY' }
  },
  async startGame() {
    await wait()
    const players = room().players
    setGameState({ type: 'LIAR', phase: 'ROLE_REVEAL', myRole: 'CITIZEN', keyword: '떡볶이', roleChecked: false, roleCheckedCount: 3, participantCount: players.length, playerRoleCheckStatuses: players.map(player => ({ playerId: player.playerId, checked: player.playerId !== 1 })) })
    emit('GAME_STARTED')
  },
  async confirmRole() {
    await wait()
    setGameState({ type: 'LIAR', phase: 'DISCUSSION', myRole: 'CITIZEN', keyword: '떡볶이', firstSpeakerPlayerId: 2 })
    emit('DISCUSSION_STARTED')
  },
  async startVote() {
    await wait()
    const state = room()
    setGameState({ type: 'LIAR', phase: 'VOTING', myRole: 'CITIZEN', vote: { round: 1, eligibleCandidates: state.players.filter(player => player.playerId !== state.me.playerId).map(({ playerId, nickname }) => ({ playerId, nickname })), requiredVoteCount: 4, completedVoteCount: 3, myVoteSubmitted: false, playerVoteStatuses: state.players.map(player => ({ playerId: player.playerId, submitted: player.playerId !== state.me.playerId })) } })
    emit('VOTE_STARTED')
    return { voteRound: 1 }
  },
  async submitVote(_roomId, _gameSessionId, input) {
    await wait()
    const state = room()
    const currentGameState = state.gameSession?.gameState
    if (currentGameState?.phase !== 'VOTING' && currentGameState?.phase !== 'REVOTING') throw new Error('INVALID_GAME_PHASE')
    setGameState({
      ...currentGameState,
      vote: {
        ...currentGameState.vote,
        completedVoteCount: currentGameState.vote.requiredVoteCount,
        myVoteSubmitted: true,
        playerVoteStatuses: currentGameState.vote.playerVoteStatuses?.map(status =>
          status.playerId === state.me.playerId ? { ...status, submitted: true } : status,
        ),
      },
    })
    emit('PLAYER_VOTED')
    if (input.voteRound === 1) {
      window.setTimeout(() => {
        setGameState({ type: 'LIAR', phase: 'REVOTING', myRole: 'CITIZEN', vote: { round: 2, eligibleCandidates: [{ playerId: 2, nickname: '모모' }, { playerId: 3, nickname: '두부' }], requiredVoteCount: 4, completedVoteCount: 3, myVoteSubmitted: false, playerVoteStatuses: state.players.map(player => ({ playerId: player.playerId, submitted: player.playerId !== state.me.playerId })) }, previousVoteResult: { round: 1, tied: true, counts: [{ playerId: 2, nickname: '모모', voteCount: 2 }, { playerId: 3, nickname: '두부', voteCount: 2 }] } })
        emit('REVOTE_STARTED')
      }, PHASE_TRANSITION_DELAY_MS)
      return
    }
    window.setTimeout(() => {
      setGameState({ type: 'LIAR', phase: 'VOTE_RESULT', myRole: 'CITIZEN', voteResult: { round: 2, tied: false, counts: [{ playerId: 2, nickname: '모모', voteCount: 3 }, { playerId: 3, nickname: '두부', voteCount: 1 }], accusedPlayerId: 2 } })
      emit('VOTE_RESULT')
      scheduleVoteReveal()
    }, PHASE_TRANSITION_DELAY_MS)
  },
  async submitGuess(_roomId, _gameSessionId, answer) {
    await wait()
    const correct = answer.trim() === '떡볶이'
    const state = room()
    setGameState({ type: 'LIAR', phase: 'FINISHED', result: { winner: correct ? 'LIAR' : 'CITIZEN', liarPlayer: { playerId: 1, nickname: state.me.nickname }, keyword: '떡볶이', accusedPlayer: { playerId: 1, nickname: state.me.nickname }, liarGuess: { answer: answer.trim(), correct } } }, 'FINISHED')
    emit('GAME_FINISHED')
    return { correct }
  },
  subscribe(_roomId, listener, connection) {
    listeners.add(listener)
    connection(true)
    return () => listeners.delete(listener)
  },
}
