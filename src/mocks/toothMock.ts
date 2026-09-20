import type { Candidate, Player } from '../api/types'
import type { Tooth, ToothGameState, ToothSelectionResponse } from '../features/games/tooth/types'

export class ToothMock {
  private readonly players: Player[]
  private readonly turnOrderPlayerIds: number[]
  private readonly bombToothId: number
  private readonly selectedToothIds = new Set<number>()
  private readonly responses = new Map<string, ToothSelectionResponse>()
  private currentTurnIndex = 0
  private sequence = 0
  private lastSelection: ToothSelectionResponse | null = null
  private loserPlayerId: number | null = null

  constructor(players: Player[], random: () => number = Math.random) {
    if (players.length < 2 || players.length > 8) throw { code: 'INVALID_PLAYER_COUNT' }
    this.players = players.map(player => ({ ...player }))
    this.bombToothId = Math.min(24, Math.max(1, Math.floor(random() * 24) + 1))
    this.turnOrderPlayerIds = players.map(player => player.playerId)
    for (let index = this.turnOrderPlayerIds.length - 1; index > 0; index -= 1) {
      const target = Math.min(index, Math.floor(random() * (index + 1)))
      ;[this.turnOrderPlayerIds[index], this.turnOrderPlayerIds[target]] = [this.turnOrderPlayerIds[target], this.turnOrderPlayerIds[index]]
    }
  }

  get currentPlayerId() { return this.loserPlayerId === null ? this.turnOrderPlayerIds[this.currentTurnIndex] : null }

  select(playerId: number, toothId: number, requestId: string): ToothSelectionResponse {
    const processed = this.responses.get(requestId)
    if (processed) return processed
    if (this.loserPlayerId !== null) throw { code: 'INVALID_GAME_ACTION' }
    if (this.currentPlayerId !== playerId) throw { code: 'NOT_CURRENT_TURN' }
    if (!Number.isInteger(toothId) || toothId < 1 || toothId > 24) throw { code: 'INVALID_TOOTH_ID' }
    if (this.selectedToothIds.has(toothId)) throw { code: 'TOOTH_ALREADY_SELECTED' }

    this.selectedToothIds.add(toothId)
    this.sequence += 1
    const outcome = toothId === this.bombToothId ? 'BOMB' : 'SAFE'
    if (outcome === 'BOMB') this.loserPlayerId = playerId
    else this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrderPlayerIds.length
    const response: ToothSelectionResponse = {
      sequence: this.sequence,
      playerId,
      toothId,
      outcome,
      nextCurrentTurnPlayerId: this.currentPlayerId,
    }
    this.lastSelection = response
    this.responses.set(requestId, response)
    return response
  }

  snapshot(viewerPlayerId: number): ToothGameState {
    const teeth: Tooth[] = Array.from({ length: 24 }, (_, index) => ({
      toothId: index + 1,
      row: index < 12 ? 'UPPER' : 'LOWER',
      status: this.selectedToothIds.has(index + 1) ? 'SELECTED' : 'AVAILABLE',
    }))
    const base = {
      type: 'TOOTH' as const,
      turnOrderPlayerIds: [...this.turnOrderPlayerIds],
      remainingToothCount: 24 - this.selectedToothIds.size,
      teeth,
    }
    if (this.loserPlayerId !== null && this.lastSelection) {
      const loser = this.players.find(player => player.playerId === this.loserPlayerId)
      if (!loser) throw new Error('TOOTH_LOSER_NOT_FOUND')
      const loserPlayer: Candidate = { playerId: loser.playerId, nickname: loser.nickname }
      return { ...base, phase: 'FINISHED', currentTurnPlayerId: null, lastSelection: this.lastSelection, result: { loserPlayer, bombToothId: this.bombToothId }, allowedActions: [] }
    }
    return {
      ...base,
      phase: 'PLAYING',
      currentTurnPlayerId: this.turnOrderPlayerIds[this.currentTurnIndex],
      lastSelection: this.lastSelection,
      allowedActions: this.currentPlayerId === viewerPlayerId ? ['SELECT_TOOTH'] : [],
    }
  }
}
