import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, Card, SpinnerText } from '../../../components/ui'
import type { BlindGameState } from '../../../api/types'
import blindCharacters from '../../../assets/characters/noopi-blind-game-choice.png'
import catSeatedCharacter from '../../../assets/characters/noopi-cat-seated.png'
import dogSeatedCharacter from '../../../assets/characters/noopi-dog-seated.png'
import catBackCharacter from '../../../assets/characters/noopi-cat-back.png'
import dogBackCharacter from '../../../assets/characters/noopi-dog-back.png'
import catVictoryCharacter from '../../../assets/characters/noopi-cat-blind-victory.png'
import dogVictoryCharacter from '../../../assets/characters/noopi-dog-blind-victory.png'
import catDefeatCharacter from '../../../assets/characters/noopi-cat-blind-defeat.png'
import dogDefeatCharacter from '../../../assets/characters/noopi-dog-blind-defeat.png'

export function BlindReadyView({ host, pending, onStart }: { host: boolean; pending: boolean; onStart: () => void }) {
  return <div className="blindReadyScreen"><img className="blindReadyBackdrop" src={blindCharacters} alt="" aria-hidden /><div className="blindReadyContent"><p className="eyebrow">블라인드 게임</p><h1>게임 준비 완료!</h1><p className="sub">두 사람의 제시어를 준비했어요.</p>{host ? <Button disabled={pending} onClick={onStart}>{pending ? '시작 중...' : '게임 시작'}</Button> : <SpinnerText>방장이 게임을 시작할 거예요</SpinnerText>}</div></div>
}

export function BlindGuessingView({ state, meGender, opponentGender, pending, onGuess }: { state: Extract<BlindGameState, { phase: 'GUESSING' }>; meGender: 'MALE' | 'FEMALE'; opponentGender: 'MALE' | 'FEMALE'; pending: boolean; onGuess: (answer: string) => Promise<boolean> }) {
  const [answer, setAnswer] = useState('')
  const [wrongAttempt, setWrongAttempt] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrongTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(wrongTimerRef.current), [])
  const submit = async () => {
    if (!answer.trim() || pending) return
    const correct = await onGuess(answer.trim())
    if (!correct) {
      setAnswer('')
      setWrongAttempt(attempt => attempt + 1)
      window.clearTimeout(wrongTimerRef.current)
      wrongTimerRef.current = window.setTimeout(() => setWrongAttempt(0), 800)
      inputRef.current?.focus()
    }
  }
  const opponentCharacter = opponentGender === 'FEMALE' ? dogSeatedCharacter : catSeatedCharacter
  const myBackCharacter = meGender === 'FEMALE' ? dogBackCharacter : catBackCharacter
  return <div className={`blindGuessingScreen ${wrongAttempt > 0 ? 'isWrong' : ''}`}><p className="eyebrow blindSceneEyebrow">상대방의 제시어</p><section className="blindFaceScene" aria-label={`${state.opponentPlayer.nickname}의 제시어는 ${state.opponentKeyword}`}><div className="blindOpponent"><img src={opponentCharacter} alt="" /><span className="blindForeheadCard">{state.opponentKeyword}</span><small>{state.opponentPlayer.nickname}</small></div><img className="blindMeForeground" src={myBackCharacter} alt="" aria-hidden />{wrongAttempt > 0 && <div key={wrongAttempt} className="blindWrongFeedback" role="status" aria-label="정답이 아니에요"><svg aria-hidden viewBox="0 0 48 48"><path d="M14 14 34 34M34 14 14 34" /></svg></div>}</section><form className="blindAnswerForm" onSubmit={event => { event.preventDefault(); void submit() }}><label htmlFor="blind-answer">내 제시어는 무엇일까요?</label><div><input ref={inputRef} id="blind-answer" value={answer} maxLength={100} autoComplete="off" disabled={pending} onChange={event => setAnswer(event.target.value)} placeholder="정답을 입력해주세요" /><Button type="submit" disabled={!answer.trim() || pending}>{pending ? '확인 중...' : '제출'}</Button></div></form></div>
}

export function BlindFinalView({ state, meId, meGender, host, pending, onAction }: { state: Extract<BlindGameState, { phase: 'FINISHED' }>; meId: number; meGender: 'MALE' | 'FEMALE'; host: boolean; pending: boolean; onAction: (action: 'REPLAY' | 'OTHER') => void }) {
  const won = state.result.winnerPlayer.playerId === meId
  const resultCharacter = meGender === 'FEMALE'
    ? (won ? dogVictoryCharacter : dogDefeatCharacter)
    : (won ? catVictoryCharacter : catDefeatCharacter)
  return <div className={`blindFinalView ${won ? 'isVictory' : 'isDefeat'}`}><img className="blindVictoryBackdrop" src={resultCharacter} alt="" aria-hidden />{won && <div className="confetti" aria-hidden>✦　·　✧　⋆</div>}<p className="eyebrow">게임 종료</p><h1>{won ? '내가 맞혔어요' : '졌어요 ㅠㅠ'}</h1><Card className="resultCard blindResultCard"><div><span>승자</span><b><Avatar name={state.result.winnerPlayer.nickname} /> {state.result.winnerPlayer.nickname}</b></div>{state.result.keywordAssignments.map(item => <div key={item.playerId}><span>{item.nickname}의 제시어</span><b>{item.keyword}</b></div>)}</Card>{host ? <><Button disabled={pending} onClick={() => onAction('REPLAY')}>같은 게임 다시하기</Button><Button className="secondary" disabled={pending} onClick={() => onAction('OTHER')}>다른 게임 고르기</Button></> : <SpinnerText>방장이 다음 게임을 고르고 있어요</SpinnerText>}</div>
}
