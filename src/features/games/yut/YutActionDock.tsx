import { createPortal } from 'react-dom'
import type { YutGameState } from '../../../api/types'
import { YutThrowButton } from './YutThrowButton'
import { pathLabels } from './yutBoardPresentation'
import './yut-actions.css'

type PlayingState = Extract<YutGameState, { phase: 'PLAYING' }>
const resultNames = { BACK_DO: '빽도', DO: '도', GAE: '개', GEOL: '걸', YUT: '윷', MO: '모' } as const

export function YutActionDock({ state, pending, animating, onThrow, onToken, onPath }: {
  state: PlayingState
  pending: boolean
  animating: boolean
  onThrow: (power: number) => void
  onToken: (id: string) => void
  onPath: (id: string) => void
}) {
  const action = state.myAction
  if (!action) return null
  const tokens = action.type === 'SELECT_MOVE_TOKEN'
    ? state.turn.moveTokens.filter(token => action.moveTokenIds.includes(token.moveTokenId))
    : []

  return createPortal(<section className="yutFloatingThrow yutActionDock" aria-label="현재 할 수 있는 행동">
    {action.type === 'THROW_YUT' && <YutThrowButton
      key={`${state.turn.currentPlayerId}:${state.turn.turnNo}:${state.turn.throwResults.length}`}
      disabled={pending || animating}
      bonus={state.turn.pendingBonusThrows > 0}
      onThrow={onThrow}
    />}
    {action.type === 'SELECT_MOVE_TOKEN' && tokens.length > 0 && <div className="yutDockStep" key="tokens">
      <p className="srOnly" role="status">{pending ? '이동을 준비하고 있어요…' : '눌러서 말을 움직여요'}</p>
      <div className={`yutDockTokens ${tokens.length === 1 ? 'single' : ''}`} aria-label="이동권 선택">
        {tokens.map(token => <button key={token.moveTokenId} type="button" className="yutDockToken" disabled={pending} onClick={() => onToken(token.moveTokenId)}>
          <b>{resultNames[token.result]}</b><span>{token.result === 'BACK_DO' ? '1칸 뒤로' : `${token.steps}칸 이동`}</span>
        </button>)}
      </div>
    </div>}
    {action.type === 'SELECT_PIECE' && pending && <div className="yutDockStep" key="pieces">
      <p className="yutDockHint pieceHint" role="status">말을 움직이고 있어요…</p>
    </div>}
    {action.type === 'SELECT_PATH' && <div className="yutDockStep" key="paths">
      <p className="yutDockHint" role="status">{pending ? '말을 움직이고 있어요…' : '어느 길로 갈까요?'}</p>
      <div className="yutDockPaths">{action.eligiblePathIds.map(id => <button key={id} type="button" disabled={pending} onClick={() => onPath(id)}>{pathLabels[id] ?? '이 경로로 가요'}</button>)}</div>
    </div>}
  </section>, document.body)
}
