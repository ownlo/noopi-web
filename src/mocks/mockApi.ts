import type { BlindGameState, Candidate, CategoryCatalog, GameCatalog, GameState, MafiaGameState, MafiaNightActionType, MafiaRole, NoopiApi, Player, RealtimeEvent, RoomState } from '../api/types'

const wait = (ms = 180) => new Promise(resolve => window.setTimeout(resolve, ms))
const PHASE_TRANSITION_DELAY_MS = 3_000
const listeners = new Set<(event: RealtimeEvent) => void>()

const games: GameCatalog = { games: [{ gameType: 'LIAR', name: '라이어 게임', minPlayers: 3, maxPlayers: 12, enabled: true }, { gameType: 'BLIND', name: '블라인드 게임', minPlayers: 2, maxPlayers: 2, enabled: true }, { gameType: 'MAFIA', name: '마피아 게임', minPlayers: 4, maxPlayers: 12, enabled: true }] }
const categories: CategoryCatalog = { categories: [
  { code: 'RANDOM', name: '랜덤', virtual: true },
  { code: 'FOOD', name: '음식', virtual: false },
  { code: 'PLACE', name: '장소', virtual: false },
] }

let nextRoomId = 100
let nextSessionId = 500
let currentRoom: RoomState | null = null
let mafiaDayNo = 1

const mockPlayerNames = ['모모', '두부', '보리', '콩이', '호두', '초코', '구름', '단추', '라떼', '망고', '쿠키']
const mockPlayers = (nickname: string, gender: Player['gender']): Player[] => [
  { playerId: 1, nickname, gender, host: true, connectionStatus: 'CONNECTED', currentGameParticipant: true },
  ...mockPlayerNames.map((playerNickname, index): Player => ({ playerId: index + 2, nickname: playerNickname, gender: index % 2 === 0 ? 'FEMALE' : 'MALE', host: false, connectionStatus: 'CONNECTED', currentGameParticipant: true })),
]

function createState(nickname = '누피', gender: Player['gender'] = 'MALE'): RoomState {
  const requestedCount = Number(sessionStorage.getItem('noopi.mockPlayerCount'))
  const playerCount = requestedCount >= 2 && requestedCount <= 12 ? requestedCount : 4
  const players = mockPlayers(nickname, gender).slice(0, playerCount)
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

function emit(type: string, payload: Record<string, unknown> = {}) {
  const state = room()
  const event: RealtimeEvent = {
    eventId: crypto.randomUUID(), type, roomId: state.room.roomId,
    gameSessionId: state.gameSession?.gameSessionId ?? null,
    occurredAt: new Date().toISOString(), payload,
  }
  listeners.forEach(listener => listener(event))
}

function shuffledPlayerIds(players: Player[]): number[] {
  const playerIds = players.map(player => player.playerId)
  for (let index = playerIds.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1))
    const currentPlayerId = playerIds[index]
    playerIds[index] = playerIds[targetIndex]
    playerIds[targetIndex] = currentPlayerId
  }
  return playerIds
}

function mockMafiaRole(): MafiaRole {
  const saved = sessionStorage.getItem('noopi.mockMafiaRole')
  return saved === 'MAFIA' || saved === 'POLICE' || saved === 'DOCTOR' || saved === 'CITIZEN' ? saved : 'CITIZEN'
}

function mafiaCandidates(state: RoomState, role: MafiaRole): Candidate[] {
  const teammateIds = new Set(mafiaTeammates(state, role)?.map(player => player.playerId) ?? [])
  return state.players
    .filter(player => (role === 'DOCTOR' || player.playerId !== state.me.playerId) && !teammateIds.has(player.playerId))
    .map(({ playerId, nickname }) => ({ playerId, nickname }))
}

function mafiaAction(role: MafiaRole, firstNight: boolean): MafiaNightActionType {
  if (firstNight && (role === 'MAFIA' || role === 'DOCTOR')) return 'CONFIRM'
  return { MAFIA: 'ATTACK', POLICE: 'INVESTIGATE', DOCTOR: 'HEAL', CITIZEN: 'SUSPECT' }[role] as MafiaNightActionType
}

