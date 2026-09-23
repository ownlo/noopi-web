import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api'
import type { RoomState } from '../../../api/types'
import { Avatar, Button, SpinnerText } from '../../../components/ui'
import mineNoopi from '../../../assets/characters/noopi-cat.png'
import mineMiner from '../../../assets/characters/noopi-undermine-miner-clean-v2.png'
import mineSaboteur from '../../../assets/characters/noopi-undermine-saboteur-clean-v2.png'
import mineShowdown from '../../../assets/characters/noopi-undermine-showdown.png'
import type { UnderMineCard, UnderMineCardOption, UnderMineCardPlayInput, UnderMineGameState, UnderMinePlayer, UnderMineRole, UnderMineTool } from './types'
import './undermine.css'

type Props = { game: UnderMineGameState; state: RoomState; pending: boolean; onStart: () => void; onReplay: () => void; onOther: () => void }
const toolLabel: Record<UnderMineTool, string> = { LANTERN: '랜턴', PICKAXE: '곡괭이', CART: '광차' }
const toolIcon: Record<UnderMineTool, string> = { LANTERN: '🏮', PICKAXE: '⛏️', CART: '🛒' }
const allTools: UnderMineTool[] = ['LANTERN', 'PICKAXE', 'CART']
const cardIcon: Record<UnderMineCard['kind'], string> = { PATH: '╋', BREAK_TOOL: '⚡', REPAIR_TOOL: '✦', MAP: '⌖', DESTROY_PATH: '💥' }

function RoleCharacter({ role, variant }: { role: UnderMineRole; variant: 'card' | 'result' | 'list' }) {
  return <img className={`umRoleCharacter ${variant}`} src={role === 'MINER' ? mineMiner : mineSaboteur} alt="" aria-hidden />
}

function pathDirections(code: string) {
  const normalized = code.toUpperCase()
  if (normalized === 'START' || normalized.includes('CROSS')) return new Set(['N', 'E', 'S', 'W'])
  if (normalized.includes('STRAIGHT_HORIZONTAL')) return new Set(['E', 'W'])
  if (normalized.includes('STRAIGHT_VERTICAL')) return new Set(['N', 'S'])
  const directions = new Set<string>()
  normalized.split(/[-_+]/).forEach(token => {
    if (['N', 'NORTH', 'TOP', 'UP'].includes(token)) directions.add('N')
    if (['E', 'EAST', 'RIGHT'].includes(token)) directions.add('E')
    if (['S', 'SOUTH', 'BOTTOM', 'DOWN'].includes(token)) directions.add('S')
    if (['W', 'WEST', 'LEFT'].includes(token)) directions.add('W')
  })
  if (!directions.size && normalized.length <= 4) normalized.split('').forEach(direction => directions.add(direction))
  return directions
}

function PathTile({ code, rotation = 0 }: { code: string; rotation?: 0 | 180 }) {
  const directions = pathDirections(code)
  return <span className="umPath" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden><i />{['N', 'E', 'S', 'W'].map(direction => directions.has(direction) && <b key={direction} className={direction.toLowerCase()} />)}</span>
}

