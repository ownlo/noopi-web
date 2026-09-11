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
  | { type: 'LIAR'; phase: 'DISCUSSION'; myRole: 'CITIZEN' | 'LIAR'; keyword: string | null; firstSpeakerPlayerId: number }
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
export type GameType = 'LIAR' | 'BLIND'
export type GameState = LiarGameState | BlindGameState
export type RoomState = { room: { roomId: number; roomCode: string; status: 'WAITING' | 'ACTIVE' | 'CLOSED'; hostPlayerId: number }; me: Player; players: Player[]; gameSession: null | { gameSessionId: number; gameType: GameType; status: 'READY' | 'PLAYING' | 'FINISHED' | 'CANCELLED'; gameState: GameState } }
export type GameCatalog = { games: { gameType: GameType; name: string; minPlayers: number; maxPlayers: number; enabled: boolean }[] }
export type CategoryCatalog = { categories: { code: string; name: string; virtual: boolean }[] }
export type RealtimeEvent = { eventId: string; type: string; roomId: number; gameSessionId: number | null; occurredAt: string; payload: Record<string, unknown> }

export interface NoopiApi {
  createRoom(input: { nickname: string; gender: Gender }): Promise<{ room: RoomState['room']; me: Player }>
  findRoom(roomCode: string): Promise<{ roomId: number; roomCode: string; status: string; playerCount: number; joinable: boolean }>
  joinRoom(roomId: number, input: { nickname: string; gender: Gender }): Promise<{ player: Player }>
  leaveRoom(roomId: number): Promise<void>
  getRoomState(roomId: number, signal?: AbortSignal): Promise<RoomState>
  getGames(): Promise<GameCatalog>
  getCategories(): Promise<CategoryCatalog>
  createGameSession(roomId: number, gameType: GameType, config: { categoryCode?: string }): Promise<{ gameSessionId: number; gameType: GameType; status: 'READY' }>
  startGame(roomId: number, gameSessionId: number): Promise<void>
  confirmRole(roomId: number, gameSessionId: number): Promise<void>
  startVote(roomId: number, gameSessionId: number): Promise<{ voteRound: number }>
  submitVote(roomId: number, gameSessionId: number, input: { voteRound: number; targetPlayerId: number }): Promise<void>
  submitGuess(roomId: number, gameSessionId: number, answer: string): Promise<{ correct: boolean }>
  submitBlindGuess(roomId: number, gameSessionId: number, answer: string): Promise<{ correct: boolean }>
  subscribe(roomId: number, listener: (event: RealtimeEvent) => void, connection: (connected: boolean) => void): () => void
}
