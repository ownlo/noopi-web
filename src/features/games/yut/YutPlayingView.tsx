import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Player, YutGameState, YutPiece, YutResultCode, YutThrowResult } from '../../../api/types'
import cat from '../../../assets/characters/noopi-cat.png'
import dog from '../../../assets/characters/noopi-dog.png'
import './yut-playing.css'
import { YutThrowScene } from './YutThrowScene'
import { YutActionDock } from './YutActionDock'
import { useYutCaptureAnimation } from './useYutCaptureAnimation'
import { useYutStepAnimation } from './useYutStepAnimation'
import { YutBoardDecorations } from './YutBoardDecorations'
import { boardNodes, outerNodes, pathChoicePresentation, pathLabels } from './yutBoardPresentation'

type PlayingState = Extract<YutGameState, { phase: 'PLAYING' }>
const resultNames = { NAK: '낙', BACK_DO: '빽도', DO: '도', GAE: '개', GEOL: '걸', YUT: '윷', MO: '모' } as const
const colors = ['#b66bff', '#369cff', '#c1ff24', '#ff4d5e']
const position = (x: number, y: number): CSSProperties => ({ left: `${x}%`, top: `${y}%` })

function ownerLabel(ownerId: string, players: Player[]) {
  return ownerId === 'NOOPI' ? '누피팀' : ownerId === 'DAY' ? '데이팀' : players.find(player => String(player.playerId) === ownerId)?.nickname ?? '참가자'
}

function PieceFace({ index }: { index: number }) {
  return <span className="yutPieceFace" aria-hidden="true"><img src={index % 2 === 0 ? cat : dog} alt="" /></span>
}

