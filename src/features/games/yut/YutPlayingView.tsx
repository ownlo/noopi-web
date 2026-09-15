import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Player, YutGameState, YutPiece } from '../../../api/types'
import cat from '../../../assets/characters/noopi-cat.png'
import dog from '../../../assets/characters/noopi-dog.png'
import './yut-playing.css'
import { YutThrowScene } from './YutThrowScene'
import { YutActionDock } from './YutActionDock'
import { useYutCaptureAnimation } from './useYutCaptureAnimation'
import { useYutStepAnimation } from './useYutStepAnimation'
import { YutBoardDecorations } from './YutBoardDecorations'
import { boardNodes, outerNodes } from './yutBoardPresentation'

type PlayingState = Extract<YutGameState, { phase: 'PLAYING' }>
const resultNames = { DO: '도', GAE: '개', GEOL: '걸', YUT: '윷', MO: '모' } as const
const colors = ['#b66bff', '#369cff', '#c1ff24', '#ff4d5e']
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
  const woodFillId = useId()
  const boardRef = useRef<HTMLDivElement>(null)
  useYutStepAnimation(boardRef, state.pieces)
  const capture = useYutCaptureAnimation(state.pieces, boardRef)
  const owners = state.finishedPieceCounts.map(item => item.ownerId)
  const eligible = state.myAction?.type === 'SELECT_PIECE' ? state.myAction.eligiblePieceIds : []
  const groups = state.pieces.filter((piece, index, pieces) => piece.status === 'ON_BOARD' && !pieces.slice(0, index).some(other => other.groupPieceIds.includes(piece.pieceId)))
  const unplaced = groups.filter(piece => !boardNodes.some(node => node.id === piece.nodeId))
  function renderPiece(piece: YutPiece, x: number, y: number, ghost = false) {
    const ownerIndex = Math.max(0, owners.indexOf(piece.ownerId))
    const selectableId = ghost ? undefined : [piece.pieceId, ...piece.groupPieceIds].find(id => eligible.includes(id))
    const label = `${ownerLabel(piece.ownerId, players)} 말${piece.groupPieceIds.length > 1 ? ` ${piece.groupPieceIds.length}개 업음` : ''}`
    const stacked = piece.groupPieceIds.length > 1
    const content = <><PieceFace index={ownerIndex} />{stacked && <b className="yutStackCount">x{piece.groupPieceIds.length}</b>}</>
    const style = { ...position(x, y), '--piece-color': colors[ownerIndex % colors.length] } as CSSProperties
    const className = `yutBoardPiece ${stacked ? 'isStacked' : ''} ${ghost ? 'captureGhost' : capture.attackerIds.includes(piece.pieceId) ? 'isCapturing' : ''}`
    return selectableId ? <button key={piece.pieceId} data-piece-id={piece.pieceId} type="button" className={`${className} selectable`} style={style} disabled={pending} aria-label={`${label} 이동`} onClick={() => onPiece(selectableId)}>{content}</button> : <span key={`${ghost ? 'ghost-' : ''}${piece.pieceId}`} data-piece-id={ghost ? undefined : piece.pieceId} className={className} style={style} role="img" aria-hidden={ghost || undefined} aria-label={label}>{content}</span>
  }
  return <>
    <div ref={boardRef} className="yutPlayBoard" aria-label="윷판, 우측 하단에서 출발해 위쪽으로 진행">
      <YutBoardDecorations />
      <svg className="yutBoardArt" viewBox="0 0 100 100" aria-hidden="true" style={{ '--wood-fill': `url(#${woodFillId})` } as CSSProperties}>
        <defs><radialGradient id={woodFillId} cx="44%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#c58d50" /><stop offset="15%" stopColor="#f5d49a" />
          <stop offset="18%" stopColor="#ad713a" /><stop offset="22%" stopColor="#f5d49a" />
          <stop offset="43%" stopColor="#edc48a" /><stop offset="46%" stopColor="#b47d42" />
          <stop offset="50%" stopColor="#f5d49a" /><stop offset="70%" stopColor="#edc48a" />
          <stop offset="73%" stopColor="#b47d42" /><stop offset="77%" stopColor="#f5d49a" />
          <stop offset="100%" stopColor="#d7a76c" />
        </radialGradient></defs>
        <path className="yutOuterLine" d="M88 88 V12 H12 V88 Z" />
        <path className="yutDiagonalLine" d="M12 12 L88 88 M88 12 L12 88" />
        {[1, 2, 3, 4, 5].map(step => <g key={step}><circle cx={12 + step * 76 / 6} cy={12 + step * 76 / 6} r={step === 3 ? 4 : 2.2} /><circle cx={88 - step * 76 / 6} cy={12 + step * 76 / 6} r={step === 3 ? 4 : 2.2} /></g>)}
        <path className="yutDirection" d="M95 83 V73 M93 76 L95 73 L97 76" />
      </svg>
      {outerNodes.map(node => <span key={node.id} className={`yutBoardSpot ${node.corner ? 'corner' : ''} ${node.id === 'OUTER_20' ? 'home' : ''}`} style={position(node.x, node.y)} aria-hidden="true">{node.id === 'OUTER_20' ? <YutHomeGate /> : node.id === 'OUTER_5' ? '☾' : node.id === 'OUTER_10' ? '✿' : node.id === 'OUTER_15' ? '♡' : ''}</span>)}


      {groups.map(piece => { const node = boardNodes.find(item => item.id === piece.nodeId); return node ? renderPiece(piece, node.x, node.y) : null })}
      {capture.captured.map(piece => { const node = boardNodes.find(item => item.id === piece.nodeId); return node ? renderPiece(piece, node.x, node.y, true) : null })}
    </div>
    {capture.captured.length > 0 && <span className="srOnly" role="status">상대 말을 잡았어요!</span>}
    {unplaced.length > 0 && <p className="yutBoardNote">지름길 위의 말: {unplaced.map(piece => ownerLabel(piece.ownerId, players)).join(', ')}</p>}
  </>
}

