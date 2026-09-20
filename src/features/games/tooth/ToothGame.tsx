import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api'
import type { Player, RoomState } from '../../../api/types'
import { Avatar, Button } from '../../../components/ui'
import toothCharacter from '../../../assets/characters/noopi-tooth-open-mouth.png'
import toothBiteCharacter from '../../../assets/characters/noopi-tooth-bite.png'
import type { Tooth, ToothGameState, ToothOutcome } from './types'
import './tooth.css'

type Props = {
  game: ToothGameState
  state: RoomState
  pending: boolean
  onStart: () => void
  onReplay: () => void
  onOther: () => void
}

function playEffect(outcome: ToothOutcome, muted: boolean) {
  if (muted) return
  const AudioContextType = window.AudioContext
  if (!AudioContextType) return
  const context = new AudioContextType()
  const gain = context.createGain()
  gain.connect(context.destination)
  const now = context.currentTime
  if (outcome === 'SAFE') {
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(760, now); oscillator.frequency.exponentialRampToValueAtTime(430, now + .08)
    gain.gain.setValueAtTime(.08, now); gain.gain.exponentialRampToValueAtTime(.001, now + .1)
    oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .11)
  } else {
    const oscillator = context.createOscillator()
    oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(160, now); oscillator.frequency.exponentialRampToValueAtTime(48, now + .32)
    gain.gain.setValueAtTime(.18, now); gain.gain.exponentialRampToValueAtTime(.001, now + .38)
    oscillator.connect(gain); oscillator.start(now); oscillator.stop(now + .4)
  }
  window.setTimeout(() => void context.close(), 500)
}

function playVibration(outcome: ToothOutcome) {
  if (!navigator.vibrate) return
  navigator.vibrate(outcome === 'SAFE' ? 25 : [110, 45, 220])
}

function toothCurve(index: number) {
  return Math.round(Math.abs(index - 5.5) * 1.35)
}

function ToothButton({ tooth, index, disabled, active, onSelect }: { tooth: Tooth; index: number; disabled: boolean; active: boolean; onSelect: (toothId: number) => void }) {
  const selected = tooth.status === 'SELECTED'
  const curve = toothCurve(index)
  const offset = tooth.row === 'UPPER' ? curve : -Math.round(curve * 2.4)
  return <button
    type="button"
    className={`toothButton ${tooth.row.toLowerCase()}${selected ? ' selected' : ''}${active ? ' active' : ''}`}
    style={{ transform: `translateY(${offset}px)` }}
    disabled={disabled || selected}
    onClick={() => onSelect(tooth.toothId)}
    aria-label={`${tooth.row === 'UPPER' ? '윗니' : '아랫니'} ${tooth.toothId}${selected ? ', 이미 눌림' : ', 선택 가능'}`}
    aria-pressed={selected}
  ><span aria-hidden>{selected ? '·' : ''}</span></button>
}

function PlayerTurnRail({ players, order, currentPlayerId, myPlayerId }: { players: Player[]; order: number[]; currentPlayerId: number | null; myPlayerId: number }) {
  return <ol className="toothTurnRail" aria-label="플레이 순서">{order.map((playerId, index) => {
    const player = players.find(item => item.playerId === playerId)
    if (!player) return null
    const current = playerId === currentPlayerId
    const myTurn = current && playerId === myPlayerId
    return <li key={playerId} className={`${current ? 'current' : ''}${myTurn ? ' myTurn' : ''}`} aria-current={current ? 'step' : undefined} aria-label={`${index + 1}번째 ${player.nickname}${myTurn ? ', 내 차례' : current ? ', 현재 차례' : ''}`}>
      <div className="toothTurnAvatar"><Avatar name={player.nickname} />{current && <i>{myTurn ? '내 차례' : '차례'}</i>}</div>
      <span>{player.nickname}</span>
    </li>
  })}</ol>
}

