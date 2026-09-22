import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api'
import type { RoomState } from '../../../api/types'
import { Avatar, Button, SpinnerText } from '../../../components/ui'
import mineNoopi from '../../../assets/characters/noopi-cat.png'
import mineFriend from '../../../assets/characters/noopi-dog.png'
import type { UnderMineCard, UnderMineCardOption, UnderMineCardPlayInput, UnderMineGameState, UnderMinePlayer, UnderMineTool } from './types'
import './undermine.css'

type Props = { game: UnderMineGameState; state: RoomState; pending: boolean; onStart: () => void; onReplay: () => void; onOther: () => void }
const toolLabel: Record<UnderMineTool, string> = { LANTERN: '랜턴', PICKAXE: '곡괭이', CART: '광차' }
const toolIcon: Record<UnderMineTool, string> = { LANTERN: '🏮', PICKAXE: '⛏️', CART: '🛒' }
const cardIcon: Record<UnderMineCard['kind'], string> = { PATH: '╋', BREAK_TOOL: '⚡', REPAIR_TOOL: '✦', MAP: '⌖', DESTROY_PATH: '💥' }

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
  return <div className="umBoardViewport" aria-label="광산 길 보드"><div className="umBoard">
    {Array.from({ length: 5 }, (_, row) => Array.from({ length: 9 }, (_, x) => {
      const y = row - 2; const key = `${x}:${y}`; const tile = board.get(key); const goal = goals.get(key)
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

function PlayerGrid({ players, meId, currentPlayerId, breakTargets, repairTargets, busy, onBreak, onRepair }: { players: UnderMinePlayer[]; meId: number; currentPlayerId: number; breakTargets: Map<number, UnderMineTool> | null; repairTargets: Set<number> | null; busy: boolean; onBreak: (playerId: number, tool: UnderMineTool) => void; onRepair: (playerId: number) => void }) {
  const selecting = Boolean(breakTargets || repairTargets)
  return <div className={`umPlayers${selecting ? ' selectingTarget' : ''}`} aria-label={breakTargets ? '장비 고장 대상 선택' : repairTargets ? '장비 수리 대상 선택' : '참가자 상태'}>{players.map(player => {
    const breakTool = breakTargets?.get(player.playerId)
    const repairTarget = repairTargets?.has(player.playerId) ?? false
    const targetClass = breakTool ? 'breakTarget' : repairTarget ? 'repairTarget' : ''
    const equipmentStatus = player.brokenTools.length ? `고장: ${player.brokenTools.map(tool => toolLabel[tool]).join(', ')}` : '장비 정상'
    return <div key={player.playerId} className={`umPlayerCard ${player.playerId === currentPlayerId ? 'current ' : ''}${targetClass}`} aria-label={`${player.nickname}, ${equipmentStatus}`}>
      <Avatar name={player.nickname} /><span><b>{player.nickname}{player.playerId === meId && ' · 나'}</b><small>{player.brokenTools.length ? <>고장 {player.brokenTools.map(tool => toolIcon[tool]).join('')}</> : '장비 정상'}</small></span>
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
    {mapReveal && <div className="dialogBackdrop umMapBackdrop" role="presentation"><section className="umMapDialog" role="dialog" aria-modal="true" aria-labelledby="um-map-title"><p className="eyebrow">PRIVATE MAP RESULT</p><span aria-hidden>{mapReveal.result === 'TREASURE' ? '💎' : '🪨'}</span><h2 id="um-map-title">{mapReveal.result === 'TREASURE' ? '여기에 금이 있어요!' : '여기는 돌뿐이에요'}</h2><p>{mapReveal.goalId === 'goal--2' ? '위쪽' : mapReveal.goalId === 'goal-0' ? '가운데' : mapReveal.goalId === 'goal-2' ? '아래쪽' : '선택한'} 목적지의 비밀이에요.<br />다른 플레이어에게는 보이지 않아요.</p><Button autoFocus onClick={() => setMapReveal(null)}>확인했어요</Button></section></div>}
    <header className="umStatus"><div><small>ROUND {game.roundNo}/3</small><strong>{isMyTurn ? '내 차례예요!' : `${current?.nickname ?? '다른 광부'}님 차례`}</strong></div><span>남은 카드 <b>{game.drawPileCount}</b></span></header>
    <PlayerGrid players={game.players} meId={state.me.playerId} currentPlayerId={game.currentPlayerId} breakTargets={breakTargets} repairTargets={repairTargets} busy={busy} onBreak={(playerId, toolType) => { if (selectedOption?.actionType === 'BREAK_TOOL') void submit({ cardId: selectedOption.cardId, actionType: 'BREAK_TOOL', targetPlayerId: playerId, toolType }) }} onRepair={playerId => { if (selectedOption?.actionType === 'REPAIR_TOOL') void submit({ cardId: selectedOption.cardId, actionType: 'REPAIR_TOOL', targetPlayerId: playerId }) }} />
    <MineBoard game={game} selectedOption={selectedOption} rotation={rotation} busy={busy} onPlay={submit} />
    {game.mapResult && <div className="umMapResult" role="status"><span>{game.mapResult.result === 'GOLD' ? '💎' : '🪨'}</span><div><b>지도 확인 완료</b><small>이 정보는 나만 볼 수 있어요.</small></div></div>}
    {game.lastAction && <p className="umLastAction">{state.players.find(player => player.playerId === game.lastAction?.playerId)?.nickname}: {game.lastAction.label}</p>}
    {selectedOption?.actionType === 'PLACE_PATH' && <div className="umRotate" aria-label="길 카드 방향"><span>카드 방향</span><button className={rotation === 0 ? 'selected' : ''} onClick={() => setRotation(0)}>0°</button><button className={rotation === 180 ? 'selected' : ''} onClick={() => setRotation(180)}>180°</button></div>}
    {selectedOption?.actionType === 'USE_MAP' && <p className="umBoardHint">판 위에서 확인할 목적지를 선택하세요</p>}
    <div className="umHandHeader"><div><strong>내 카드</strong><small>{isMyTurn ? '한 장을 골라 행동하세요' : '차례를 기다리는 중이에요'}</small></div>{game.allowedActions.includes('DISCARD_CARD') && <button disabled={!selectedId || busy} onClick={discard}>선택 카드 버리기</button>}</div>
    <div className="umHand">{game.myHand.map(card => <HandCard key={card.cardId} card={card} selected={card.cardId === selectedId} rotation={rotation} disabled={!isMyTurn || busy || !game.cardOptions.some(option => option.cardId === card.cardId) && !game.allowedActions.includes('DISCARD_CARD')} onClick={() => setSelectedId(value => value === card.cardId ? null : card.cardId)} />)}</div>
    {!isMyTurn && <div className="umWaiting"><span className="dots">•••</span> 누피가 광산을 지켜보고 있어요</div>}{error && <p className="umError" role="alert">{error}</p>}
  </section>
}

export function UnderMineGame({ game, state, pending, onStart, onReplay, onOther }: Props) {
  const queryClient = useQueryClient(); const [revealed, setRevealed] = useState(false); const [busy, setBusy] = useState(false)
  async function call(action: () => Promise<unknown>) { setBusy(true); try { await action(); await queryClient.invalidateQueries({ queryKey: ['room-state', state.room.roomId] }) } finally { setBusy(false) } }
  if (game.phase === 'READY') return <section className="umReady"><div className="umReadyGlow" /><img className="cat" src={mineNoopi} alt="광부 헬멧을 쓴 것처럼 광산을 살피는 누피" /><img className="dog" src={mineFriend} alt="누피와 함께 광산을 탐험하는 친구" /><p className="eyebrow">UNDERMINE</p><h1>금을 찾을까요,<br />길을 막을까요?</h1><p className="sub">정체를 숨기고 길을 잇는<br />3라운드 광산 심리전</p>{state.me.host ? <Button disabled={pending} onClick={onStart}>{pending ? '광산 여는 중…' : '광산 열기'}</Button> : <SpinnerText>방장이 광산을 열고 있어요</SpinnerText>}</section>
  if (game.phase === 'ROLE_REVEAL') return <section className="umRole"><p className="eyebrow">ROUND {game.roundNo}/3 · SECRET ROLE</p><h1>이번 역할을 확인하세요</h1><button type="button" className={`umRoleCard ${revealed ? 'revealed' : ''}`} onClick={() => setRevealed(true)} aria-label={revealed ? `${game.myRole === 'MINER' ? '광부' : '방해꾼'} 역할` : '역할 카드 뒤집기'}>{revealed ? <><span>{game.myRole === 'MINER' ? '⛏️' : '🧨'}</span><strong>{game.myRole === 'MINER' ? '광부' : '방해꾼'}</strong><small>{game.myRole === 'MINER' ? '금을 향해 길을 이어주세요' : '들키지 않게 길을 방해하세요'}</small></> : <><b>?</b><strong>꾹 눌러 확인</strong><small>다른 사람에게 보이지 않게!</small></>}</button>{revealed && game.allowedActions.includes('CHECK_ROLE') ? <Button disabled={busy} onClick={() => call(() => api.confirmUnderMineRole(state.room.roomId, state.gameSession!.gameSessionId))}>{busy ? '확인 중…' : '역할 확인 완료'}</Button> : game.roleChecked ? <SpinnerText>{game.roleCheckedCount}/{game.participantCount}명 확인 완료</SpinnerText> : null}</section>
  if (game.phase === 'PLAYING') return <Playing game={game} state={state} />
  if (game.phase === 'GOLD_SELECTION') return <section className="umResult"><span className="umResultIcon">💰</span><p className="eyebrow">광부의 보상</p><h1>금 카드 한 장을 고르세요</h1><div className="umGoldCards">{game.goldCards.map(card => <button key={card.goldCardId} disabled={busy || !game.allowedActions.includes('SELECT_GOLD') || card.selected} onClick={() => call(() => api.selectUnderMineGold(state.room.roomId, state.gameSession!.gameSessionId, card.goldCardId, crypto.randomUUID()))}>{card.selected ? '선택됨' : '?'}<small>금 카드</small></button>)}</div><p className="sub">{game.selectedCount}/{game.requiredCount}명 선택 완료</p></section>
  if (game.phase === 'ROUND_RESULT') return <section className="umResult"><span className="umResultIcon">{game.result.winner === 'MINER' ? '💎' : '🧨'}</span><p className="eyebrow">ROUND {game.roundNo} RESULT</p><h1>{game.result.winner === 'MINER' ? '광부가 금을 찾았어요!' : '방해꾼이 막아냈어요!'}</h1><div className="umRoleRevealList">{game.result.roleReveals.map(player => <div key={player.playerId}><span>{player.role === 'MINER' ? '⛏️' : '🧨'}</span><b>{player.nickname}</b><small>{player.role === 'MINER' ? '광부' : '방해꾼'}</small></div>)}</div>{state.me.host && game.allowedActions.includes('START_NEXT_ROUND') ? <Button disabled={busy} onClick={() => call(() => api.startUnderMineNextRound(state.room.roomId, state.gameSession!.gameSessionId, crypto.randomUUID()))}>{busy ? '준비 중…' : `${game.roundNo + 1}라운드 시작`}</Button> : <SpinnerText>다음 라운드를 기다리고 있어요</SpinnerText>}</section>
  if (game.phase === 'FINISHED') return <section className="umResult"><span className="umResultIcon">🏆</span><p className="eyebrow">FINAL RANKING</p><h1>광산 탐험 종료!</h1><ol className="umRanking">{game.rankings.map(player => <li key={player.playerId}><b>{player.rank}</b><Avatar name={player.nickname} /><span>{player.nickname}</span><strong>{player.gold} 금</strong></li>)}</ol>{state.me.host ? <div className="umResultActions"><Button disabled={pending} onClick={onReplay}>한 판 더</Button><Button className="secondary" disabled={pending} onClick={onOther}>다른 게임</Button></div> : <SpinnerText>방장이 다음 게임을 고르고 있어요</SpinnerText>}</section>
  return <section className="umResult"><span className="umResultIcon">🫧</span><h1>게임이 취소됐어요</h1></section>
}
