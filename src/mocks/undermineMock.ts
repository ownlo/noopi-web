import type { Player } from '../api/types'
import type { UnderMineBoardCard, UnderMineCard, UnderMineCardOption, UnderMineCardPlayInput, UnderMineCardPlayResponse, UnderMineGameState, UnderMineRoundResult, UnderMineTool } from '../features/games/undermine/types'

export class UnderMineMock {
  private roundNo = 1
  private phase: UnderMineGameState['phase'] = 'READY'
  private checked = false
  private sequence = 0
  private board: UnderMineBoardCard[] = [{ boardCardId: 'start', x: 0, y: 0, pathPatternCode: 'N-E-S-W', rotation: 0, kind: 'START' }]
  private hand: UnderMineCard[] = []
  private drawPileCount = 0
  private broken = new Map<number, UnderMineTool[]>()
  private gold = new Map<number, number>()
  private lastAction?: { playerId: number; label: string }
  private mapResult: Extract<UnderMineGameState, { phase: 'PLAYING' }>['mapResult'] = null
  private result?: UnderMineRoundResult
  private results: UnderMineRoundResult[] = []
  private selectedGold = new Set<string>()

  constructor(private players: Player[]) {
    players.forEach(player => this.gold.set(player.playerId, 0))
    this.deal()
  }

  private deal() {
    const r = this.roundNo
    const handSize = this.players.length <= 5 ? 6 : this.players.length <= 7 ? 5 : 4
    this.hand = [
      { cardId: `path-${r}-1`, kind: 'PATH', name: '길 카드', description: '통로를 연결해요', pathPatternCode: 'PATH_STRAIGHT_HORIZONTAL' },
      { cardId: `path-${r}-2`, kind: 'PATH', name: '길 카드', description: '통로를 연결해요', pathPatternCode: 'PATH_NORTH_EAST_WEST' },
      { cardId: `break-pickaxe-${r}`, kind: 'BREAK_TOOL', name: '곡괭이 고장', description: '곡괭이를 고장 내요', toolType: 'PICKAXE' },
      { cardId: `break-lantern-${r}`, kind: 'BREAK_TOOL', name: '랜턴 고장', description: '랜턴을 고장 내요', toolType: 'LANTERN' },
      { cardId: `break-cart-${r}`, kind: 'BREAK_TOOL', name: '광차 고장', description: '광차를 고장 내요', toolType: 'CART' },
      { cardId: `map-${r}`, kind: 'MAP', name: '비밀 지도', description: '목적지 하나를 확인해요' },
    ].slice(0, handSize) as UnderMineCard[]
    this.drawPileCount = Math.max(0, 67 - handSize * this.players.length)
  }

  private drawCard(): UnderMineCard {
    const cardId = `draw-${this.roundNo}-${this.sequence}`
    const patterns = ['PATH_STRAIGHT_HORIZONTAL', 'PATH_NORTH_EAST_SOUTH', 'PATH_CROSS_CONNECTED']
    if (this.sequence % 4 === 1) return { cardId, kind: 'REPAIR_TOOL', name: '장비 수리', description: '가장 먼저 고장 난 장비를 고쳐요' }
    if (this.sequence % 4 === 2) return { cardId, kind: 'DESTROY_PATH', name: '파괴', description: '놓인 길 하나를 없애요' }
    return { cardId, kind: 'PATH', name: '길 카드', description: '통로를 연결해요', pathPatternCode: patterns[this.sequence % patterns.length] }
  }

  start() { this.phase = 'ROLE_REVEAL'; this.checked = false }
  confirmRole() { this.checked = true; this.phase = 'PLAYING' }

