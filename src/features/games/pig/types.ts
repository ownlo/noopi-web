export type PigAction = 'ROLL' | 'STOP'
export type PigRanking = { playerId: number; nickname: string; totalScore: number; rank: number }
export type PigPlayer = Omit<PigRanking, 'rank'> & { status: 'PLAYING' | 'FINISHED'; rank: number | null }
export type PigGameState =
  | { type: 'PIG'; phase: 'READY' }
  | { type: 'PIG'; phase: 'CANCELLED'; reason?: string }
  | { type: 'PIG'; phase: 'FINISHED'; targetScore: number; rankings: PigRanking[]; allowedActions: PigAction[] }
  | { type: 'PIG'; phase: 'PLAYING'; targetScore: number; currentPlayerId: number; turnScore: number; successfulRollCount: number; lastDiceValue: number | null; lastTurnOutcome: 'STOPPED' | 'BUSTED' | null; lostTurnScore: number; bustProbability: number; players: PigPlayer[]; allowedActions: PigAction[] }