function mafiaRoleComposition(playerCount: number) {
  const mafia = playerCount >= 12 ? 3 : playerCount >= 7 ? 2 : 1
  const police = 1
  const doctor = playerCount >= 5 ? 1 : 0
  return { mafia, police, doctor, citizen: playerCount - mafia - police - doctor }
}

function mafiaTeammates(state: RoomState, role: MafiaRole) {
  if (role !== 'MAFIA') return undefined

  const teammateCount = mafiaRoleComposition(state.players.length).mafia - 1
  return state.players
    .filter(player => player.playerId !== state.me.playerId)
    .slice(0, teammateCount)
    .map(({ playerId, nickname }) => ({ playerId, nickname, alive: true }))
}

function setGameState(gameState: GameState, status: NonNullable<RoomState['gameSession']>['status'] = 'PLAYING') {
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
  async createGameSession(_roomId, gameType, config) {
    await wait()
    const state = room()
    const gameSessionId = nextSessionId++
    state.room.status = 'ACTIVE'
    if (gameType === 'BLIND') {
      state.gameSession = { gameSessionId, gameType, status: 'READY', gameState: { type: 'BLIND', phase: 'READY' } }
    } else if (gameType === 'MAFIA') {
      mafiaDayNo = 1
      const participantCount = state.players.length
      state.gameSession = { gameSessionId, gameType, status: 'READY', gameState: { type: 'MAFIA', phase: 'READY', participantCount, roleComposition: mafiaRoleComposition(participantCount) } }
    } else {
      const categoryCode = config.categoryCode ?? ''
      const selected = categories.categories.find(category => category.code === categoryCode)
      if (!selected) throw new Error('INVALID_CATEGORY')
      state.gameSession = { gameSessionId, gameType, status: 'READY', gameState: { type: 'LIAR', phase: 'READY', categoryCode, categoryName: selected.name } }
    }
    emit('GAME_SESSION_CREATED')
    return { gameSessionId, gameType, status: 'READY' }
  },
  async startGame() {
    await wait()
    const state = room()
    if (state.gameSession?.gameType === 'BLIND') {
      if (state.players.length !== 2) throw new Error('INVALID_PLAYER_COUNT')
      setGameState({ type: 'BLIND', phase: 'GUESSING', opponentPlayer: { playerId: state.players[1].playerId, nickname: state.players[1].nickname }, opponentKeyword: '아메리카노' })
      emit('GAME_STARTED')
      return
    }
    if (state.gameSession?.gameType === 'MAFIA') {
      const players = state.players
      const role = mockMafiaRole()
      setGameState({ type: 'MAFIA', phase: 'ROLE_REVEAL', myRole: role, alive: true, roleChecked: false, roleCheckedCount: players.length - 1, participantCount: players.length, mafiaTeammates: mafiaTeammates(state, role), players: players.map(player => ({ playerId: player.playerId, nickname: player.nickname, alive: true, revealedRole: null })) })
      emit('GAME_STARTED')
      return
    }
    const players = state.players
    setGameState({ type: 'LIAR', phase: 'ROLE_REVEAL', myRole: 'CITIZEN', keyword: '떡볶이', roleChecked: false, roleCheckedCount: players.length - 1, participantCount: players.length, playerRoleCheckStatuses: players.map(player => ({ playerId: player.playerId, checked: player.playerId !== 1 })) })
    emit('GAME_STARTED')
  },
  async confirmRole() {
    await wait()
    const speakingOrderPlayerIds = shuffledPlayerIds(room().players)
    setGameState({ type: 'LIAR', phase: 'DISCUSSION', myRole: 'CITIZEN', keyword: '떡볶이', speakingOrderPlayerIds })
    emit('DISCUSSION_STARTED', { speakingOrderPlayerIds })
  },
  async startVote() {
    await wait()
    const state = room()
    setGameState({ type: 'LIAR', phase: 'VOTING', myRole: 'CITIZEN', vote: { round: 1, eligibleCandidates: state.players.filter(player => player.playerId !== state.me.playerId).map(({ playerId, nickname }) => ({ playerId, nickname })), requiredVoteCount: state.players.length, completedVoteCount: state.players.length - 1, myVoteSubmitted: false, playerVoteStatuses: state.players.map(player => ({ playerId: player.playerId, submitted: player.playerId !== state.me.playerId })) } })
    emit('VOTE_STARTED')
    return { voteRound: 1 }
  },
  async submitVote(_roomId, _gameSessionId, input) {
    await wait()
    const state = room()
    const currentGameState = state.gameSession?.gameState
    if (currentGameState?.type !== 'LIAR' || (currentGameState.phase !== 'VOTING' && currentGameState.phase !== 'REVOTING')) throw new Error('INVALID_GAME_PHASE')
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
        setGameState({ type: 'LIAR', phase: 'REVOTING', myRole: 'CITIZEN', vote: { round: 2, eligibleCandidates: [{ playerId: 2, nickname: '모모' }, { playerId: 3, nickname: '두부' }], requiredVoteCount: state.players.length, completedVoteCount: state.players.length - 1, myVoteSubmitted: false, playerVoteStatuses: state.players.map(player => ({ playerId: player.playerId, submitted: player.playerId !== state.me.playerId })) }, previousVoteResult: { round: 1, tied: true, counts: [{ playerId: 2, nickname: '모모', voteCount: Math.floor(state.players.length / 2) }, { playerId: 3, nickname: '두부', voteCount: Math.floor(state.players.length / 2) }] } })
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
  async submitBlindGuess(_roomId, _gameSessionId, answer) {
    await wait()
    const correct = answer.trim() === '피자'
    if (!correct) return { correct: false }
    const state = room()
    const result: Extract<BlindGameState, { phase: 'FINISHED' }>['result'] = {
      winnerPlayer: { playerId: state.me.playerId, nickname: state.me.nickname },
      keywordAssignments: [
        { playerId: state.me.playerId, nickname: state.me.nickname, keyword: '피자' },
        { playerId: state.players[1].playerId, nickname: state.players[1].nickname, keyword: '아메리카노' },
      ],
    }
    setGameState({ type: 'BLIND', phase: 'FINISHED', result }, 'FINISHED')
    emit('GAME_FINISHED')
    return { correct: true }
  },
  async confirmMafiaRole() {
    await wait()
    const state = room()
    const role = mockMafiaRole()
    const actionType = mafiaAction(role, true)
    setGameState({ type: 'MAFIA', phase: 'FIRST_NIGHT', nightNo: 1, myRole: role, alive: true, mafiaTeammates: mafiaTeammates(state, role), players: state.players.map(player => ({ playerId: player.playerId, nickname: player.nickname, alive: true, revealedRole: null })), nightAction: { actionType, submitted: false, eligibleTargets: actionType === 'CONFIRM' ? [] : mafiaCandidates(state, role) }, nightProgress: { completedActionCount: state.players.length - 1, requiredActionCount: state.players.length }, investigationHistory: role === 'POLICE' ? [] : undefined })
    emit('MAFIA_PHASE_CHANGED', { phase: 'FIRST_NIGHT' })
  },
  async submitMafiaNightAction(_roomId, _gameSessionId, input) {
    await wait()
    const state = room()
    const game = state.gameSession?.gameState
    if (!game || game.type !== 'MAFIA' || (game.phase !== 'FIRST_NIGHT' && game.phase !== 'NIGHT')) throw new Error('INVALID_GAME_PHASE')
    const target = state.players.find(player => player.playerId === input.targetPlayerId)
    const result = input.actionType === 'INVESTIGATE' && target ? { targetPlayerId: target.playerId, mafia: target.playerId === 2 } : undefined
    if (game.phase === 'FIRST_NIGHT') {
      const mafiaCount = mafiaRoleComposition(state.players.length).mafia
      setGameState({ type: 'MAFIA', phase: 'DAY', dayNo: 1, myRole: game.myRole, alive: true, mafiaTeammates: game.mafiaTeammates, players: game.players, investigationHistory: target && result ? [{ nightNo: 1, targetPlayerId: target.playerId, targetNickname: target.nickname, mafia: result.mafia }] : game.investigationHistory, remainingTeamCounts: { mafia: mafiaCount, citizenTeam: state.players.length - mafiaCount }, lastNightResult: { nightNo: 1, deadPlayer: null, mySuspicionCount: 1 } })
      emit('MAFIA_PHASE_CHANGED', { phase: 'DAY' })
    } else {
      const victim = state.players[3]
      const history = target && result ? [...(game.investigationHistory ?? []), { nightNo: 2, targetPlayerId: target.playerId, targetNickname: target.nickname, mafia: result.mafia }] : game.investigationHistory
      setGameState({ type: 'MAFIA', phase: 'NIGHT_RESULT', myRole: game.myRole, alive: true, mafiaTeammates: game.mafiaTeammates, players: game.players?.map(player => player.playerId === victim.playerId ? { ...player, alive: false, revealedRole: 'CITIZEN' } : player), investigationHistory: history, nightResult: { nightNo: 2, deadPlayer: { playerId: victim.playerId, nickname: victim.nickname, revealedRole: 'CITIZEN' }, mySuspicionCount: 0 }, canAdvance: true })
      emit('MAFIA_PHASE_CHANGED', { phase: 'NIGHT_RESULT' })
    }
    return { actionType: input.actionType, result }
  },
  async startMafiaVote() {
    await wait()
    const state = room(); const game = state.gameSession?.gameState
    if (!game || game.type !== 'MAFIA' || game.phase !== 'DAY') throw new Error('INVALID_GAME_PHASE')
    const alive = (game.players ?? []).filter(player => player.alive)
    setGameState({ type: 'MAFIA', phase: 'VOTING', myRole: game.myRole, alive: game.alive, players: game.players, mafiaTeammates: game.mafiaTeammates, investigationHistory: game.investigationHistory, vote: { round: 1, eligibleCandidates: alive.filter(player => player.playerId !== state.me.playerId).map(({ playerId, nickname }) => ({ playerId, nickname })), requiredVoteCount: alive.length, completedVoteCount: alive.length - 1, myVoteSubmitted: false } })
    emit('MAFIA_VOTE_STARTED')
    return { voteRound: 1 }
  },
  async submitMafiaVote(_roomId, _gameSessionId, input) {
    await wait()
    const state = room(); const game = state.gameSession?.gameState
    if (!game || game.type !== 'MAFIA' || (game.phase !== 'VOTING' && game.phase !== 'REVOTING')) throw new Error('INVALID_GAME_PHASE')
    const target = state.players.find(player => player.playerId === input.targetPlayerId) ?? state.players[2]
    if (input.voteRound === 1) {
      const otherTarget = game.vote.eligibleCandidates.find(candidate => candidate.playerId !== target.playerId) ?? game.vote.eligibleCandidates[0]
      const tiedCandidates = [{ playerId: target.playerId, nickname: target.nickname }, otherTarget]
      const tiedVoteCount = Math.floor(game.vote.requiredVoteCount / 2)
      const counts = tiedCandidates.map(candidate => ({ ...candidate, voteCount: tiedVoteCount }))
      const remainderTarget = game.vote.eligibleCandidates.find(candidate => tiedCandidates.every(tied => tied.playerId !== candidate.playerId))
      if (game.vote.requiredVoteCount % 2 === 1 && remainderTarget) counts.push({ ...remainderTarget, voteCount: 1 })
      setGameState({ type: 'MAFIA', phase: 'REVOTING', myRole: game.myRole, alive: game.alive, players: game.players, mafiaTeammates: game.mafiaTeammates, investigationHistory: game.investigationHistory, vote: { round: 2, eligibleCandidates: tiedCandidates, requiredVoteCount: game.vote.requiredVoteCount, completedVoteCount: game.vote.requiredVoteCount - 1, myVoteSubmitted: false }, previousVoteResult: { round: 1, tied: true, counts } })
      emit('MAFIA_REVOTE_STARTED', { voteRound: 2 })
      return
    }
    const otherCandidates = game.vote.eligibleCandidates.filter(candidate => candidate.playerId !== target.playerId)
    const targetVoteCount = Math.floor(game.vote.requiredVoteCount / 2) + 1
    const remainingVoteCount = Math.max(0, game.vote.requiredVoteCount - targetVoteCount)
    const counts = [
      { playerId: target.playerId, nickname: target.nickname, voteCount: targetVoteCount },
      ...otherCandidates.map((candidate, index) => ({ ...candidate, voteCount: index === 0 ? remainingVoteCount : 0 })),
    ]
    setGameState({ type: 'MAFIA', phase: 'VOTE_RESULT', myRole: game.myRole, alive: game.alive, players: game.players, mafiaTeammates: game.mafiaTeammates, investigationHistory: game.investigationHistory, voteResult: { round: input.voteRound, tied: false, counts, executionTargetPlayerId: target.playerId }, canAdvance: true })
    emit('MAFIA_VOTE_RESULT')
  },
  async submitMafiaJudgment(_roomId, _gameSessionId, choice) {
    await wait()
    const game = room().gameSession?.gameState
    if (!game || game.type !== 'MAFIA' || game.phase !== 'JUDGMENT' || !game.judgment.canVote || game.judgment.myVoteSubmitted) throw new Error('INVALID_GAME_PHASE')
    const executeCount = game.judgment.executeCount + (choice === 'EXECUTE' ? 1 : 0)
    const saveCount = game.judgment.saveCount + (choice === 'SAVE' ? 1 : 0)
    setGameState({ ...game, judgment: { ...game.judgment, executeCount, saveCount, completedVoteCount: 1, myVoteSubmitted: true } })
    emit('MAFIA_JUDGMENT_VOTED')
    window.setTimeout(() => {
      const currentGame = room().gameSession?.gameState
      if (!currentGame || currentGame.type !== 'MAFIA' || currentGame.phase !== 'JUDGMENT' || !currentGame.judgment.myVoteSubmitted) return
      const remainingVoteCount = Math.max(0, currentGame.judgment.requiredVoteCount - currentGame.judgment.completedVoteCount)
      const finalExecuteCount = currentGame.judgment.executeCount + Math.floor(remainingVoteCount / 2)
      const finalSaveCount = currentGame.judgment.saveCount + Math.ceil(remainingVoteCount / 2)
      setGameState({ type: 'MAFIA', phase: 'JUDGMENT_RESULT', myRole: currentGame.myRole, alive: currentGame.alive, players: currentGame.players, mafiaTeammates: currentGame.mafiaTeammates, investigationHistory: currentGame.investigationHistory, accusedPlayer: currentGame.accusedPlayer, executeCount: finalExecuteCount, saveCount: finalSaveCount, executed: finalExecuteCount > finalSaveCount, canAdvance: true })
      emit('MAFIA_PHASE_CHANGED', { phase: 'JUDGMENT_RESULT' })
    }, PHASE_TRANSITION_DELAY_MS)
  },
  async advanceMafia() {
    await wait()
    const state = room(); const game = state.gameSession?.gameState
    if (!game || game.type !== 'MAFIA') throw new Error('INVALID_GAME_PHASE')
    if (game.phase === 'VOTE_RESULT') {
      const targetId = game.voteResult.executionTargetPlayerId ?? 3
      const target = state.players.find(player => player.playerId === targetId) ?? state.players[2]
      const requiredVoteCount = Math.max(0, (game.players?.filter(player => player.alive).length ?? state.players.length) - 1)
      setGameState({ type: 'MAFIA', phase: 'JUDGMENT', myRole: game.myRole, alive: game.alive, players: game.players, mafiaTeammates: game.mafiaTeammates, investigationHistory: game.investigationHistory, accusedPlayer: { playerId: target.playerId, nickname: target.nickname }, judgment: { executeCount: 0, saveCount: 0, requiredVoteCount, completedVoteCount: 0, canVote: target.playerId !== state.me.playerId, myVoteSubmitted: false } })
    } else if (game.phase === 'JUDGMENT_RESULT') {
      if (!game.executed) {
        mafiaDayNo = 2
        const actionType = mafiaAction(game.myRole, false)
        const aliveCount = (game.players ?? []).filter(player => player.alive).length
        setGameState({ type: 'MAFIA', phase: 'NIGHT', nightNo: 2, myRole: game.myRole, alive: game.alive, mafiaTeammates: game.mafiaTeammates, players: game.players, investigationHistory: game.investigationHistory, nightAction: { actionType, submitted: false, eligibleTargets: mafiaCandidates(state, game.myRole) }, nightProgress: { completedActionCount: aliveCount - 1, requiredActionCount: aliveCount } })
        emit('MAFIA_PHASE_CHANGED', { phase: 'NIGHT' })
        return
      }
      const target = state.players.find(player => player.playerId === game.accusedPlayer.playerId) ?? state.players[2]
      const role = mafiaDayNo === 1 ? 'CITIZEN' : 'MAFIA'
      setGameState({ type: 'MAFIA', phase: 'EXECUTION', myRole: game.myRole, alive: game.alive, players: game.players?.map(player => player.playerId === target.playerId ? { ...player, alive: false, revealedRole: role } : player), mafiaTeammates: game.mafiaTeammates, investigationHistory: game.investigationHistory, executionResult: { playerId: target.playerId, nickname: target.nickname, revealedRole: role }, canAdvance: true })
    } else if (game.phase === 'EXECUTION') {
      if (mafiaDayNo > 1) {
        const selectedRole = mockMafiaRole()
        const result: Extract<MafiaGameState, { phase: 'FINISHED' }>['result'] = { winnerTeam: selectedRole === 'MAFIA' ? 'MAFIA_TEAM' : 'CITIZEN_TEAM', players: state.players.map((player, index) => ({ playerId: player.playerId, nickname: player.nickname, role: index === 0 ? selectedRole : selectedRole !== 'MAFIA' && index === 1 ? 'MAFIA' : index === 1 ? 'POLICE' : index === 2 ? 'DOCTOR' : 'CITIZEN', alive: selectedRole === 'MAFIA' ? index === 0 : index !== 1 })) }
        setGameState({ type: 'MAFIA', phase: 'FINISHED', result }, 'FINISHED'); emit('GAME_FINISHED'); return
      }
      mafiaDayNo = 2
      const actionType = mafiaAction(game.myRole, false)
      const aliveCount = (game.players ?? []).filter(player => player.alive).length
      setGameState({ type: 'MAFIA', phase: 'NIGHT', nightNo: 2, myRole: game.myRole, alive: game.alive, mafiaTeammates: game.mafiaTeammates, players: game.players, investigationHistory: game.investigationHistory, nightAction: { actionType, submitted: false, eligibleTargets: mafiaCandidates(state, game.myRole) }, nightProgress: { completedActionCount: aliveCount - 1, requiredActionCount: aliveCount } })
    } else if (game.phase === 'NIGHT_RESULT') {
      const mafiaCount = mafiaRoleComposition(state.players.length).mafia
      const deadCitizenTeamCount = game.players?.filter(player => !player.alive && player.revealedRole !== 'MAFIA').length ?? 0
      setGameState({ type: 'MAFIA', phase: 'DAY', dayNo: 2, myRole: game.myRole, alive: game.alive, players: game.players, mafiaTeammates: game.mafiaTeammates, investigationHistory: game.investigationHistory, remainingTeamCounts: { mafia: mafiaCount, citizenTeam: state.players.length - mafiaCount - deadCitizenTeamCount }, lastNightResult: game.nightResult })
    } else throw new Error('INVALID_GAME_PHASE')
    emit('MAFIA_PHASE_CHANGED')
  },
  subscribe(_roomId, listener, connection) {
    listeners.add(listener)
    connection(true)
    return () => listeners.delete(listener)
  },
}
