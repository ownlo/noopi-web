import type { Candidate } from '../../../api/types'

export type ToothOutcome = 'SAFE' | 'BOMB'
export type ToothStatus = 'AVAILABLE' | 'SELECTED'
export type ToothRow = 'UPPER' | 'LOWER'
export type Tooth = { toothId: number; row: ToothRow; status: ToothStatus }
export type ToothSelection = {
  sequence: number
  playerId: number
  toothId: number
  outcome: ToothOutcome
}
export type ToothSelectionResponse = ToothSelection & { nextCurrentTurnPlayerId: number | null }

export type ToothGameState =
  | { type: 'TOOTH'; phase: 'READY' }
  | { type: 'TOOTH'; phase: 'CANCELLED'; reason?: string }
  | {
      type: 'TOOTH'
      phase: 'PLAYING'
      turnOrderPlayerIds: number[]
      currentTurnPlayerId: number
      remainingToothCount: number
      teeth: Tooth[]
      lastSelection: ToothSelection | null
      allowedActions: Array<'SELECT_TOOTH'>
    }
  | {
      type: 'TOOTH'
      phase: 'FINISHED'
      turnOrderPlayerIds: number[]
      currentTurnPlayerId: null
      remainingToothCount: number
      teeth: Tooth[]
      lastSelection: ToothSelection
      result: { loserPlayer: Candidate; bombToothId: number }
      allowedActions: []
    }
