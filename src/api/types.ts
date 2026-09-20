export type Gender = 'MALE' | 'FEMALE'
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED'
export type Player = { playerId: number; nickname: string; gender: Gender; host: boolean; connectionStatus: ConnectionStatus; currentGameParticipant?: boolean }
export type Candidate = Pick<Player, 'playerId' | 'nickname'>
export type VoteCount = Candidate & { voteCount: number }
export type VoteState = { round: number; eligibleCandidates: Candidate[]; requiredVoteCount: number; completedVoteCount: number; myVoteSubmitted: boolean; playerVoteStatuses?: { playerId: number; submitted: boolean }[] }
export type VoteResult = { round: number; tied: boolean; counts: VoteCount[]; accusedPlayerId?: number | null }
export type LiarResult = { winner: 'CITIZEN' | 'LIAR'; liarPlayer: Candidate; keyword: string; accusedPlayer: Candidate; liarGuess: { answer: string; correct: boolean } | null }
export type LiarGameState =
  | { type: 'LIAR'; phase: 'READY'; categoryCode: string; categoryName: string }
  | { type: 'LIAR'; phase: 'ROLE_REVEAL'; myRole: 'CITIZEN' | 'LIAR'; keyword: string | null; roleChecked: boolean; roleCheckedCount: number; participantCount: number; playerRoleCheckStatuses: { playerId: number; checked: boolean }[] }
  | { type: 'LIAR'; phase: 'DISCUSSION'; myRole: 'CITIZEN' | 'LIAR'; keyword: string | null; speakingOrderPlayerIds: number[] }
  | { type: 'LIAR'; phase: 'VOTING' | 'REVOTING'; myRole: 'CITIZEN' | 'LIAR'; vote: VoteState; previousVoteResult?: VoteResult }
  | { type: 'LIAR'; phase: 'VOTE_RESULT'; myRole: 'CITIZEN' | 'LIAR'; voteResult: VoteResult }
  | { type: 'LIAR'; phase: 'LIAR_REVEAL'; myRole: 'CITIZEN' | 'LIAR'; accusedPlayer: Candidate; accusedWasLiar: boolean }
  | { type: 'LIAR'; phase: 'LIAR_GUESS'; myRole: 'CITIZEN' | 'LIAR'; liarPlayer: Candidate; guessSubmitted?: boolean }
  | { type: 'LIAR'; phase: 'FINISHED'; result: LiarResult }
  | { type: 'LIAR'; phase: 'CANCELLED'; reason?: string }
export type BlindResult = { winnerPlayer: Candidate; keywordAssignments: (Candidate & { keyword: string })[] }
export type BlindGameState =
  | { type: 'BLIND'; phase: 'READY' }
  | { type: 'BLIND'; phase: 'GUESSING'; opponentPlayer: Candidate; opponentKeyword: string }
  | { type: 'BLIND'; phase: 'FINISHED'; result: BlindResult }
  | { type: 'BLIND'; phase: 'CANCELLED'; reason?: string }
