import type { BlindGameState, Candidate, CategoryCatalog, GameCatalog, GameState, MafiaGameState, MafiaNightActionType, MafiaRole, NoopiApi, Player, RealtimeEvent, RoomState, YutGameState, YutMode, YutPiece, YutResultCode, YutTeam, YutTeamId } from '../api/types'

const wait = (ms = 180) => new Promise(resolve => window.setTimeout(resolve, ms))
const PHASE_TRANSITION_DELAY_MS = 3_000
const YUT_OPPONENT_THROW_DELAY_MS = 900
const YUT_OPPONENT_MOVE_DELAY_MS = 1_900
const listeners = new Set<(event: RealtimeEvent) => void>()

const games: GameCatalog = { games: [{ gameType: 'LIAR', name: '라이어 게임', minPlayers: 3, maxPlayers: 12, enabled: true }, { gameType: 'BLIND', name: '블라인드 게임', minPlayers: 2, maxPlayers: 2, enabled: true }, { gameType: 'MAFIA', name: '마피아 게임', minPlayers: 4, maxPlayers: 12, enabled: true }, { gameType: 'YUT', name: '윷놀이', minPlayers: 2, maxPlayers: 4, enabled: true }] }
const categories: CategoryCatalog = { categories: [
  { code: 'RANDOM', name: '랜덤', virtual: true },
  { code: 'FOOD', name: '음식', virtual: false },
  { code: 'PLACE', name: '장소', virtual: false },
] }

let nextRoomId = 100
let nextSessionId = 500
let currentRoom: RoomState | null = null
let mafiaDayNo = 1
let yutSelectedTokenId: string | null = null
let yutSelectedPieceId: string | null = null
let yutThrowIndex = 0
let yutThrowSequence = 0

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

function yutTeams(state: RoomState, myTeam: YutTeamId | null = null): YutTeam[] {
  const others = state.players.filter(player => player.playerId !== state.me.playerId)
  const noopiPlayers = [others[0], ...(myTeam === 'NOOPI' ? [state.me] : [])].filter(Boolean).map(({ playerId, nickname }) => ({ playerId, nickname }))
  const dayPlayers = [others[1], others[2], ...(myTeam === 'DAY' ? [state.me] : [])].filter(Boolean).slice(0, 2).map(({ playerId, nickname }) => ({ playerId, nickname }))
  return [{ team: 'NOOPI', name: '누피팀', capacity: 2, players: noopiPlayers }, { team: 'DAY', name: '데이팀', capacity: 2, players: dayPlayers }]
}

function yutPieces(state: RoomState, mode: YutMode): YutPiece[] {
  const owners = mode === 'TEAM' ? ['NOOPI', 'DAY'] : state.players.map(player => String(player.playerId))
  return owners.flatMap(ownerId => Array.from({ length: 4 }, (_, index) => ({ pieceId: `${ownerId}-${index + 1}`, ownerType: mode === 'TEAM' ? 'TEAM' as const : 'PLAYER' as const, ownerId, status: 'READY' as const, nodeId: null, groupPieceIds: [`${ownerId}-${index + 1}`] })))
}

function activeYut(): Extract<YutGameState, { phase: 'PLAYING' }> {
  const game = room().gameSession?.gameState
  if (!game || game.type !== 'YUT' || game.phase !== 'PLAYING') throw new Error('INVALID_GAME_PHASE')
  return game
}

function yutOwnerId(game: Extract<YutGameState, { phase: 'PLAYING' }>) {
  if (game.mode === 'INDIVIDUAL') return String(game.turn.currentPlayerId)
  return game.teams?.find(team => team.players.some(player => player.playerId === game.turn.currentPlayerId))?.team ?? 'NOOPI'
}

function yutEligiblePieceIds(game: Extract<YutGameState, { phase: 'PLAYING' }>, result?: YutResultCode) {
  const ownerId = yutOwnerId(game)
  return game.pieces.filter(piece => piece.ownerId === ownerId && (result === 'BACK_DO' ? piece.status === 'ON_BOARD' : piece.status !== 'FINISHED') && piece.groupPieceIds[0] === piece.pieceId).map(piece => piece.pieceId)
}

