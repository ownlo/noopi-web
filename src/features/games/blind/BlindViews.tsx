import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, Card, SpinnerText } from '../../../components/ui'
import type { BlindGameState } from '../../../api/types'

export function BlindReadyView({ host, pending, onStart }: { host: boolean; pending: boolean; onStart: () => void }) {
  return <><div className="gameIcon">🙈</div><p className="eyebrow">블라인드 게임</p><h1>게임 준비 완료!</h1><p className="sub">두 사람의 제시어를 준비했어요.</p>{host ? <Button disabled={pending} onClick={onStart}>{pending ? '시작 중...' : '게임 시작'}</Button> : <SpinnerText>방장이 게임을 시작할 거예요</SpinnerText>}</>
}

export function BlindGuessingView({ state, pending, onGuess }: { state: Extract<BlindGameState, { phase: 'GUESSING' }>; pending: boolean; onGuess: (answer: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  const submit = async () => {
    if (!answer.trim() || pending) return
    const correct = await onGuess(answer.trim())
    if (!correct) { setAnswer(''); setOpen(false) }
  }
  return <><p className="eyebrow">상대방의 제시어</p><Card className="blindKeywordCard"><Avatar name={state.opponentPlayer.nickname} /><small>{state.opponentPlayer.nickname}의 제시어</small><strong>{state.opponentKeyword}</strong></Card><Button onClick={() => setOpen(true)}>정답 맞히기</Button>{open && <div className="dialogBackdrop blindGuessBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) setOpen(false) }}><section className="blindGuessDialog" role="dialog" aria-modal="true" aria-labelledby="blind-guess-title"><h2 id="blind-guess-title">정답을 입력하세요</h2><label htmlFor="blind-answer">내 제시어 추측</label><input ref={inputRef} id="blind-answer" value={answer} maxLength={100} autoComplete="off" onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void submit() }} placeholder="정답을 입력해주세요" /><div className="blindGuessActions"><Button className="secondary" disabled={pending} onClick={() => setOpen(false)}>취소</Button><Button disabled={!answer.trim() || pending} onClick={() => void submit()}>{pending ? '확인 중...' : '제출'}</Button></div></section></div>}</>
}

export function BlindFinalView({ state, meId, host, pending, onAction }: { state: Extract<BlindGameState, { phase: 'FINISHED' }>; meId: number; host: boolean; pending: boolean; onAction: (action: 'REPLAY' | 'OTHER') => void }) {
  const won = state.result.winnerPlayer.playerId === meId
  return <><div className="confetti" aria-hidden>✦　·　✧　⋆</div><div className="gameIcon">{won ? '🏆' : '👏'}</div><p className="eyebrow">게임 종료</p><h1>{won ? '내가 맞혔어요!' : `${state.result.winnerPlayer.nickname} 승리!`}</h1><Card className="resultCard blindResultCard"><div><span>승자</span><b><Avatar name={state.result.winnerPlayer.nickname} /> {state.result.winnerPlayer.nickname}</b></div>{state.result.keywordAssignments.map(item => <div key={item.playerId}><span>{item.nickname}의 제시어</span><b>{item.keyword}</b></div>)}</Card>{host ? <><Button disabled={pending} onClick={() => onAction('REPLAY')}>같은 게임 다시하기</Button><Button className="secondary" disabled={pending} onClick={() => onAction('OTHER')}>다른 게임 고르기</Button></> : <SpinnerText>방장이 다음 게임을 고르고 있어요</SpinnerText>}</>
}
