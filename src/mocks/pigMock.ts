import type { PigAction, PigGameState, PigPlayer } from '../features/games/pig/types'

// Rules live only in the mock server, never in the product UI.
export class PigMock {
  private players: PigPlayer[]
  private current = 0
  private score = 0
  private available = [1, 2, 3, 4, 5, 6]
  private last: number | null = null
  private outcome: 'STOPPED' | 'BUSTED' | null = null
  private lost = 0
  private requests = new Set<string>()
  private finished = false

  constructor(players: { playerId: number; nickname: string }[], private random = Math.random) {
    if (players.length < 2 || players.length > 6) throw { code: 'INVALID_PLAYER_COUNT' }
    this.players = players.map(p => ({ ...p, totalScore: 0, status: 'PLAYING', rank: null }))
  }

  snapshot(viewerId: number): PigGameState {
    if (this.finished) return { type: 'PIG', phase: 'FINISHED', targetScore: 50, allowedActions: [], rankings: this.players.map(p => ({ playerId: p.playerId, nickname: p.nickname, totalScore: p.totalScore, rank: p.rank! })).sort((a, b) => a.rank - b.rank) }
    return { type: 'PIG', phase: 'PLAYING', targetScore: 50, currentPlayerId: this.players[this.current].playerId, turnScore: this.score, availableDiceValues: [...this.available], removedDiceValues: [2, 3, 4, 5, 6].filter(n => !this.available.includes(n)), lastDiceValue: this.last, lastTurnOutcome: this.outcome, lostTurnScore: this.lost, bustProbability: 1 / this.available.length, players: this.players.map(p => ({ ...p })), allowedActions: viewerId !== this.players[this.current].playerId ? [] : this.score > 0 ? ['ROLL', 'STOP'] : ['ROLL'] }
  }

  act(playerId: number, action: PigAction, requestId: string) {
    if (this.requests.has(requestId)) return
    const view = this.snapshot(playerId)
    if (view.phase !== 'PLAYING' || !view.allowedActions.includes(action)) throw { code: 'INVALID_GAME_ACTION' }
    this.requests.add(requestId)
    this.outcome = null
    this.lost = 0
    if (action === 'ROLL') {
      this.last = this.available[Math.floor(this.random() * this.available.length)]
      if (this.last !== 1) {
        this.score += this.last
        this.available = this.available.filter(n => n !== this.last)
        return
      }
      this.outcome = 'BUSTED'
      this.lost = this.score
    } else {
      this.outcome = 'STOPPED'
      const player = this.players[this.current]
      player.totalScore += this.score
      if (player.totalScore >= 50) {
        player.rank = this.players.filter(p => p.status === 'FINISHED').length + 1
        player.status = 'FINISHED'
      }
    }
    this.score = 0
    this.available = [1, 2, 3, 4, 5, 6]
    const remaining = this.players.filter(p => p.status === 'PLAYING')
    if (remaining.length === 1) {
      remaining[0].rank = this.players.length
      remaining[0].status = 'FINISHED'
      this.finished = true
      return
    }
    do { this.current = (this.current + 1) % this.players.length } while (this.players[this.current].status === 'FINISHED')
  }
}
