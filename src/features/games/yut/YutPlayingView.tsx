import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Player, YutGameState, YutPiece } from '../../../api/types'
import { Button } from '../../../components/ui'
import cat from '../../../assets/characters/noopi-cat.png'
import dog from '../../../assets/characters/noopi-dog.png'
import './yut-playing.css'
import { YutThrowScene } from './YutThrowScene'
import { YutBoardDecorations } from './YutBoardDecorations'

type PlayingState = Extract<YutGameState, { phase: 'PLAYING' }>
const resultNames = { DO: '도', GAE: '개', GEOL: '걸', YUT: '윷', MO: '모' } as const
const colors = ['#ee8cdd', '#73d6ff', '#ffc979', '#a79bff']
// Presentation coordinates only. Movement and route selection remain server-owned.
const outerNodes = Array.from({ length: 20 }, (_, index) => {
  const side = Math.floor(index / 5)
  const step = (index % 5 + 1) * 15.2
  const [x, y] = side === 0 ? [88, 88 - step] : side === 1 ? [88 - step, 12] : side === 2 ? [12, 12 + step] : [12 + step, 88]
  return { id: `OUTER_${index + 1}`, x, y, corner: (index + 1) % 5 === 0 }
})
const position = (x: number, y: number): CSSProperties => ({ left: `${x}%`, top: `${y}%` })

function ownerLabel(ownerId: string, players: Player[]) {
  return ownerId === 'NOOPI' ? '누피팀' : ownerId === 'DAY' ? '데이팀' : players.find(player => String(player.playerId) === ownerId)?.nickname ?? '참가자'
}

function PieceFace({ index }: { index: number }) {
  return <span className="yutPieceFace" aria-hidden="true"><img src={index % 2 === 0 ? cat : dog} alt="" /></span>
}

function YutHomeGate() {
  return <svg className="yutHomeGate" viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <ellipse cx="28" cy="45" rx="21" ry="7" fill="#805138" opacity=".45" />
    <path d="M9 36Q28 29 47 36L45 44Q28 51 11 44Z" fill="#E2A34F" stroke="#FFF0BB" strokeWidth="1.5" />
    <ellipse cx="28" cy="36" rx="19" ry="6" fill="#FFE6A5" />
    <path d="M16 37V22Q28 11 40 22V37" stroke="#9D603B" strokeWidth="7" strokeLinecap="round" />
    <path d="M16 35V20Q28 9 40 20V35" stroke="#FFE9AB" strokeWidth="5" strokeLinecap="round" />
    <path d="M20 30H36V37H20Z" fill="#FFF6D7" />
    <path d="M20 30H24V33.5H20ZM28 30H32V33.5H28ZM24 33.5H28V37H24ZM32 33.5H36V37H32Z" fill="#785C89" />
    <path d="M28 14V2" stroke="#FFE5A0" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M29 2H41L37 6L41 10H29Z" fill="#FFBC71" stroke="#FFF0BD" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M7 16L8.5 20L12 21.5L8.5 23L7 27L5.5 23L2 21.5L5.5 20Z" fill="#FFE5A4" />
    <path d="M47 12L48 15L51 16L48 17L47 20L46 17L43 16L46 15Z" fill="#EDC6FF" />
  </svg>
}
function Board({ state, players, pending, onPiece }: { state: PlayingState; players: Player[]; pending: boolean; onPiece: (id: string) => void }) {
  const owners = state.finishedPieceCounts.map(item => item.ownerId)
  const eligible = state.myAction?.type === 'SELECT_PIECE' ? state.myAction.eligiblePieceIds : []
  const groups = state.pieces.filter((piece, index, pieces) => piece.status === 'ON_BOARD' && !pieces.slice(0, index).some(other => other.groupPieceIds.includes(piece.pieceId)))
  const unplaced = groups.filter(piece => !outerNodes.some(node => node.id === piece.nodeId))
  function renderPiece(piece: YutPiece, x: number, y: number) {
    const ownerIndex = Math.max(0, owners.indexOf(piece.ownerId))
    const selectableId = [piece.pieceId, ...piece.groupPieceIds].find(id => eligible.includes(id))
    const label = `${ownerLabel(piece.ownerId, players)} 말${piece.groupPieceIds.length > 1 ? ` ${piece.groupPieceIds.length}개 업음` : ''}`
    const content = <><PieceFace index={ownerIndex} />{piece.groupPieceIds.length > 1 && <b className="yutStackCount">{piece.groupPieceIds.length}</b>}</>
    const style = { ...position(x, y), '--piece-color': colors[ownerIndex % colors.length] } as CSSProperties
    return selectableId ? <button key={piece.pieceId} type="button" className="yutBoardPiece selectable" style={style} disabled={pending} aria-label={`${label} 이동`} onClick={() => onPiece(selectableId)}>{content}</button> : <span key={piece.pieceId} className="yutBoardPiece" style={style} role="img" aria-label={label}>{content}</span>
  }
  return <>
    <div className="yutPlayBoard" aria-label="윷판, 우측 하단에서 출발해 위쪽으로 진행">
      <YutBoardDecorations />
      <svg className="yutBoardArt" viewBox="0 0 100 100" aria-hidden="true">
        <path className="yutOuterLine" d="M88 88 V12 H12 V88 Z" />
        <path className="yutDiagonalLine" d="M12 12 L88 88 M88 12 L12 88" />
        {[1, 2, 3, 4, 5].map(step => <g key={step}><circle cx={12 + step * 76 / 6} cy={12 + step * 76 / 6} r={step === 3 ? 4 : 2.2} /><circle cx={88 - step * 76 / 6} cy={12 + step * 76 / 6} r={step === 3 ? 4 : 2.2} /></g>)}
        <path className="yutDirection" d="M95 83 V73 M93 76 L95 73 L97 76" />
      </svg>
      {outerNodes.map(node => <span key={node.id} className={`yutBoardSpot ${node.corner ? 'corner' : ''} ${node.id === 'OUTER_20' ? 'home' : ''}`} style={position(node.x, node.y)} aria-hidden="true">{node.id === 'OUTER_20' ? <YutHomeGate /> : node.id === 'OUTER_5' ? '☾' : node.id === 'OUTER_10' ? '✿' : node.id === 'OUTER_15' ? '♡' : ''}</span>)}


      {groups.map(piece => { const node = outerNodes.find(item => item.id === piece.nodeId); return node ? renderPiece(piece, node.x, node.y) : null })}
    </div>
    {unplaced.length > 0 && <p className="yutBoardNote">지름길 위의 말: {unplaced.map(piece => ownerLabel(piece.ownerId, players)).join(', ')}</p>}
  </>
}