export type MafiaRole = 'MAFIA' | 'POLICE' | 'DOCTOR' | 'CITIZEN'
export type MafiaPlayer = Candidate & { alive: boolean; revealedRole: MafiaRole | null }
export type MafiaNightActionType = 'ATTACK' | 'INVESTIGATE' | 'HEAL' | 'SUSPECT' | 'CONFIRM'
export type Investigation = { nightNo: number; targetPlayerId: number; targetNickname: string; mafia: boolean }
export type MafiaVoteResult = Omit<VoteResult, 'accusedPlayerId'> & { executionTargetPlayerId?: number | null }
export type MafiaResult = { winnerTeam: 'MAFIA_TEAM' | 'CITIZEN_TEAM'; players: (Candidate & { role: MafiaRole; alive: boolean })[] }
export type MafiaRoleComposition = { mafia: number; police: number; doctor: number; citizen: number }
export type MafiaRemainingTeamCounts = { mafia: number; citizenTeam: number }
export type MafiaJudgmentChoice = 'EXECUTE' | 'SAVE'
export type MafiaJudgment = { executeCount: number; saveCount: number; requiredVoteCount: number; completedVoteCount: number; canVote: boolean; myVoteSubmitted: boolean }
type MafiaCommon = { type: 'MAFIA'; myRole: MafiaRole; alive: boolean; players?: MafiaPlayer[]; mafiaTeammates?: (Candidate & { alive: boolean })[]; investigationHistory?: Investigation[] }
export type MafiaGameState =
  | { type: 'MAFIA'; phase: 'READY'; participantCount: number; roleComposition: MafiaRoleComposition }
  | (MafiaCommon & { phase: 'ROLE_REVEAL'; roleChecked: boolean; roleCheckedCount: number; participantCount: number })
  | (MafiaCommon & { phase: 'FIRST_NIGHT' | 'NIGHT'; nightNo: number; nightAction?: { actionType: MafiaNightActionType; submitted: boolean; eligibleTargets?: Candidate[] }; nightProgress?: { completedActionCount: number; requiredActionCount: number } })
  | (MafiaCommon & { phase: 'DAY'; dayNo: number; remainingTeamCounts: MafiaRemainingTeamCounts; lastNightResult: { nightNo: number; deadPlayer: (Candidate & { revealedRole: MafiaRole }) | null; mySuspicionCount: number | null }; canAdvance?: boolean })
  | (MafiaCommon & { phase: 'VOTING' | 'REVOTING'; vote: Omit<VoteState, 'playerVoteStatuses'>; previousVoteResult?: MafiaVoteResult })
  | (MafiaCommon & { phase: 'VOTE_RESULT'; voteResult: MafiaVoteResult; canAdvance: boolean })
  | (MafiaCommon & { phase: 'JUDGMENT'; accusedPlayer: Candidate; judgment: MafiaJudgment })
  | (MafiaCommon & { phase: 'JUDGMENT_RESULT'; accusedPlayer: Candidate; executeCount: number; saveCount: number; executed: boolean; canAdvance: boolean })
  | (MafiaCommon & { phase: 'EXECUTION'; executionResult: Candidate & { revealedRole: MafiaRole }; canAdvance: boolean })
  | (MafiaCommon & { phase: 'NIGHT_RESULT'; nightResult: { nightNo: number; deadPlayer: (Candidate & { revealedRole: MafiaRole }) | null; mySuspicionCount: number | null }; canAdvance: boolean })
  | { type: 'MAFIA'; phase: 'FINISHED'; result: MafiaResult }
  | { type: 'MAFIA'; phase: 'CANCELLED'; reason?: string }
export type YutMode = 'INDIVIDUAL' | 'TEAM'
export type YutTeamId = 'NOOPI' | 'DAY'
export type YutResultCode = 'NAK' | 'BACK_DO' | 'DO' | 'GAE' | 'GEOL' | 'YUT' | 'MO'
export type YutThrowResult = { result: YutResultCode; steps: number; moveTokenId: string | null; bonusThrowGranted: boolean }
export type YutPiece = { pieceId: string; ownerType: 'PLAYER' | 'TEAM'; ownerId: string; status: 'READY' | 'ON_BOARD' | 'FINISHED'; nodeId: string | null; groupPieceIds: string[] }
export type YutMoveToken = { moveTokenId: string; result: Exclude<YutResultCode, 'NAK'>; steps: number }
export type YutAction =
  | { type: 'THROW_YUT' }
  | { type: 'SELECT_MOVE_TOKEN'; moveTokenIds: string[] }
  | { type: 'SELECT_PIECE'; moveTokenId: string; eligiblePieceIds: string[] }
  | { type: 'SELECT_PATH'; moveTokenId: string; pieceId: string; eligiblePathIds: string[] }
  | null
export type YutTeam = { team: YutTeamId; name: string; capacity: number; players: Candidate[] }
export type YutRanking = Candidate & { rank: number }
export type YutGameState =
  | { type: 'YUT'; phase: 'READY'; mode: 'INDIVIDUAL' }
  | { type: 'YUT'; phase: 'TEAM_SELECT'; mode: 'TEAM'; teams: YutTeam[]; myTeam: YutTeamId | null; selectableTeams: YutTeamId[]; canStart: boolean }
  | { type: 'YUT'; phase: 'PLAYING'; mode: YutMode; teams?: YutTeam[]; rankings: YutRanking[]; myRank: number | null; lastThrow: ({ sequence: number; turnNo: number; playerId: number } & Pick<YutThrowResult, 'result' | 'steps' | 'bonusThrowGranted'>) | null; turn: { turnNo: number; currentPlayerId: number; turnPhase: 'WAITING_THROW' | 'THROWING' | 'WAITING_MOVE' | 'WAITING_PATH_SELECTION' | 'MOVING'; throwResults: Exclude<YutResultCode, 'NAK'>[]; moveTokens: YutMoveToken[]; pendingBonusThrows: number }; pieces: YutPiece[]; finishedPieceCounts: { ownerId: string; count: number }[]; myAction: YutAction | null }
  | { type: 'YUT'; phase: 'FINISHED'; mode: 'INDIVIDUAL'; rankings: YutRanking[] }
  | { type: 'YUT'; phase: 'FINISHED'; mode: 'TEAM'; winnerTeam: YutTeam }
  | { type: 'YUT'; phase: 'CANCELLED'; reason?: string }