function TeamScoreboard({ state, players, myPlayerId }: { state: PlayingState; players: Player[]; myPlayerId: number }) {
  if (state.mode !== 'TEAM' || !state.teams) return null

  return <div className="yutTeamScoreboard" aria-label="팀별 참가자와 현재 차례">
    {state.teams.map((team, index) => {
      const activeTeam = team.players.some(player => player.playerId === state.turn.currentPlayerId)

      return <section
        className={`yutTeamScore ${activeTeam ? 'active' : ''}`}
        key={team.team}
        style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}
        aria-label={`${team.name}${activeTeam ? ', 현재 차례 팀' : ''}`}
      >
        <header className="yutTeamScoreHeader">
          <PieceFace index={index} />
          <strong>{team.name}</strong>
        </header>
        <ul className="yutTeamScorePlayers">
          {team.players.map(teamPlayer => {
            const activePlayer = teamPlayer.playerId === state.turn.currentPlayerId
            const isMe = teamPlayer.playerId === myPlayerId
            const player = players.find(item => item.playerId === teamPlayer.playerId)

            return <li
              className={activePlayer ? 'active' : ''}
              key={teamPlayer.playerId}
              aria-current={activePlayer ? 'step' : undefined}
              aria-label={`${teamPlayer.nickname}${isMe ? ', 나' : ''}${activePlayer ? ', 현재 차례' : ''}`}
            >
              <span className={`yutTeamScorePlayerDot ${player?.connectionStatus === 'DISCONNECTED' ? 'disconnected' : ''}`} aria-hidden="true" />
              <span className="yutTeamScorePlayerName">{teamPlayer.nickname}{isMe && <small>나</small>}</span>
              {activePlayer && <em>{isMe ? '내 차례' : '차례'}</em>}
            </li>
          })}
        </ul>
      </section>
    })}
  </div>
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
function Board({ state, players, pending, onPiece, onPath }: { state: PlayingState; players: Player[]; pending: boolean; onPiece: (id: string) => void; onPath: (id: string) => void }) {
  const woodFillId = useId()
  const boardRef = useRef<HTMLDivElement>(null)
  useYutStepAnimation(boardRef, state.pieces)
  const capture = useYutCaptureAnimation(state.pieces, boardRef)
  const owners = state.finishedPieceCounts.map(item => item.ownerId)
  const eligible = state.myAction?.type === 'SELECT_PIECE' ? state.myAction.eligiblePieceIds : []
  const groups = state.pieces.filter((piece, index, pieces) => piece.status === 'ON_BOARD' && !pieces.slice(0, index).some(other => other.groupPieceIds.includes(piece.pieceId)))
  const unplaced = groups.filter(piece => !boardNodes.some(node => node.id === piece.nodeId))
  const pathAction = state.myAction?.type === 'SELECT_PATH' ? state.myAction : null
  const selectedPiece = pathAction ? state.pieces.find(piece => piece.pieceId === pathAction.pieceId || piece.groupPieceIds.includes(pathAction.pieceId)) : undefined
  const pathChoices = pathAction?.eligiblePathIds.map((pathId, index) => {
    const mapped = selectedPiece?.nodeId ? pathChoicePresentation[selectedPiece.nodeId]?.[pathId] : undefined
    return { pathId, ...(mapped ?? { x: 38 + index * 24, y: 10, angle: index === 0 ? -90 : 90, label: pathLabels[pathId] ?? '이 길' }) }
  }) ?? []
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

      {pathChoices.map(choice => <button
        key={choice.pathId}
        type="button"
        className="yutBoardPathChoice"
        style={{ ...position(choice.x, choice.y), '--path-angle': `${choice.angle}deg` } as CSSProperties}
        disabled={pending}
        aria-label={`${pathLabels[choice.pathId] ?? `${choice.label}로 이동`}${pending ? ' 선택 중' : ''}`}
        onClick={() => onPath(choice.pathId)}
      ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V5M5 12l7-7 7 7" /></svg></button>)}


      {groups.map(piece => { const node = boardNodes.find(item => item.id === piece.nodeId); return node ? renderPiece(piece, node.x, node.y) : null })}
      {capture.captured.map(piece => { const node = boardNodes.find(item => item.id === piece.nodeId); return node ? renderPiece(piece, node.x, node.y, true) : null })}
    </div>
    {capture.captured.length > 0 && <span className="srOnly" role="status">상대 말을 잡았어요!</span>}
    {unplaced.length > 0 && <p className="yutBoardNote">지름길 위의 말: {unplaced.map(piece => ownerLabel(piece.ownerId, players)).join(', ')}</p>}
  </>
}

export function YutPlayingView({ state, players, myPlayerId, pending, onThrow, onToken, onPiece, onPath }: { state: PlayingState; players: Player[]; myPlayerId: number; pending: boolean; onThrow: () => Promise<YutThrowResult | undefined>; onToken: (id: string) => void; onPiece: (id: string) => void; onPath: (id: string) => void }) {
  const [throwAnimation, setThrowAnimation] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [displayedResult, setDisplayedResult] = useState<YutResultCode>()
  const [throwPower, setThrowPower] = useState(0)
  const observedThrow = useRef(state.lastThrow?.sequence ?? 0)
  const pendingThrowPower = useRef<number | null>(null)
  useEffect(() => {
    if (!animating) return
    const timer = window.setTimeout(() => setAnimating(false), 1800)
    return () => window.clearTimeout(timer)
  }, [animating, displayedResult, throwAnimation])
  useEffect(() => {
    const latest = state.lastThrow
    if (!latest || latest.sequence <= observedThrow.current) return
    observedThrow.current = latest.sequence
    setDisplayedResult(latest.result)
    setThrowPower(latest.playerId === myPlayerId && pendingThrowPower.current !== null ? pendingThrowPower.current : .65)
    pendingThrowPower.current = null
    setThrowAnimation(value => value + 1)
    setAnimating(true)
  }, [myPlayerId, state.lastThrow])
  const current = players.find(player => player.playerId === state.turn.currentPlayerId)
  const isMyTurn = state.turn.currentPlayerId === myPlayerId
  const myRanking = state.rankings.find(player => player.playerId === myPlayerId)
  const action = state.myAction
  const hasFloatingAction = action !== null && action.type !== 'SELECT_PATH'
  return <div className={`yutPlay ${hasFloatingAction ? 'hasFloatingAction' : ''}`}>
    {state.mode === 'TEAM' && state.teams ? <TeamScoreboard state={state} players={players} myPlayerId={myPlayerId} /> : <div className="yutScoreboard" aria-label="참가자와 현재 차례">{state.finishedPieceCounts.map((owner, index) => {
      const active = state.mode === 'TEAM' ? state.teams?.find(team => team.team === owner.ownerId)?.players.some(player => player.playerId === state.turn.currentPlayerId) : owner.ownerId === String(state.turn.currentPlayerId)
      const ranking = state.mode === 'INDIVIDUAL' ? state.rankings.find(player => String(player.playerId) === owner.ownerId) : undefined
      return <div key={owner.ownerId} className={`yutScore ${active ? 'active' : ''} ${active && isMyTurn ? 'myTurn' : ''} ${ranking ? 'finished' : ''}`} style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}><PieceFace index={index} /><strong>{ownerLabel(owner.ownerId, players)}</strong>{ranking ? <span className="yutRankStamp" data-rank={ranking.rank} role="img" aria-label={`${ranking.rank}등 완주`}>{ranking.rank}등</span> : active && <em>{isMyTurn ? '내 차례' : '지금 차례'}</em>}</div>
    })}</div>}
    <Board state={state} players={players} pending={pending} onPiece={onPiece} onPath={onPath} />
    <div className="yutPieceDocks" aria-label="참가자별 말 대기석">{state.finishedPieceCounts.map((owner, index) => <div className="yutPieceDock" key={owner.ownerId} style={{ '--piece-color': colors[index % colors.length] } as CSSProperties}>
      <strong>{ownerLabel(owner.ownerId, players)}<small>의 말</small></strong>
      <div>{state.pieces.filter(piece => piece.ownerId === owner.ownerId).map((piece, pieceIndex) => {
        const allowed = piece.status === 'READY' && action?.type === 'SELECT_PIECE' && action.eligiblePieceIds.includes(piece.pieceId)
        const label = `${ownerLabel(owner.ownerId, players)} ${pieceIndex + 1}번 말 ${piece.status === 'READY' ? '출발' : piece.status === 'FINISHED' ? '완주' : allowed ? '이동' : '이동 중'}${piece.groupPieceIds.length > 1 ? `, ${piece.groupPieceIds.length}개 업음` : ''}`
        const face = <><PieceFace index={index} /><small>{piece.status === 'FINISHED' ? '✓' : pieceIndex + 1}</small></>
        const statusClass = piece.status === 'FINISHED' ? 'finished' : piece.status === 'ON_BOARD' ? 'onBoard' : 'ready'
        return allowed ? <button type="button" key={piece.pieceId} disabled={pending} aria-label={label} onClick={() => onPiece(piece.pieceId)}>{face}</button> : <span key={piece.pieceId} className={statusClass} role="img" aria-label={label}>{face}</span>
      })}</div>
    </div>)}</div>
    {animating && createPortal(<div className="yutThrowOverlay">
      <div className="yutThrowOverlayScene">
        <YutThrowScene result={displayedResult} active={displayedResult !== undefined} animationId={throwAnimation} power={throwPower} />
        <p className="srOnly" role="status">{displayedResult ? `${resultNames[displayedResult]}!${displayedResult === 'NAK' ? ' 이번 던지기는 무효예요.' : ''}` : '윷을 던지고 있어요'}</p>
      </div>
    </div>, document.body)}
    {!myRanking && <YutActionDock state={state} pending={pending} animating={animating} onToken={onToken} onThrow={power => {
      if (pending || animating) return
      pendingThrowPower.current = power
      void onThrow().then(result => {
        if (!result) pendingThrowPower.current = null
      })
    }} />}
    <section className="yutPlayActions" aria-label="현재 할 수 있는 행동">
      {myRanking ? <div className="yutSpectating" role="status"><strong>{myRanking.rank}위로 완주했어요!</strong><p>이제 편하게 남은 경기를 관전해요 👀</p></div> : !action && <p className="yutWatching" role="status">{current?.nickname ?? '친구'}님의 다음 수를 기다려요 <span aria-hidden="true">···</span></p>}
    </section>
  </div>
}
