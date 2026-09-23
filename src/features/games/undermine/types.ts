import type { Candidate } from '../../../api/types'

export type UnderMineRole = 'MINER' | 'SABOTEUR'
export type UnderMineTool = 'LANTERN' | 'PICKAXE' | 'CART'
export type UnderMineCardKind = 'PATH' | 'BREAK_TOOL' | 'REPAIR_TOOL' | 'MAP' | 'DESTROY_PATH'
export type UnderMineAllowedAction = 'CHECK_ROLE' | 'PLAY_CARD' | 'DISCARD_CARD' | 'SELECT_GOLD' | 'START_NEXT_ROUND'

export type UnderMineCard = {
  cardId: string
  kind: UnderMineCardKind
  cardType?: UnderMineCardKind
  name?: string
  description?: string
  pathPatternCode?: string
  toolType?: UnderMineTool
}

export type UnderMineBoardCard = {
  boardCardId: string
  x: number
  y: number
  pathPatternCode: string
  rotation: 0 | 180
  kind: 'START' | 'PATH'
}

export type UnderMineGoal = {
  goalId: string
  x: number
  y: number
  revealed: boolean
  result?: 'GOLD' | 'ROCK'
}

export type UnderMinePlayer = Candidate & {
  handCount: number
  brokenTools: UnderMineTool[]
  roleChecked: boolean
}

export type UnderMineCardOption =
  | { cardId: string; actionType: 'PLACE_PATH'; placements: { x: number; y: number; rotations: Array<0 | 180> }[] }
  | { cardId: string; actionType: 'BREAK_TOOL'; targets: { playerId: number; toolType: UnderMineTool }[] }
  | { cardId: string; actionType: 'REPAIR_TOOL'; targets: { playerId: number }[] }
  | { cardId: string; actionType: 'USE_MAP'; goalPositions: { x: number; y: number }[] }
  | { cardId: string; actionType: 'DESTROY_PATH'; targetBoardCardIds: string[] }

export type UnderMineCardPlayInput = {
  cardId: string
  actionType: UnderMineCardOption['actionType'] | 'DISCARD_CARD'
  placement?: { x: number; y: number; rotation: 0 | 180 }
  targetPlayerId?: number
  toolType?: UnderMineTool
  targetBoardCardId?: string
  goalId?: string
}

export type UnderMineCardPlayResponse = {
  sequence: number
  playerId: number
  actionType: UnderMineCardPlayInput['actionType']
  roundEnded: boolean
  nextCurrentTurnPlayerId: number | null
  privateResult?: { goalId: string; result: 'TREASURE' | 'ROCK' }
}

export type UnderMineRoundResult = {
  winner: 'MINER' | 'SABOTEUR'
  goldFound: boolean
  roleReveals: Array<Candidate & { role: UnderMineRole }>
}

type PlayingCommon = {
  type: 'UNDERMINE'
  roundNo: number
  maxRounds: 3
  myRole: UnderMineRole
  myHand: UnderMineCard[]
  players: UnderMinePlayer[]
  boardCards: UnderMineBoardCard[]
  goals: UnderMineGoal[]
  drawPileCount: number
  currentPlayerId: number
  cardOptions: UnderMineCardOption[]
  allowedActions: UnderMineAllowedAction[]
  lastAction?: { playerId: number; label: string }
  mapResult?: { x: number; y: number; result: 'GOLD' | 'ROCK' } | null
}

export type UnderMineGameState =
  | { type: 'UNDERMINE'; phase: 'READY'; roundNo: 1; maxRounds: 3 }
  | { type: 'UNDERMINE'; phase: 'ROLE_REVEAL'; roundNo: number; maxRounds: 3; myRole: UnderMineRole; roleChecked: boolean; roleCheckedCount: number; participantCount: number; allowedActions: UnderMineAllowedAction[] }
  | (PlayingCommon & { phase: 'PLAYING' })
  | { type: 'UNDERMINE'; phase: 'ROUND_RESULT'; roundNo: number; maxRounds: 3; result: UnderMineRoundResult; myGoldTotal: number; scores: Array<Candidate & { gold: number }>; allowedActions: UnderMineAllowedAction[] }
  | { type: 'UNDERMINE'; phase: 'GOLD_SELECTION'; roundNo: number; maxRounds: 3; goldCards: { goldCardId: string; value: number; selected: boolean }[]; mySelectionId: string | null; myGoldTotal: number; selectedCount: number; requiredCount: number; scores: Array<Candidate & { gold: number }>; allowedActions: UnderMineAllowedAction[] }
  | { type: 'UNDERMINE'; phase: 'FINISHED'; rankings: Array<Candidate & { gold: number; rank: number }>; roundResults: UnderMineRoundResult[] }
  | { type: 'UNDERMINE'; phase: 'CANCELLED'; reason?: string }