function resolveYutThrow(game: Extract<YutGameState, { phase: 'PLAYING' }>) {
  const sequence: Exclude<YutResultCode, 'NAK'>[] = ['YUT', 'GAE', 'BACK_DO', 'GEOL', 'DO', 'MO']
  const ownerId = yutOwnerId(game)
  const hasBackDoPreview = game.pieces.some(piece => piece.ownerId === ownerId && piece.status === 'ON_BOARD' && piece.nodeId === 'OUTER_2')
    && game.pieces.some(piece => piece.ownerId === ownerId && piece.status === 'ON_BOARD' && piece.nodeId === 'OUTER_1')
  const result: YutResultCode = yutThrowIndex % 20 === 19 ? 'NAK' : hasBackDoPreview ? 'BACK_DO' : sequence[yutThrowIndex % sequence.length]
  yutThrowIndex++
  yutThrowSequence++
  const steps = { NAK: 0, BACK_DO: -1, DO: 1, GAE: 2, GEOL: 3, YUT: 4, MO: 5 }[result]
  const lastThrow = { sequence: yutThrowSequence, turnNo: game.turn.turnNo, playerId: game.turn.currentPlayerId, result, steps, bonusThrowGranted: result === 'YUT' || result === 'MO' }
  if (result === 'NAK') {
    const state = room()
    const order = game.mode === 'TEAM'
      ? [0, 1].flatMap(index => (game.teams ?? []).flatMap(team => team.players[index] ? [team.players[index].playerId] : []))
      : state.players.filter(player => game.pieces.some(piece => piece.ownerId === String(player.playerId))).map(player => player.playerId)
    const currentPlayerId = order[(order.indexOf(game.turn.currentPlayerId) + 1) % order.length]
    const turnNo = game.turn.turnNo + 1
    setGameState({ ...game, lastThrow, turn: { ...game.turn, currentPlayerId, turnNo, turnPhase: 'WAITING_THROW', throwResults: [], moveTokens: [], pendingBonusThrows: 0 }, myAction: { type: 'THROW_YUT' } })
    yutSelectedTokenId = null; yutSelectedPieceId = null
    emit('YUT_THROW_RESOLVED', { playerId: game.turn.currentPlayerId, result, steps, bonusThrowGranted: false })
    emit('YUT_TURN_CHANGED', { turnNo, currentPlayerId })
    if (currentPlayerId !== state.me.playerId) scheduleYutOpponentTurn(turnNo, currentPlayerId)
    return { result, steps, moveTokenId: null, bonusThrowGranted: false }
  }
  const moveTokenId = `mock-yut-${yutThrowIndex}`
  const bonusThrowGranted = result === 'YUT' || result === 'MO'
  const moveTokens = [...game.turn.moveTokens, { moveTokenId, result, steps }]
  const pendingBonusThrows = Math.max(0, game.turn.pendingBonusThrows - 1) + (bonusThrowGranted ? 1 : 0)
  const myAction = pendingBonusThrows > 0
    ? { type: 'THROW_YUT' as const }
    : { type: 'SELECT_MOVE_TOKEN' as const, moveTokenIds: moveTokens.map(item => item.moveTokenId) }
  setGameState({ ...game, lastThrow, turn: { ...game.turn, turnPhase: pendingBonusThrows > 0 ? 'WAITING_THROW' : 'WAITING_MOVE', throwResults: [...game.turn.throwResults, result], moveTokens, pendingBonusThrows }, myAction })
  emit('YUT_THROW_RESOLVED', { playerId: game.turn.currentPlayerId, result, steps, bonusThrowGranted })
  return { result, steps, moveTokenId, bonusThrowGranted }
}

function scheduleYutOpponentTurn(turnNo: number, playerId: number) {
  window.setTimeout(() => {
    const state = room()
    const game = state.gameSession?.gameState
    if (!game || game.type !== 'YUT' || game.phase !== 'PLAYING' || game.turn.turnNo !== turnNo || game.turn.currentPlayerId !== playerId || state.me.playerId === playerId || game.myAction?.type !== 'THROW_YUT') return
    const result = resolveYutThrow(game)
    if (result.result === 'NAK') return
    const updated = activeYut()
    if (updated.myAction?.type === 'THROW_YUT') {
      scheduleYutOpponentTurn(turnNo, playerId)
      return
    }
    window.setTimeout(() => {
      const current = activeYut()
      if (current.turn.turnNo !== turnNo || current.turn.currentPlayerId !== playerId || (current.myAction?.type !== 'SELECT_MOVE_TOKEN' && current.myAction?.type !== 'SELECT_PIECE')) return
      const tokenId = current.myAction.type === 'SELECT_MOVE_TOKEN' ? current.myAction.moveTokenIds[0] : current.myAction.moveTokenId
      const selectedToken = current.turn.moveTokens.find(item => item.moveTokenId === tokenId)
      const eligiblePieceIds = current.myAction.type === 'SELECT_PIECE' ? current.myAction.eligiblePieceIds : yutEligiblePieceIds(current, selectedToken?.result)
      const piece = current.pieces.find(item => eligiblePieceIds.includes(item.pieceId))
      if (!tokenId) return
      if (!piece) {
        if (selectedToken?.result === 'BACK_DO') void mockApi.selectYutMoveToken(0, 0, tokenId)
        return
      }
      yutSelectedTokenId = tokenId
      yutSelectedPieceId = piece.pieceId
      finishYutMove(current, piece.pieceId)
    }, YUT_OPPONENT_MOVE_DELAY_MS)
  }, YUT_OPPONENT_THROW_DELAY_MS)
}