function MineBoard({ game, selectedOption, rotation, busy, onPlay }: { game: Extract<UnderMineGameState, { phase: 'PLAYING' }>; selectedOption?: UnderMineCardOption; rotation: 0 | 180; busy: boolean; onPlay: (input: UnderMineCardPlayInput) => void }) {
  const placements = selectedOption?.actionType === 'PLACE_PATH' ? selectedOption.placements : []
  const destroyIds = new Set(selectedOption?.actionType === 'DESTROY_PATH' ? selectedOption.targetBoardCardIds : [])
  const mapTargets = new Set(selectedOption?.actionType === 'USE_MAP' ? selectedOption.goalPositions.map(goal => `${goal.x}:${goal.y}`) : [])
  const selectedPath = selectedOption?.actionType === 'PLACE_PATH' ? game.myHand.find(card => card.cardId === selectedOption.cardId)?.pathPatternCode : undefined
  const goals = new Map(game.goals.map(goal => [`${goal.x}:${goal.y}`, goal]))
  const board = new Map(game.boardCards.map(card => [`${card.x}:${card.y}`, card]))
  const visibleCoordinates = [...game.boardCards, ...game.goals, ...placements]
  const minX = Math.min(0, ...visibleCoordinates.map(item => item.x)); const maxX = Math.max(8, ...visibleCoordinates.map(item => item.x))
  const minY = Math.min(-2, ...visibleCoordinates.map(item => item.y)); const maxY = Math.max(2, ...visibleCoordinates.map(item => item.y))
  const columns = Array.from({ length: maxX - minX + 1 }, (_, index) => minX + index)
  const rows = Array.from({ length: maxY - minY + 1 }, (_, index) => minY + index)
  return <div className="umBoardViewport" aria-label="광산 길 보드"><div className="umBoard" style={{ gridTemplateColumns: `repeat(${columns.length}, 40px)`, gridTemplateRows: `repeat(${rows.length}, 40px)` }}>
    {rows.map(y => columns.map(x => {
      const key = `${x}:${y}`; const tile = board.get(key); const goal = goals.get(key)
      const placement = placements.find(item => item.x === x && item.y === y)
      if (goal) { const mapTarget = mapTargets.has(key); return <button key={key} type="button" className={`umTile goal${goal.revealed ? ' revealed' : ''}${mapTarget ? ' mapTarget' : ''}`} disabled={busy || !mapTarget} onClick={() => onPlay({ cardId: selectedOption!.cardId, actionType: 'USE_MAP', goalId: goal.goalId })} aria-label={mapTarget ? '비밀 지도로 확인할 목적지 선택' : goal.revealed ? '공개된 목적지' : '숨겨진 목적지'}><span>{goal.revealed ? goal.result === 'GOLD' ? '💎' : '🪨' : '?'}</span></button> }
      if (tile) return <button key={key} type="button" className={`umTile path ${tile.kind === 'START' ? 'start' : ''}${destroyIds.has(tile.boardCardId) ? ' target' : ''}`} disabled={busy || !destroyIds.has(tile.boardCardId)} onClick={() => onPlay({ cardId: selectedOption!.cardId, actionType: 'DESTROY_PATH', targetBoardCardId: tile.boardCardId })} aria-label={destroyIds.has(tile.boardCardId) ? '파괴할 길 선택' : tile.kind === 'START' ? '출발 지점' : '놓인 길'}><PathTile code={tile.pathPatternCode} rotation={tile.rotation} />{tile.kind === 'START' && <small>START</small>}</button>
      if (placement) { const previewRotation = placement.rotations.includes(rotation) ? rotation : placement.rotations[0]; return <button key={key} type="button" className="umTile candidate" disabled={busy} onClick={() => onPlay({ cardId: selectedOption!.cardId, actionType: 'PLACE_PATH', placement: { x, y, rotation: previewRotation } })} aria-label={`${x}, ${y} 위치에 ${previewRotation}도 회전한 길 놓기`}>{selectedPath ? <PathTile code={selectedPath} rotation={previewRotation} /> : <span>＋</span>}</button> }
      return <div key={key} className="umTile empty" />
    }))}
  </div></div>
}

function HandCard({ card, selected, rotation, disabled, onClick }: { card: UnderMineCard; selected: boolean; rotation: 0 | 180; disabled: boolean; onClick: () => void }) {
  const kind = card.kind ?? card.cardType ?? 'PATH'
  return <button type="button" className={`umHandCard ${kind.toLowerCase()}${selected ? ' selected' : ''}`} disabled={disabled} onClick={onClick} aria-pressed={selected}>
    <small>{kind === 'PATH' ? '길 카드' : '행동 카드'}</small>{kind === 'PATH' && card.pathPatternCode ? <div className="umHandPathPreview"><PathTile code={card.pathPatternCode} rotation={selected ? rotation : 0} /></div> : kind === 'BREAK_TOOL' && card.toolType ? <div className="umBrokenTool" aria-hidden><span>{toolIcon[card.toolType]}</span><i>×</i></div> : <b>{cardIcon[kind]}</b>}<strong>{kind === 'PATH' ? '길 카드' : card.name ?? '행동 카드'}</strong><span>{kind === 'PATH' ? '통로 모양대로 연결해요' : card.description ?? '대상을 선택해 사용해요'}</span>
  </button>
}