export function ToothGame({ game, state, pending, onStart, onReplay, onOther }: Props) {
  const queryClient = useQueryClient()
  const lock = useRef(false)
  const seenSequence = useRef(game.phase === 'PLAYING' || game.phase === 'FINISHED' ? game.lastSelection?.sequence ?? 0 : 0)
  const [busy, setBusy] = useState(false)
  const [pressedToothId, setPressedToothId] = useState<number | null>(null)
  const [flash, setFlash] = useState<ToothOutcome | null>(game.phase === 'FINISHED' ? 'BOMB' : null)
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null)

  useEffect(() => { setHeaderTarget(document.getElementById('room-game-controls')) }, [])

  const soundControl = headerTarget ? createPortal(
    <button type="button" className="toothMute toothHeaderMute" onClick={() => setMuted(value => !value)} aria-label={muted ? '효과음 켜기' : '효과음 끄기'}>{muted ? '🔇' : '🔊'}</button>,
    headerTarget,
  ) : null

  const latest = game.phase === 'PLAYING' || game.phase === 'FINISHED' ? game.lastSelection : null
  useEffect(() => {
    if (!latest || latest.sequence <= seenSequence.current) return
    seenSequence.current = latest.sequence
    setPressedToothId(latest.toothId)
    setFlash(latest.outcome)
    playEffect(latest.outcome, muted)
    playVibration(latest.outcome)
    const timer = window.setTimeout(() => { if (latest.outcome === 'SAFE') { setFlash(null); setPressedToothId(null) } }, 950)
    return () => window.clearTimeout(timer)
  }, [latest, muted])

  async function choose(toothId: number) {
    if (game.phase !== 'PLAYING' || !game.allowedActions.includes('SELECT_TOOTH') || lock.current || !state.gameSession) return
    const tooth = game.teeth.find(item => item.toothId === toothId)
    if (!tooth || tooth.status !== 'AVAILABLE') return
    lock.current = true; setBusy(true); setPressedToothId(toothId); setFlash(null); setError('')
    const minimumPress = new Promise<void>(resolve => window.setTimeout(resolve, 260))
    try {
      const [result] = await Promise.all([api.selectTooth(state.room.roomId, state.gameSession.gameSessionId, toothId, crypto.randomUUID()), minimumPress])
      seenSequence.current = result.sequence
      setFlash(result.outcome)
      playEffect(result.outcome, muted)
      playVibration(result.outcome)
      await queryClient.invalidateQueries({ queryKey: ['room-state', state.room.roomId] }, { throwOnError: true })
      if (result.outcome === 'SAFE') await new Promise<void>(resolve => window.setTimeout(resolve, 680))
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : undefined
      setFlash(null)
      setError(code ? '차례가 바뀌었거나 이미 눌린 이빨이에요. 현재 상태를 다시 확인했어요.' : '연결이 불안정해요. 상태를 다시 확인해주세요.')
      await queryClient.invalidateQueries({ queryKey: ['room-state', state.room.roomId] })
    } finally {
      setPressedToothId(null); lock.current = false; setBusy(false)
    }
  }

  if (game.phase === 'READY') return <><section className="toothReady">
    <img src={toothCharacter} alt="입을 크게 벌리고 기다리는 누피" />
    <p className="eyebrow">누피 콱!</p><h1>어느 이빨이<br />꽝일까요?</h1>
    <p className="sub">24개 중 단 하나!<br />차례대로 이빨을 눌러 살아남으세요.</p>
    {state.me.host ? <Button disabled={pending} onClick={onStart}>{pending ? '이빨 숨기는 중…' : '게임 시작'}</Button> : <p className="toothWaiting">방장이 꽝 이빨을 숨기고 있어요…</p>}
  </section>{soundControl}</>

  if (game.phase === 'CANCELLED') return <><section className="toothResult"><div className="toothResultEmoji">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">방장이 대기실에서 새 게임을 준비할 수 있어요.</p></section>{soundControl}</>

  if (game.phase === 'FINISHED') return <><section className="toothResult isChomp">
    <div className="toothResultHero"><img src={toothBiteCharacter} alt="이빨을 앙 다문 누피" /></div>
    <p className="toothBang">콱!!!</p>
    <h1>{game.result.loserPlayer.nickname}님 당첨!</h1>
    {state.me.host ? <div className="toothResultActions"><Button disabled={pending} onClick={onReplay}>같은 게임 다시하기</Button><Button className="secondary" disabled={pending} onClick={onOther}>로비로 이동</Button></div> : <p className="toothWaiting">방장이 다음 게임을 고르고 있어요.</p>}
  </section>{soundControl}</>

  const currentPlayer = state.players.find(player => player.playerId === game.currentTurnPlayerId)
  const canSelect = game.allowedActions.includes('SELECT_TOOTH') && !busy
  const upper = game.teeth.filter(tooth => tooth.row === 'UPPER')
  const lower = game.teeth.filter(tooth => tooth.row === 'LOWER')
  return <><section className={`toothGame${flash === 'BOMB' ? ' isBomb' : ''}${flash === 'SAFE' ? ' isSafe' : ''}`} aria-busy={busy}>
    <PlayerTurnRail players={state.players} order={game.turnOrderPlayerIds} currentPlayerId={game.currentTurnPlayerId} myPlayerId={state.me.playerId} />
    <div className="toothArena">
      <img src={toothCharacter} alt="입을 크게 벌린 누피" />
      <div className="toothMouth" aria-label="누피 이빨 24개">
        <div className="toothRow upper">{upper.map((tooth, index) => <ToothButton key={tooth.toothId} tooth={tooth} index={index} disabled={!canSelect} active={pressedToothId === tooth.toothId} onSelect={choose} />)}</div>
        <div className="toothRow lower">{lower.map((tooth, index) => <ToothButton key={tooth.toothId} tooth={tooth} index={index} disabled={!canSelect} active={pressedToothId === tooth.toothId} onSelect={choose} />)}</div>
      </div>
      {flash === 'BOMB' && <div className="toothChompCover" aria-hidden />}
      <div className="toothFeedback" aria-live="assertive">{busy && !flash ? <span>두근…</span> : flash === 'SAFE' ? <strong>딸깍!<small>휴… 살았습니다!</small></strong> : flash === 'BOMB' ? <strong className="bomb">콱!</strong> : null}</div>
    </div>
    <div className="toothInstruction" role="status">{canSelect ? <><strong>내 차례예요!</strong><span>이빨 하나를 눌러주세요</span></> : busy ? <><strong>누피가 확인 중…</strong><span>잠시만 기다려주세요</span></> : <><strong>{currentPlayer?.nickname}님 차례</strong><span>어떤 이빨을 고를까요?</span></>}</div>
    {error && <p className="toothError" role="alert">{error}</p>}
  </section>{soundControl}</>
}
