import type { GameCatalog } from '../../api/types'

export function getGameUnavailableReason(game: GameCatalog['games'][number], playerCount: number): string | null {
  if (!game.enabled) return '지금은 선택할 수 없는 게임이에요.'
  if (playerCount < game.minPlayers) return `최소 ${game.minPlayers}명이 필요해요. ${game.minPlayers - playerCount}명 더 모여주세요.`
  if (playerCount > game.maxPlayers) return `최대 ${game.maxPlayers}명까지 참여할 수 있어요. 현재 ${playerCount}명이에요.`
  return null
}