function PlayerGrid({ players, currentPlayerId, breakTargets, repairTargets, busy, onBreak, onRepair }: { players: UnderMinePlayer[]; currentPlayerId: number; breakTargets: Map<number, UnderMineTool> | null; repairTargets: Set<number> | null; busy: boolean; onBreak: (playerId: number, tool: UnderMineTool) => void; onRepair: (playerId: number) => void }) {
  const selecting = Boolean(breakTargets || repairTargets)
  return <div className={`umPlayers${selecting ? ' selectingTarget' : ''}`} aria-label={breakTargets ? '장비 고장 대상 선택' : repairTargets ? '장비 수리 대상 선택' : '참가자 상태'}>{players.map(player => {
    const breakTool = breakTargets?.get(player.playerId)
    const repairTarget = repairTargets?.has(player.playerId) ?? false
    const targetClass = breakTool ? 'breakTarget' : repairTarget ? 'repairTarget' : ''
    const equipmentStatus = player.brokenTools.length ? `, 고장: ${player.brokenTools.map(tool => toolLabel[tool]).join(', ')}` : ''
    return <div key={player.playerId} className={`umPlayerCard ${player.playerId === currentPlayerId ? 'current ' : ''}${targetClass}`} aria-label={`${player.nickname}${equipmentStatus}`}>
      <Avatar name={player.nickname} /><span><b>{player.nickname}</b><small className="umEquipmentList" aria-hidden>{allTools.map(tool => <span key={tool} className={`umEquipment${player.brokenTools.includes(tool) ? ' broken' : ''}`}>{toolIcon[tool]}</span>)}</small></span>
      {breakTool && <button type="button" className="umPlayerActionOverlay" disabled={busy} onClick={() => onBreak(player.playerId, breakTool)} aria-label={`${player.nickname}의 ${toolLabel[breakTool]} 고장 내기`} />}
      {repairTarget && <button type="button" className="umPlayerActionOverlay repair" disabled={busy} onClick={() => onRepair(player.playerId)} aria-label={`${player.nickname}의 가장 먼저 고장 난 장비 수리`} />}
    </div>
  })}</div>
}

function Playing({ game, state }: { game: Extract<UnderMineGameState, { phase: 'PLAYING' }>; state: RoomState }) {
  const queryClient = useQueryClient(); const [selectedId, setSelectedId] = useState<string | null>(null); const [rotation, setRotation] = useState<0 | 180>(0); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [mapReveal, setMapReveal] = useState<{ goalId: string; result: 'TREASURE' | 'ROCK' } | null>(null)
  const selectedOption = useMemo(() => game.cardOptions.find(option => option.cardId === selectedId), [game.cardOptions, selectedId])
  const breakTargets = selectedOption?.actionType === 'BREAK_TOOL' ? new Map(selectedOption.targets.map(target => [target.playerId, target.toolType])) : null
  const repairTargets = selectedOption?.actionType === 'REPAIR_TOOL' ? new Set(selectedOption.targets.map(target => target.playerId)) : null
  const isMyTurn = game.currentPlayerId === state.me.playerId
  const current = state.players.find(player => player.playerId === game.currentPlayerId)
  async function submit(input: UnderMineCardPlayInput) {
    if (!state.gameSession || busy || !isMyTurn) return
    setBusy(true); setError('')
    try { const response = await api.playUnderMineCard(state.room.roomId, state.gameSession.gameSessionId, input, crypto.randomUUID()); if (response.privateResult) setMapReveal(response.privateResult); setSelectedId(null); await queryClient.invalidateQueries({ queryKey: ['room-state', state.room.roomId] }) }
    catch { setError('카드를 낼 수 없어요. 최신 상태를 다시 확인했어요.'); await queryClient.invalidateQueries({ queryKey: ['room-state', state.room.roomId] }) }
    finally { setBusy(false) }
  }
  async function discard() {
    if (!selectedId || !game.allowedActions.includes('DISCARD_CARD')) return
    if (!window.confirm('낼 수 있는 카드가 없어 이 카드를 버릴까요?')) return
    await submit({ cardId: selectedId, actionType: 'DISCARD_CARD' })
  }
  return <section className="umPlaying" aria-busy={busy}>
    {mapReveal && <div className="dialogBackdrop umMapBackdrop" role="presentation"><section className="umMapDialog" role="dialog" aria-modal="true" aria-labelledby="um-map-title"><span aria-hidden>{mapReveal.result === 'TREASURE' ? '💎' : '🪨'}</span><h2 id="um-map-title">{mapReveal.result === 'TREASURE' ? '여기에 금이 있어요!' : '여기는 돌뿐이에요'}</h2><Button autoFocus onClick={() => setMapReveal(null)}>확인했어요</Button></section></div>}
    <header className="umStatus"><div><small>ROUND {game.roundNo}/3</small><strong>{isMyTurn ? '내 차례예요!' : `${current?.nickname ?? '다른 광부'}님 차례`}</strong></div><span>남은 카드 <b>{game.drawPileCount}</b></span></header>
    <PlayerGrid players={game.players} currentPlayerId={game.currentPlayerId} breakTargets={breakTargets} repairTargets={repairTargets} busy={busy} onBreak={(playerId, toolType) => { if (selectedOption?.actionType === 'BREAK_TOOL') void submit({ cardId: selectedOption.cardId, actionType: 'BREAK_TOOL', targetPlayerId: playerId, toolType }) }} onRepair={playerId => { if (selectedOption?.actionType === 'REPAIR_TOOL') void submit({ cardId: selectedOption.cardId, actionType: 'REPAIR_TOOL', targetPlayerId: playerId }) }} />
    <MineBoard game={game} selectedOption={selectedOption} rotation={rotation} busy={busy} onPlay={submit} />
    {game.lastAction && <p className="umLastAction">{state.players.find(player => player.playerId === game.lastAction?.playerId)?.nickname}: {game.lastAction.label}</p>}
    {selectedOption?.actionType === 'PLACE_PATH' && <div className="umRotate" aria-label="길 카드 방향"><span>카드 방향</span><button className={rotation === 0 ? 'selected' : ''} onClick={() => setRotation(0)}>0°</button><button className={rotation === 180 ? 'selected' : ''} onClick={() => setRotation(180)}>180°</button></div>}
    <div className="umHandHeader"><div><strong>내 카드</strong><small>{isMyTurn ? '한 장을 골라 행동하세요' : '차례를 기다리는 중이에요'}</small></div>{game.allowedActions.includes('DISCARD_CARD') && <button disabled={!selectedId || busy} onClick={discard}>선택 카드 버리기</button>}</div>
    <div className="umHand">{game.myHand.map(card => <HandCard key={card.cardId} card={card} selected={card.cardId === selectedId} rotation={rotation} disabled={!isMyTurn || busy || !game.cardOptions.some(option => option.cardId === card.cardId) && !game.allowedActions.includes('DISCARD_CARD')} onClick={() => setSelectedId(value => value === card.cardId ? null : card.cardId)} />)}</div>
    {!isMyTurn && <div className="umWaiting"><span className="dots">•••</span> 누피가 광산을 지켜보고 있어요</div>}{error && <p className="umError" role="alert">{error}</p>}
  </section>
}

