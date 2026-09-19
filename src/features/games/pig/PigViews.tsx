import { Button, SpinnerText } from '../../../components/ui'
import readyCharacter from '../../../assets/characters/noopi-pig-ready.png'
import finalCharacter from '../../../assets/characters/noopi-pig-stop.png'
import type { RoomState } from '../../../api/types'
import type { PigGameState } from './types'

export function PigReadyView({ state, pending, onStart }: { state: RoomState; pending: boolean; onStart: () => void }) {
  return <div className="pigScreen pigReady"><p className="eyebrow">피그 게임</p><h1>욕심은 살짝,<br /><em>타이밍은 완벽하게.</em></h1><div className="pigReadyArt" aria-hidden><img src={readyCharacter} alt="" /></div><div className="pigRule"><strong>목표는 50점</strong><p>굴려서 모으고, 멈춰서 챙겨요.<br />1이 나오면 이번 턴 점수는 안녕!</p></div>{state.me.host ? <Button disabled={pending} onClick={onStart}>{pending ? '준비 중…' : '주사위 게임 시작'}</Button> : <SpinnerText>방장이 게임을 시작할 때까지 기다려주세요</SpinnerText>}</div>
}

export function PigFinalView({ game, state, pending, onReplay, onOther }: { game: Extract<PigGameState, { phase: 'FINISHED' }>; state: RoomState; pending: boolean; onReplay: () => void; onOther: () => void }) {
  return <div className="pigScreen pigFinal"><img className="pigVictoryBackdrop" src={finalCharacter} alt="" aria-hidden /><h1>오늘의 승부사들</h1><ol className="pigRanking">{game.rankings.map(p => <li key={p.playerId} className={p.rank === 1 ? 'winner' : p.rank === game.rankings.length ? 'last' : ''}><strong className="pigFinalRankStamp" data-rank={p.rank}>{p.rank}위</strong><span>{p.nickname}{p.playerId === state.me.playerId && <small> 나</small>}</span><b>{p.totalScore}<small>점</small></b></li>)}</ol>{state.me.host ? <div className="stack"><Button disabled={pending} onClick={onReplay}>한 판 더!</Button><Button className="secondary" disabled={pending} onClick={onOther}>다른 게임 선택</Button></div> : <SpinnerText>방장이 다음 게임을 고르고 있어요</SpinnerText>}</div>
}
