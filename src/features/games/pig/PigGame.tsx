import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api'
import { Avatar, Button, CharacterStage } from '../../../components/ui'
import type { RealtimeEvent, RoomState } from '../../../api/types'
import type { PigAction, PigGameState } from './types'
import { PigReadyView, PigFinalView } from './PigViews'
import { PigDice } from './PigDice'
import { usePigRemoteRoll } from './usePigRemoteRoll'
import pigArenaCharacter from '../../../assets/characters/noopi-pig-game-choice.png'
import './pig.css'

export function PigGame({ game, state, pending, onStart, onReplay, onOther, rollEvent }: { game: PigGameState; state: RoomState; pending: boolean; onStart: () => void; onReplay: () => void; onOther: () => void; rollEvent: RealtimeEvent | null }) {
  const client = useQueryClient()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [diceMotion, setDiceMotion] = useState<'idle' | 'rolling' | 'landing'>('idle')
  const remoteRoll = usePigRemoteRoll(rollEvent, state.gameSession?.gameSessionId, state.me.playerId)
  const animating = busy || remoteRoll !== null
  async function act(action: PigAction) {
    if (lock.current || remoteRoll || game.phase !== 'PLAYING' || !game.allowedActions.includes(action) || !state.gameSession) return
    lock.current = true; setBusy(true); setError('')
    const animate = action === 'ROLL' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const flight = animate ? new Promise<void>(resolve => window.setTimeout(resolve, 650)) : Promise.resolve()
    if (animate) setDiceMotion('rolling')
    let succeeded = false
    try {
      await (action === 'ROLL' ? api.rollPig : api.stopPig)(state.room.roomId, state.gameSession.gameSessionId, crypto.randomUUID())
      succeeded = true
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : undefined
      setError(code ? '차례가 바뀌었거나 이미 처리된 행동이에요. 현재 상태를 확인해주세요.' : '연결이 불안정해요. 상태를 다시 확인해주세요.')
    } finally {
      try {
        await client.invalidateQueries({ queryKey: ['room-state', state.room.roomId] }, { throwOnError: true })
        await flight
        if (animate && succeeded) {
          setDiceMotion('landing')
          await new Promise<void>(resolve => window.setTimeout(resolve, 700))
        }
      } catch {
        setError('현재 상태를 확인하지 못했어요. 연결 후 다시 확인해주세요.')
      } finally { setDiceMotion('idle'); lock.current = false; setBusy(false) }
    }
  }
  if (game.phase === 'READY') return <PigReadyView state={state} pending={pending} onStart={onStart} />
  if (game.phase === 'CANCELLED') return <div className="pigScreen"><CharacterStage compact /><h1>게임이 취소됐어요</h1><p className="sub">방장이 대기실에서 새 게임을 준비할 수 있어요.</p></div>
  if (game.phase === 'FINISHED') return <PigFinalView game={game} state={state} pending={pending} onReplay={onReplay} onOther={onOther} />
  const me = game.players.find(p => p.playerId === state.me.playerId)
  const percent = new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: 1 }).format(game.bustProbability)
  const tension = game.bustProbability >= .7 ? 'critical' : game.bustProbability >= .5 ? 'high' : game.bustProbability >= .3 ? 'medium' : 'low'
  const rolling = diceMotion !== 'idle' || remoteRoll !== null
  const displayedMotion = remoteRoll?.motion ?? diceMotion
  const awaitingFirstRoll = displayedMotion === 'idle' && game.successfulRollCount === 0
  const displayedDiceValue = awaitingFirstRoll ? null : remoteRoll?.value ?? game.lastDiceValue
  return <div className={`pigScreen pigPlaying pigTension-${tension}${rolling ? ' isRolling' : ''}${game.lastTurnOutcome === 'BUSTED' ? ' isBusted' : ''}${game.turnScore >= 10 ? ' isPotGrowing' : ''}`}>
    <section className="pigScoreboard" aria-label="플레이어별 누적 점수">
      <ul>{game.players.map(p => <li key={p.playerId} className={`${p.playerId === game.currentPlayerId ? `active${p.playerId === state.me.playerId ? ' myTurn' : ''}` : ''}${p.status === 'FINISHED' ? ' finished' : ''}`.trim()}>
        {p.playerId === game.currentPlayerId && <em className="pigTurnBadge">{p.playerId === state.me.playerId ? '내 차례' : '지금 차례'}</em>}
        {p.status === 'FINISHED' && <span className="pigRankStamp" data-rank={p.rank} role="img" aria-label={`${p.rank}위 확정`}>{p.rank}위</span>}
        <Avatar name={p.nickname} />
        <span className="pigPlayerName" title={p.nickname}>{p.nickname}</span>
        <strong>{p.totalScore}<small>점</small></strong>
      </li>)}</ul>
    </section>
    {me?.status === 'FINISHED' && <p className="pigSpectating">{me.rank}위 확정 · {me.totalScore}점 · 관전 중</p>}
    <section className={`pigArena${game.bustProbability >= .5 ? ' pigArenaDanger' : ''}`} aria-label="현재 턴">
      <span className="pigArenaGoal" aria-label={`목표 ${game.targetScore}점`}><small>목표 점수</small><b>{game.targetScore}</b></span>
      <img className="pigArenaCharacter" src={pigArenaCharacter} alt="" aria-hidden />
      {game.lastTurnOutcome === 'BUSTED' && <div key={rollEvent?.eventId ?? `${game.currentPlayerId}-${game.lostTurnScore}`} className="pigBustNotice" role="status"><strong>1</strong><span>이번 턴 점수 소멸</span></div>}
      <div className="pigArenaMain">
        <div className="pigDiceSide">
          <PigDice key={remoteRoll?.id ?? 'local'} value={displayedDiceValue} motion={displayedMotion} />
        </div>
        <div className="pigTurnSummary">
          <header className="pigTurnHeader"><span><small>이번 턴 누적 점수</small><strong>+{game.turnScore}</strong></span></header>
          <div className="pigRisk"><span>1이 나올 확률</span><strong>{percent}</strong></div>
        </div>
      </div>
    </section>
    <div className="pigActions" aria-busy={animating}>
      {game.allowedActions.includes('ROLL') && <Button className="pigRollButton" disabled={animating} onClick={() => void act('ROLL')}>{busy ? '확인 중…' : '던지기'}</Button>}
      {game.allowedActions.includes('STOP') && <Button className="secondary pigStopButton" disabled={animating} onClick={() => void act('STOP')}>멈추기</Button>}
      {game.allowedActions.length === 0 && <p className="pigWaiting">차례가 끝날 때까지 기다려주세요.</p>}
    </div>
    {error && <p role="alert" className="pigOutcome">{error}</p>}
  </div>
}