  private role(playerId: number) { return playerId === this.players[this.players.length - 1].playerId ? 'SABOTEUR' as const : 'MINER' as const }
  private candidates(): UnderMineCardOption[] {
    const nextX = Math.min(7, 1 + this.board.filter(card => card.kind === 'PATH').length)
    const options: UnderMineCardOption[] = []
    this.hand.forEach(card => {
      if (card.kind === 'PATH') options.push({ cardId: card.cardId, actionType: 'PLACE_PATH', placements: [{ x: nextX, y: 0, rotations: [0, 180] }] })
      if (card.kind === 'BREAK_TOOL' && card.toolType) {
        const toolType = card.toolType
        const targets = this.players.filter(player => player.playerId !== this.players[0].playerId && !(this.broken.get(player.playerId) ?? []).includes(toolType)).map(player => ({ playerId: player.playerId, toolType }))
        if (targets.length) options.push({ cardId: card.cardId, actionType: 'BREAK_TOOL', targets })
      }
      if (card.kind === 'REPAIR_TOOL') {
        const targets = [...this.broken.entries()].filter(([, value]) => value.length).map(([playerId]) => ({ playerId }))
        if (targets.length) options.push({ cardId: card.cardId, actionType: 'REPAIR_TOOL', targets })
      }
      if (card.kind === 'MAP') options.push({ cardId: card.cardId, actionType: 'USE_MAP', goalPositions: [-2, 0, 2].map(y => ({ x: 8, y })) })
      if (card.kind === 'DESTROY_PATH') {
        const targets = this.board.filter(item => item.kind === 'PATH').map(item => item.boardCardId)
        if (targets.length) options.push({ cardId: card.cardId, actionType: 'DESTROY_PATH', targetBoardCardIds: targets })
      }
    })
    return options
  }

  play(playerId: number, input: UnderMineCardPlayInput): UnderMineCardPlayResponse {
    if (this.phase !== 'PLAYING' || playerId !== this.players[0].playerId) throw { code: 'INVALID_GAME_ACTION' }
    const options = this.candidates()
    const option = options.find(item => item.cardId === input.cardId && item.actionType === input.actionType)
    if (input.actionType !== 'DISCARD_CARD' && !option) throw { code: 'CARD_PLAY_NOT_ALLOWED' }
    if (input.actionType === 'DISCARD_CARD' && options.length) throw { code: 'CARD_DISCARD_NOT_ALLOWED' }
    if (input.actionType === 'PLACE_PATH' && input.placement) this.board.push({ boardCardId: `board-${this.roundNo}-${this.sequence}`, ...input.placement, pathPatternCode: this.hand.find(card => card.cardId === input.cardId)?.pathPatternCode ?? 'E-W', kind: 'PATH' })
    if (input.actionType === 'BREAK_TOOL' && input.targetPlayerId && input.toolType) this.broken.set(input.targetPlayerId, [...(this.broken.get(input.targetPlayerId) ?? []), input.toolType])
    if (input.actionType === 'REPAIR_TOOL' && input.targetPlayerId) this.broken.set(input.targetPlayerId, (this.broken.get(input.targetPlayerId) ?? []).slice(1))
    if (input.actionType === 'DESTROY_PATH' && input.targetBoardCardId) this.board = this.board.filter(card => card.boardCardId !== input.targetBoardCardId)
    const privateResult = input.actionType === 'USE_MAP' && input.goalId ? { goalId: input.goalId, result: input.goalId === 'goal-0' ? 'TREASURE' as const : 'ROCK' as const } : undefined
    if (privateResult) { const y = Number(privateResult.goalId.replace('goal-', '')); this.mapResult = { x: 8, y, result: privateResult.result === 'TREASURE' ? 'GOLD' : 'ROCK' } }
    const labels: Record<UnderMineCardPlayInput['actionType'], string> = { PLACE_PATH: '길을 연결했어요', BREAK_TOOL: '장비를 고장 냈어요', REPAIR_TOOL: '장비를 수리했어요', DESTROY_PATH: '길을 파괴했어요', USE_MAP: '지도를 확인했어요', DISCARD_CARD: '카드 한 장을 버렸어요' }
    this.lastAction = { playerId, label: labels[input.actionType] }
    this.hand = this.hand.filter(card => card.cardId !== input.cardId)
    this.sequence += 1
    if (this.drawPileCount > 0) { this.hand.push(this.drawCard()); this.drawPileCount -= 1 }
    if (this.sequence % 5 === 0 || !this.hand.length) this.finishRound()
    return { sequence: this.sequence, playerId, actionType: input.actionType, privateResult, roundEnded: this.phase !== 'PLAYING', nextCurrentTurnPlayerId: this.phase === 'PLAYING' ? playerId : null }
  }