export type GameType = 'LIAR' | 'BLIND' | 'MAFIA' | 'YUT' | 'PIG' | 'TOOTH'
export type GameState = LiarGameState | BlindGameState | MafiaGameState | YutGameState | import('../features/games/pig/types').PigGameState | import('../features/games/tooth/types').ToothGameState
export type RoomState = { room: { roomId: number; roomCode: string; status: 'WAITING' | 'ACTIVE' | 'CLOSED'; hostPlayerId: number }; me: Player; players: Player[]; gameSession: null | { gameSessionId: number; gameType: GameType; status: 'READY' | 'PLAYING' | 'FINISHED' | 'CANCELLED'; gameState: GameState } }
export type GameCatalog = { games: { gameType: GameType; name: string; minPlayers: number; maxPlayers: number; enabled: boolean }[] }
export type CategoryCatalog = { categories: { code: string; name: string; virtual: boolean }[] }
export type RealtimeEvent = { eventId: string; type: string; roomId: number; gameSessionId: number | null; occurredAt: string; payload: Record<string, unknown> }

export interface NoopiApi {
  rollPig(roomId: number, gameSessionId: number, requestId: string): Promise<void>
  stopPig(roomId: number, gameSessionId: number, requestId: string): Promise<void>
  selectTooth(roomId: number, gameSessionId: number, toothId: number, requestId: string): Promise<import('../features/games/tooth/types').ToothSelectionResponse>
  createRoom(input: { nickname: string; gender: Gender }): Promise<{ room: RoomState['room']; me: Player }>
  findRoom(roomCode: string): Promise<{ roomId: number; roomCode: string; status: string; playerCount: number; joinable: boolean }>
  joinRoom(roomId: number, input: { nickname: string; gender: Gender }): Promise<{ player: Player }>
  leaveRoom(roomId: number): Promise<void>
  returnToLobby(roomId: number): Promise<void>
  getRoomState(roomId: number, signal?: AbortSignal): Promise<RoomState>
  getGames(): Promise<GameCatalog>
  getCategories(): Promise<CategoryCatalog>
  createGameSession(roomId: number, gameType: GameType, config: { categoryCode?: string; mode?: YutMode }): Promise<{ gameSessionId: number; gameType: GameType; status: 'READY' }>
  startGame(roomId: number, gameSessionId: number): Promise<void>
  confirmRole(roomId: number, gameSessionId: number): Promise<void>
  startVote(roomId: number, gameSessionId: number): Promise<{ voteRound: number }>
  submitVote(roomId: number, gameSessionId: number, input: { voteRound: number; targetPlayerId: number }): Promise<void>
  submitGuess(roomId: number, gameSessionId: number, answer: string): Promise<{ correct: boolean }>
  submitBlindGuess(roomId: number, gameSessionId: number, answer: string): Promise<{ correct: boolean }>
  confirmMafiaRole(roomId: number, gameSessionId: number): Promise<void>
  submitMafiaNightAction(roomId: number, gameSessionId: number, input: { actionType: MafiaNightActionType; targetPlayerId?: number }): Promise<{ actionType: MafiaNightActionType; result?: { targetPlayerId: number; mafia: boolean } }>
  startMafiaVote(roomId: number, gameSessionId: number): Promise<{ voteRound: number }>
  submitMafiaVote(roomId: number, gameSessionId: number, input: { voteRound: number; targetPlayerId: number }): Promise<void>
  submitMafiaJudgment(roomId: number, gameSessionId: number, choice: MafiaJudgmentChoice): Promise<void>
  advanceMafia(roomId: number, gameSessionId: number): Promise<void>
  selectYutTeam(roomId: number, gameSessionId: number, team: YutTeamId): Promise<void>
  throwYut(roomId: number, gameSessionId: number): Promise<YutThrowResult>
  selectYutMoveToken(roomId: number, gameSessionId: number, moveTokenId: string): Promise<void>
  selectYutPiece(roomId: number, gameSessionId: number, pieceId: string): Promise<void>
  selectYutPath(roomId: number, gameSessionId: number, pathId: string): Promise<void>
  subscribe(roomId: number, listener: (event: RealtimeEvent) => void, connection: (connected: boolean) => void): () => void
}