export function YutPlayingView({ state, players, myPlayerId, pending, onThrow, onToken, onPiece, onPath }: { state: PlayingState; players: Player[]; myPlayerId: number; pending: boolean; onThrow: () => void; onToken: (id: string) => void; onPiece: (id: string) => void; onPath: (id: string) => void }) {
  const [throwAnimation, setThrowAnimation] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [throwStart, setThrowStart] = useState('')
  useEffect(() => {
    if (!animating) return
    const timer = window.setTimeout(() => setAnimating(false), 1800)
    return () => window.clearTimeout(timer)
  }, [animating, throwAnimation])
  const current = players.find(player => player.playerId === state.turn.currentPlayerId)
  const isMyTurn = state.turn.currentPlayerId === myPlayerId
  const action = state.myAction
  const latestResult = state.turn.throwResults.at(-1)
  const resultKey = `${state.turn.turnNo}:${state.turn.throwResults.length}`
  return <div className={`yutPlay ${action?.type === 'THROW_YUT' ? 'hasFloatingThrow' : ''}`}>
    <div className="yutScoreboard" aria-label="참가자와 현재 차례">{state.finishedPieceCounts.map((owner, index) => {
      const active = state.mode === 'TEAM' ? state.teams?.find(team => team.team === owner.ownerId)?.players.some(player => player.playerId === state.turn.currentPlayerId) : owner.ownerId === String(state.turn.currentPlayerId)
      return <div key={owner.ownerId} className={`yutScore ${active ? 'active' : ''} ${active && isMyTurn ? 'myTurn' : ''}`} style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}><PieceFace index={index} /><strong>{ownerLabel(owner.ownerId, players)}</strong>{active && <em>{isMyTurn ? '내 차례' : '지금 차례'}</em>}</div>
    })}</div>
    <Board state={state} players={players} pending={pending} onPiece={onPiece} />
    <div className="yutPieceDocks" aria-label="참가자별 말 대기석">{state.finishedPieceCounts.map((owner, index) => <div className="yutPieceDock" key={owner.ownerId} style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}>
      <strong>{ownerLabel(owner.ownerId, players)}<small>의 말</small></strong>
      <div>{state.pieces.filter(piece => piece.ownerId === owner.ownerId).map((piece, pieceIndex) => {
        const allowed = action?.type === 'SELECT_PIECE' && action.eligiblePieceIds.includes(piece.pieceId) && piece.status === 'READY'
        const label = `${ownerLabel(owner.ownerId, players)} ${pieceIndex + 1}번 말 ${piece.status === 'READY' ? '출발' : piece.status === 'FINISHED' ? '완주' : '이동 중'}`
        const face = <><PieceFace index={index} /><small>{piece.status === 'FINISHED' ? '✓' : pieceIndex + 1}</small></>
        return allowed ? <button type="button" key={piece.pieceId} disabled={pending} aria-label={label} onClick={() => onPiece(piece.pieceId)}>{face}</button> : <span key={piece.pieceId} className={piece.status !== 'READY' ? 'away' : ''} role="img" aria-label={label}>{face}</span>
      })}</div>
    </div>)}</div>
    {animating && createPortal(<div className="yutThrowOverlay">
      <div className="yutThrowOverlayScene">
        <YutThrowScene result={resultKey !== throwStart ? latestResult : undefined} active animationId={throwAnimation} />
        <p className="srOnly" role="status">{resultKey !== throwStart && latestResult ? `${resultNames[latestResult]}!` : '윷을 던지고 있어요'}</p>
      </div>
    </div>, document.body)}
    {action?.type === 'THROW_YUT' && createPortal(<div className="yutFloatingThrow">
      <Button className="yutThrowButton" disabled={pending || animating} onClick={() => { if (pending || animating) return; setThrowStart(resultKey); setThrowAnimation(value => value + 1); setAnimating(true); onThrow() }}>{pending || animating ? '윷 던지는 중…' : state.turn.pendingBonusThrows > 0 ? '한 번 더, 윷 던지기!' : '윷 던지기!'}<span aria-hidden="true">↗</span></Button>
    </div>, document.body)}
    <section className="yutPlayActions" aria-label="현재 할 수 있는 행동">
      {state.turn.moveTokens.length > 0 && <div className="yutMoveChoices" aria-label="남은 이동권">{state.turn.moveTokens.map(token => action?.type === 'SELECT_MOVE_TOKEN' && action.moveTokenIds.includes(token.moveTokenId) ? <button disabled={pending} key={token.moveTokenId} type="button" onClick={() => onToken(token.moveTokenId)}><b>{resultNames[token.result]}</b><span>{token.steps}칸 이동</span></button> : <span key={token.moveTokenId}><b>{resultNames[token.result]}</b><span>{token.steps}칸</span></span>)}</div>}
      {action?.type === 'SELECT_PIECE' && <div className="yutPieceChoices">{action.eligiblePieceIds.map((id, index) => { const piece = state.pieces.find(item => item.pieceId === id); const ownerIndex = Math.max(0, state.finishedPieceCounts.findIndex(owner => owner.ownerId === piece?.ownerId)); return <button type="button" key={id} disabled={pending} style={{ '--piece-color': colors[ownerIndex % colors.length] } as CSSProperties} onClick={() => onPiece(id)}><PieceFace index={ownerIndex} /><span>{piece?.status === 'READY' ? `새 말 ${index + 1} 출발` : `${index + 1}번 말 이동`}</span>{piece && piece.groupPieceIds.length > 1 && <small>{piece.groupPieceIds.length}개 함께</small>}</button> })}</div>}
      {action?.type === 'SELECT_PATH' && <div className="yutPathChoices">{action.eligiblePathIds.map(id => <button key={id} type="button" disabled={pending} onClick={() => onPath(id)}><b>{id.includes('SHORTCUT') ? '↗' : '↱'}</b>{id.includes('SHORTCUT') ? '지름길로 가요' : '바깥길로 가요'}</button>)}</div>}
      {!action && <p className="yutWatching" role="status">{current?.nickname ?? '친구'}님의 다음 수를 기다려요 <span aria-hidden="true">···</span></p>}
    </section>
  </div>
}