  private finishRound() {
    const winner = this.roundNo === 2 ? 'SABOTEUR' as const : 'MINER' as const
    this.result = { winner, goldFound: winner === 'MINER', roleReveals: this.players.map(player => ({ playerId: player.playerId, nickname: player.nickname, role: this.role(player.playerId) })) }
    this.results.push(this.result)
    if (winner === 'MINER') this.phase = 'GOLD_SELECTION'
    else { this.players.filter(player => this.role(player.playerId) === 'SABOTEUR').forEach(player => this.gold.set(player.playerId, (this.gold.get(player.playerId) ?? 0) + 3)); this.phase = 'ROUND_RESULT' }
  }

  selectGold(playerId: number, cardId: string) {
    if (this.phase !== 'GOLD_SELECTION' || this.selectedGold.has(cardId)) throw { code: 'GOLD_CARD_NOT_AVAILABLE' }
    const value = Number(cardId.split('-').at(-1)) || 1
    this.selectedGold.add(cardId); this.gold.set(playerId, (this.gold.get(playerId) ?? 0) + value); this.phase = 'ROUND_RESULT'
  }

  nextRound() {
    if (this.phase !== 'ROUND_RESULT' || this.roundNo >= 3) throw { code: 'INVALID_GAME_PHASE' }
    this.roundNo += 1; this.phase = 'ROLE_REVEAL'; this.checked = false; this.board = [{ boardCardId: `start-${this.roundNo}`, x: 0, y: 0, pathPatternCode: 'N-E-S-W', rotation: 0, kind: 'START' }]; this.broken.clear(); this.lastAction = undefined; this.mapResult = null; this.selectedGold.clear(); this.deal()
  }

  snapshot(meId: number): UnderMineGameState {
    if (this.phase === 'READY') return { type: 'UNDERMINE', phase: 'READY', roundNo: 1, maxRounds: 3 }
    if (this.phase === 'ROLE_REVEAL') return { type: 'UNDERMINE', phase: 'ROLE_REVEAL', roundNo: this.roundNo, maxRounds: 3, myRole: this.role(meId), roleChecked: this.checked, roleCheckedCount: this.checked ? this.players.length : this.players.length - 1, participantCount: this.players.length, allowedActions: this.checked ? [] : ['CHECK_ROLE'] }
    if (this.phase === 'PLAYING') {
      const options = this.candidates()
      const initialHandSize = this.players.length <= 5 ? 6 : this.players.length <= 7 ? 5 : 4
      return { type: 'UNDERMINE', phase: 'PLAYING', roundNo: this.roundNo, maxRounds: 3, myRole: this.role(meId), myHand: this.hand, players: this.players.map(player => ({ playerId: player.playerId, nickname: player.nickname, handCount: player.playerId === meId ? this.hand.length : initialHandSize, brokenTools: this.broken.get(player.playerId) ?? [], roleChecked: true })), boardCards: this.board, goals: [-2, 0, 2].map(y => ({ goalId: `goal-${y}`, x: 8, y, revealed: false })), drawPileCount: this.drawPileCount, currentPlayerId: meId, cardOptions: options, allowedActions: options.length ? ['PLAY_CARD'] : ['DISCARD_CARD'], lastAction: this.lastAction, mapResult: this.mapResult }
    }
    const scores = this.players.map(player => ({ playerId: player.playerId, nickname: player.nickname, gold: this.gold.get(player.playerId) ?? 0 }))
    if (this.phase === 'GOLD_SELECTION') return { type: 'UNDERMINE', phase: 'GOLD_SELECTION', roundNo: this.roundNo, maxRounds: 3, goldCards: [1, 2, 3].map(value => ({ goldCardId: `gold-${this.roundNo}-${value}`, value, selected: this.selectedGold.has(`gold-${this.roundNo}-${value}`) })), mySelectionId: null, selectedCount: 0, requiredCount: 1, scores, allowedActions: ['SELECT_GOLD'] }
    if (this.phase === 'ROUND_RESULT') {
      if (this.roundNo === 3) return { type: 'UNDERMINE', phase: 'FINISHED', rankings: scores.sort((a, b) => b.gold - a.gold).map((player, index) => ({ ...player, rank: index + 1 })), roundResults: this.results }
      return { type: 'UNDERMINE', phase: 'ROUND_RESULT', roundNo: this.roundNo, maxRounds: 3, result: this.result!, scores, allowedActions: ['START_NEXT_ROUND'] }
    }
    return { type: 'UNDERMINE', phase: 'CANCELLED' }
  }
}