export function YutPlayingView({ state, players, myPlayerId, pending, onThrow, onToken, onPiece, onPath }: { state: PlayingState; players: Player[]; myPlayerId: number; pending: boolean; onThrow: () => void; onToken: (id: string) => void; onPiece: (id: string) => void; onPath: (id: string) => void }) {
  const [throwAnimation, setThrowAnimation] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [throwStart, setThrowStart] = useState('')
  const [throwPower, setThrowPower] = useState(0)
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
  return <div className={`yutPlay ${action ? 'hasFloatingAction' : ''}`}>
    <div className="yutScoreboard" aria-label="참가자와 현재 차례">{state.finishedPieceCounts.map((owner, index) => {
      const active = state.mode === 'TEAM' ? state.teams?.find(team => team.team === owner.ownerId)?.players.some(player => player.playerId === state.turn.currentPlayerId) : owner.ownerId === String(state.turn.currentPlayerId)
      return <div key={owner.ownerId} className={`yutScore ${active ? 'active' : ''} ${active && isMyTurn ? 'myTurn' : ''}`} style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}><PieceFace index={index} /><strong>{ownerLabel(owner.ownerId, players)}</strong>{active && <em>{isMyTurn ? '내 차례' : '지금 차례'}</em>}</div>
    })}</div>
    <Board state={state} players={players} pending={pending} onPiece={onPiece} />
    <div className="yutPieceDocks" aria-label="참가자별 말 대기석">{state.finishedPieceCounts.map((owner, index) => <div className="yutPieceDock" key={owner.ownerId} style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}>
      <strong>{ownerLabel(owner.ownerId, players)}<small>의 말</small></strong>
      <div>{state.pieces.filter(piece => piece.ownerId === owner.ownerId).map((piece, pieceIndex) => {
        const allowed = action?.type === 'SELECT_PIECE' && action.eligiblePieceIds.includes(piece.pieceId)
        const label = `${ownerLabel(owner.ownerId, players)} ${pieceIndex + 1}번 말 ${piece.status === 'READY' ? '출발' : piece.status === 'FINISHED' ? '완주' : allowed ? '이동' : '이동 중'}${piece.groupPieceIds.length > 1 ? `, ${piece.groupPieceIds.length}개 업음` : ''}`
        const face = <><PieceFace index={index} /><small>{piece.status === 'FINISHED' ? '✓' : pieceIndex + 1}</small></>
        return allowed ? <button type="button" key={piece.pieceId} disabled={pending} aria-label={label} onClick={() => onPiece(piece.pieceId)}>{face}</button> : <span key={piece.pieceId} className={piece.status !== 'READY' ? 'away' : ''} role="img" aria-label={label}>{face}</span>
      })}</div>
    </div>)}</div>
    {animating && createPortal(<div className="yutThrowOverlay">
      <div className="yutThrowOverlayScene">
        <YutThrowScene result={resultKey !== throwStart ? latestResult : undefined} active animationId={throwAnimation} power={throwPower} />
        <p className="srOnly" role="status">{resultKey !== throwStart && latestResult ? `${resultNames[latestResult]}!` : '윷을 던지고 있어요'}</p>
      </div>
    </div>, document.body)}
    <YutActionDock state={state} pending={pending} animating={animating} onToken={onToken} onPath={onPath} onThrow={power => { if (pending || animating) return; setThrowPower(power); setThrowStart(resultKey); setThrowAnimation(value => value + 1); setAnimating(true); onThrow() }} />
    <section className="yutPlayActions" aria-label="현재 할 수 있는 행동">
      {!action && <p className="yutWatching" role="status">{current?.nickname ?? '친구'}님의 다음 수를 기다려요 <span aria-hidden="true">···</span></p>}
    </section>
  </div>
}