function finishYutMove(game: Extract<YutGameState, { phase: 'PLAYING' }>, pieceId: string) {
  const state = room()
  const token = game.turn.moveTokens.find(item => item.moveTokenId === yutSelectedTokenId)
  if (!token) throw new Error('MOVE_TOKEN_NOT_FOUND')
  // Mock server owns stacking; product views only render groupPieceIds.
  const selectedPiece = game.pieces.find(piece => piece.pieceId === pieceId)
  if (!selectedPiece) throw new Error('PIECE_NOT_ELIGIBLE')
  const movingIds = selectedPiece.groupPieceIds
  const currentIndex = selectedPiece.status === 'READY' ? -1 : Number(selectedPiece.nodeId?.replace('OUTER_', '') ?? 0) - 1
  const nextIndex = currentIndex + token.steps
  const backDoFinished = token.result === 'BACK_DO' && selectedPiece.nodeId === 'OUTER_20'
  const destination = token.result === 'BACK_DO' && selectedPiece.nodeId === 'OUTER_1'
    ? 'OUTER_20'
    : nextIndex > 19 || backDoFinished ? null : `OUTER_${nextIndex + 1}`
  const stackedPieceIds = destination === null ? [] : game.pieces.filter(piece => piece.ownerId === selectedPiece.ownerId && piece.status === 'ON_BOARD' && piece.nodeId === destination && !movingIds.includes(piece.pieceId)).map(piece => piece.pieceId)
  const groupPieceIds = [...movingIds, ...stackedPieceIds]
  const capturedPieceIds = destination === null ? [] : game.pieces.filter(piece => piece.ownerId !== selectedPiece.ownerId && piece.status === 'ON_BOARD' && piece.nodeId === destination).map(piece => piece.pieceId)
  const bonusThrowGranted = capturedPieceIds.length > 0
  const pendingBonusThrows = game.turn.pendingBonusThrows + (bonusThrowGranted ? 1 : 0)
  const pieces = game.pieces.map(piece => {
    if (capturedPieceIds.includes(piece.pieceId)) return { ...piece, status: 'READY' as const, nodeId: null, groupPieceIds: [piece.pieceId] }
    if (!groupPieceIds.includes(piece.pieceId)) return piece
    return { ...piece, status: destination === null ? 'FINISHED' as const : 'ON_BOARD' as const, nodeId: destination, groupPieceIds }
  })
  const ownerId = yutOwnerId(game)
  const finishedCount = pieces.filter(piece => piece.ownerId === ownerId && piece.status === 'FINISHED').length
  if (finishedCount === 4) {
    const winnerTeam = game.mode === 'TEAM' ? game.teams?.find(team => team.team === ownerId) : undefined
    setGameState({ type: 'YUT', phase: 'FINISHED', mode: game.mode, winnerPlayer: game.mode === 'INDIVIDUAL' ? { playerId: game.turn.currentPlayerId, nickname: state.players.find(player => player.playerId === game.turn.currentPlayerId)!.nickname } : undefined, winnerTeam }, 'FINISHED')
    emit('GAME_FINISHED')
    return
  }
  const moveTokens = game.turn.moveTokens.filter(item => item.moveTokenId !== token.moveTokenId)
  const myAction = moveTokens.length > 0 ? { type: 'SELECT_MOVE_TOKEN' as const, moveTokenIds: moveTokens.map(item => item.moveTokenId) } : { type: 'THROW_YUT' as const }
  const turnEnded = moveTokens.length === 0 && pendingBonusThrows === 0
  const order = game.mode === 'TEAM'
    ? [0, 1].flatMap(index => (game.teams ?? []).flatMap(team => team.players[index] ? [team.players[index].playerId] : []))
    : state.players.filter(player => game.pieces.some(piece => piece.ownerId === String(player.playerId))).map(player => player.playerId)
  const currentPlayerId = turnEnded ? order[(order.indexOf(game.turn.currentPlayerId) + 1) % order.length] : game.turn.currentPlayerId
  const turnNo = game.turn.turnNo + (turnEnded ? 1 : 0)
  setGameState({ ...game, pieces, finishedPieceCounts: game.finishedPieceCounts.map(item => item.ownerId === ownerId ? { ...item, count: finishedCount } : item), turn: { ...game.turn, currentPlayerId, turnNo, pendingBonusThrows, turnPhase: myAction.type === 'THROW_YUT' ? 'WAITING_THROW' : 'WAITING_MOVE', throwResults: turnEnded ? [] : game.turn.throwResults, moveTokens }, myAction })
  yutSelectedTokenId = null; yutSelectedPieceId = null
  const movedPiece = pieces.find(piece => piece.pieceId === pieceId)!
  emit('YUT_PIECE_MOVED', { playerId: game.turn.currentPlayerId, pieceIds: movingIds, fromNodeId: selectedPiece.nodeId, toNodeId: movedPiece.nodeId, finished: movedPiece.status === 'FINISHED', stackedPieceIds, capturedPieceIds, bonusThrowGranted })
  if (turnEnded) {
    emit('YUT_TURN_CHANGED', { turnNo, currentPlayerId })
    if (currentPlayerId !== state.me.playerId) scheduleYutOpponentTurn(turnNo, currentPlayerId)
  }
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
  async getRoomState() {
    await wait(80)
    const state = structuredClone(room())
    const game = state.gameSession?.gameState
    if (game?.type === 'YUT' && game.phase === 'PLAYING' && game.turn.currentPlayerId !== state.me.playerId) game.myAction = null
    return state
  },
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
    } else if (gameType === 'YUT') {
      const mode = config.mode
      if (mode !== 'INDIVIDUAL' && mode !== 'TEAM') throw new Error('INVALID_GAME_CONFIG')
      if (mode === 'TEAM' && state.players.length !== 4) throw new Error('INVALID_PLAYER_COUNT')
      const teams = yutTeams(state)
      state.gameSession = { gameSessionId, gameType, status: 'READY', gameState: mode === 'TEAM' ? { type: 'YUT', phase: 'TEAM_SELECT', mode, teams, myTeam: null, selectableTeams: teams.filter(team => team.players.length < team.capacity).map(team => team.team), canStart: false } : { type: 'YUT', phase: 'READY', mode } }
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
    if (state.gameSession?.gameType === 'YUT') {
      const current = state.gameSession.gameState
      if (current.type !== 'YUT' || (current.phase !== 'READY' && current.phase !== 'TEAM_SELECT')) throw new Error('INVALID_GAME_PHASE')
      if (current.phase === 'TEAM_SELECT' && !current.canStart) throw new Error('TEAM_SELECTION_INCOMPLETE')
      const mode = current.mode
      const teams = current.phase === 'TEAM_SELECT' ? current.teams : undefined
      const pieces = yutPieces(state, mode)
      const ownerIds = mode === 'TEAM' ? ['NOOPI', 'DAY'] : state.players.map(player => String(player.playerId))
      yutThrowIndex = 0; yutThrowSequence = 0; yutSelectedTokenId = null; yutSelectedPieceId = null
      setGameState({ type: 'YUT', phase: 'PLAYING', mode, teams, lastThrow: null, turn: { turnNo: 1, currentPlayerId: state.me.playerId, turnPhase: 'WAITING_THROW', throwResults: [], moveTokens: [], pendingBonusThrows: 0 }, pieces, finishedPieceCounts: ownerIds.map(ownerId => ({ ownerId, count: 0 })), myAction: { type: 'THROW_YUT' } })
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
  async selectYutTeam(_roomId, _gameSessionId, team) {
    await wait()
    const state = room(); const game = state.gameSession?.gameState
    if (!game || game.type !== 'YUT' || game.phase !== 'TEAM_SELECT') throw new Error('INVALID_GAME_PHASE')
    const teams = yutTeams(state, team)
    const selected = teams.find(item => item.team === team)
    if (!selected || !selected.players.some(player => player.playerId === state.me.playerId)) throw new Error('TEAM_FULL')
    setGameState({ ...game, teams, myTeam: team, selectableTeams: teams.filter(item => item.players.length < item.capacity || item.team === team).map(item => item.team), canStart: teams.every(item => item.players.length === item.capacity) }, 'READY')
    emit('YUT_TEAM_CHANGED', { playerId: state.me.playerId, team })
  },
  async throwYut() {
    await wait(420)
    const game = activeYut()
    if (game.myAction?.type !== 'THROW_YUT') throw new Error('INVALID_TURN_PHASE')
    return resolveYutThrow(game)
  },
  async selectYutMoveToken(_roomId, _gameSessionId, moveTokenId) {
    await wait()
    const game = activeYut()
    if (game.myAction?.type !== 'SELECT_MOVE_TOKEN' || !game.myAction.moveTokenIds.includes(moveTokenId)) throw new Error('MOVE_TOKEN_NOT_FOUND')
    yutSelectedTokenId = moveTokenId
    const token = game.turn.moveTokens.find(item => item.moveTokenId === moveTokenId)
    const eligiblePieceIds = yutEligiblePieceIds(game, token?.result)
    if (token?.result === 'BACK_DO' && eligiblePieceIds.length === 0) {
      const moveTokens = game.turn.moveTokens.filter(item => item.moveTokenId !== moveTokenId)
      const turnEnded = moveTokens.length === 0 && game.turn.pendingBonusThrows === 0
      const state = room()
      const order = game.mode === 'TEAM'
        ? [0, 1].flatMap(index => (game.teams ?? []).flatMap(team => team.players[index] ? [team.players[index].playerId] : []))
        : state.players.filter(player => game.pieces.some(piece => piece.ownerId === String(player.playerId))).map(player => player.playerId)
      const currentPlayerId = turnEnded ? order[(order.indexOf(game.turn.currentPlayerId) + 1) % order.length] : game.turn.currentPlayerId
      const turnNo = game.turn.turnNo + (turnEnded ? 1 : 0)
      const myAction = moveTokens.length > 0
        ? { type: 'SELECT_MOVE_TOKEN' as const, moveTokenIds: moveTokens.map(item => item.moveTokenId) }
        : { type: 'THROW_YUT' as const }
      setGameState({ ...game, turn: { ...game.turn, currentPlayerId, turnNo, throwResults: turnEnded ? [] : game.turn.throwResults, moveTokens, turnPhase: myAction.type === 'THROW_YUT' ? 'WAITING_THROW' : 'WAITING_MOVE' }, myAction })
      yutSelectedTokenId = null
      if (turnEnded) {
        emit('YUT_TURN_CHANGED', { turnNo, currentPlayerId })
        if (currentPlayerId !== state.me.playerId) scheduleYutOpponentTurn(turnNo, currentPlayerId)
      }
      return
    }
    setGameState({ ...game, myAction: { type: 'SELECT_PIECE', moveTokenId, eligiblePieceIds } })
  },
  async selectYutPiece(_roomId, _gameSessionId, pieceId) {
    await wait()
    const game = activeYut()
    if (game.myAction?.type !== 'SELECT_PIECE' || !game.myAction.eligiblePieceIds.includes(pieceId)) throw new Error('PIECE_NOT_ELIGIBLE')
    const piece = game.pieces.find(item => item.pieceId === pieceId)
    yutSelectedPieceId = pieceId
    if (piece?.nodeId === 'OUTER_4') {
      setGameState({ ...game, turn: { ...game.turn, turnPhase: 'WAITING_PATH_SELECTION' }, myAction: { type: 'SELECT_PATH', moveTokenId: game.myAction.moveTokenId, pieceId, eligiblePathIds: ['OUTER_ROUTE', 'CENTER_SHORTCUT_A'] } })
      return
    }
    finishYutMove(game, pieceId)
  },
  async selectYutPath(_roomId, _gameSessionId, pathId) {
    await wait()
    const game = activeYut()
    if (game.myAction?.type !== 'SELECT_PATH' || !game.myAction.eligiblePathIds.includes(pathId) || !yutSelectedPieceId) throw new Error('PATH_NOT_ELIGIBLE')
    finishYutMove(game, yutSelectedPieceId)
  },
  subscribe(_roomId, listener, connection) {
    listeners.add(listener)
    connection(true)
    return () => listeners.delete(listener)
  },
}