export function UnderMineGame({ game, state, pending, onStart, onReplay, onOther }: Props) {
  const queryClient = useQueryClient(); const [revealed, setRevealed] = useState(false); const [busy, setBusy] = useState(false)
  const lowestFinalGold = game.phase === 'FINISHED' ? Math.min(...game.rankings.map(player => player.gold)) : null
  const goldRewardComplete = game.phase === 'ROUND_RESULT' && game.result.winner === 'MINER' && game.allowedActions.includes('START_NEXT_ROUND')
  const receivedSaboteurReward = game.phase === 'ROUND_RESULT' && game.result.winner === 'SABOTEUR' && game.result.roleReveals.some(player => player.playerId === state.me.playerId && player.role === 'SABOTEUR')
  async function call(action: () => Promise<unknown>) { setBusy(true); try { await action(); await queryClient.invalidateQueries({ queryKey: ['room-state', state.room.roomId] }) } finally { setBusy(false) } }
  if (game.phase === 'READY') return <section className="umReady"><img className="umReadyBackdrop" src={mineShowdown} alt="" aria-hidden /><p className="eyebrow">UNDERMINE</p><h1>금을 찾을까요,<br />길을 막을까요?</h1><p className="sub">정체를 숨기고 길을 잇는<br />3라운드 광산 심리전</p>{state.me.host ? <Button disabled={pending} onClick={onStart}>{pending ? '광산 여는 중…' : '광산 열기'}</Button> : <SpinnerText>방장이 광산을 열고 있어요</SpinnerText>}</section>
  if (game.phase === 'ROLE_REVEAL') return <section className="umRole"><p className="eyebrow">ROUND {game.roundNo}/3</p><h1>이번 역할을 확인하세요</h1><button type="button" className={`umRoleCard ${revealed ? 'revealed' : ''}`} onClick={() => setRevealed(true)} aria-label={revealed ? `${game.myRole === 'MINER' ? '광부' : '방해꾼'} 역할` : '역할 카드 뒤집기'}>{revealed ? <><RoleCharacter role={game.myRole} variant="card" /><strong>{game.myRole === 'MINER' ? '광부' : '방해꾼'}</strong><small>{game.myRole === 'MINER' ? '금을 향해 길을 이어주세요' : '들키지 않게 길을 방해하세요'}</small></> : <><b>?</b><strong>꾹 눌러 확인</strong><small>다른 사람에게 보이지 않게!</small></>}</button>{revealed && game.allowedActions.includes('CHECK_ROLE') ? <Button disabled={busy} onClick={() => call(() => api.confirmUnderMineRole(state.room.roomId, state.gameSession!.gameSessionId))}>{busy ? '확인 중…' : '역할 확인 완료'}</Button> : game.roleChecked ? <SpinnerText>{game.roleCheckedCount}/{game.participantCount}명 확인 완료</SpinnerText> : null}</section>
  if (game.phase === 'PLAYING') return <Playing game={game} state={state} />
  if (game.phase === 'GOLD_SELECTION') return <section className="umResult"><span className="umResultIcon">💰</span><p className="eyebrow">광부의 보상</p><h1>{game.allowedActions.includes('SELECT_GOLD') ? '금 카드 한 장을 고르세요' : '광부들이 금을 고르고 있어요'}</h1><p className="umGoldBalance">현재 내 금 <strong>{game.myGoldTotal}개</strong></p>{game.allowedActions.includes('SELECT_GOLD') ? <div className="umGoldCards">{game.goldCards.map(card => <button key={card.goldCardId} disabled={busy || card.selected} onClick={() => call(() => api.selectUnderMineGold(state.room.roomId, state.gameSession!.gameSessionId, card.goldCardId, crypto.randomUUID()))}><b>{card.value}</b><small>금</small></button>)}</div> : <SpinnerText>선택이 끝날 때까지 기다려주세요</SpinnerText>}<p className="sub">{game.selectedCount}/{game.requiredCount}명 선택 완료</p></section>
  if (game.phase === 'ROUND_RESULT') return <section className="umResult">{goldRewardComplete ? <span className="umResultIcon">💰</span> : <RoleCharacter role={game.result.winner} variant="result" />}<h1>{goldRewardComplete ? '금 지급이 완료됐습니다' : game.result.winner === 'MINER' ? '광부가 금을 찾았습니다' : '방해꾼이 막아냈어요!'}</h1>{(receivedSaboteurReward || goldRewardComplete) && <div className="umRewardReceipt"><span>{receivedSaboteurReward ? '방해꾼 보상 지급 완료' : '광부 보상 지급 완료'}</span><strong>현재 금 {game.myGoldTotal}개</strong></div>}{!goldRewardComplete && <div className="umRoleRevealList">{game.result.roleReveals.map(player => <div key={player.playerId}><RoleCharacter role={player.role} variant="list" /><b>{player.nickname}</b><small>{player.role === 'MINER' ? '광부' : '방해꾼'}</small></div>)}</div>}{game.result.winner === 'MINER' && !game.allowedActions.includes('START_NEXT_ROUND') ? <SpinnerText>광부 보상을 준비하고 있어요</SpinnerText> : state.me.host && game.allowedActions.includes('START_NEXT_ROUND') ? <Button disabled={busy} onClick={() => call(() => api.startUnderMineNextRound(state.room.roomId, state.gameSession!.gameSessionId, crypto.randomUUID()))}>{busy ? '준비 중…' : `${game.roundNo + 1}라운드 시작`}</Button> : <SpinnerText>다음 라운드를 기다리고 있어요</SpinnerText>}</section>
  if (game.phase === 'FINISHED') return <section className="umResult umFinal"><img className="umFinalBackdrop" src={mineNoopi} alt="" aria-hidden /><h1>광산 탐험 종료!</h1><ol className="umRanking">{game.rankings.map(player => <li key={player.playerId} className={player.rank === 1 ? 'winner' : player.gold === lowestFinalGold ? 'last' : ''}><strong className="umFinalRankStamp" data-rank={player.rank}>{player.rank}위</strong><span>{player.nickname}</span><b>{player.gold}<small>금</small></b></li>)}</ol>{state.me.host ? <div className="umResultActions"><Button disabled={pending} onClick={onReplay}>한 판 더!</Button><Button className="secondary" disabled={pending} onClick={onOther}>다른 게임 선택</Button></div> : <SpinnerText>방장이 다음 게임을 고르고 있어요</SpinnerText>}</section>
  return <section className="umResult"><span className="umResultIcon">🫧</span><h1>게임이 취소됐어요</h1></section>
}
