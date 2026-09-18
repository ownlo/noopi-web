import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { BlindGameState, GameCatalog, GameState, GameType, LiarGameState, MafiaGameState, MafiaJudgmentChoice, MafiaNightActionType, YutGameState, YutMode, YutTeamId, YutThrowResult } from '../api/types'
import { Brand, Button, Page, PlayerGenderProvider } from '../components/ui'
import { RoomLobby } from '../features/room/RoomLobby'
import { getGameUnavailableReason } from '../features/game-session/gameAvailability'
import { LiarGameGuide } from '../features/games/liar/LiarGameGuide'
import { DiscussionView, FinalView, GuessView, ReadyView, RevealView, RoleView, VoteResultView, VotingView } from '../features/games/liar/LiarViews'
import { BlindGameGuide } from '../features/games/blind/BlindGameGuide'
import { BlindFinalView, BlindGuessingView, BlindReadyView } from '../features/games/blind/BlindViews'
import { MafiaGameGuide } from '../features/games/mafia/MafiaGameGuide'
import { MafiaDayView, MafiaExecutionView, MafiaFinalView, MafiaInvestigationResultView, MafiaJudgmentResultView, MafiaJudgmentView, MafiaNightResultView, MafiaNightView, MafiaReadyView, MafiaRoleView, MafiaVoteResultView, MafiaVotingView } from '../features/games/mafia/MafiaViews'
import { YutFinalView, YutGameGuide, YutPlayingView, YutSetupView, YutTeamSelectView } from '../features/games/yut/YutViews'
import liarCharacter from '../assets/characters/noopi-liar-cat.png'
import liarGameChoiceCharacter from '../assets/characters/noopi-liar-cat-game-choice.png'
import blindGameChoiceCharacter from '../assets/characters/noopi-blind-game-choice.png'
import mafiaGameChoiceCharacter from '../assets/characters/noopi-mafia-cat-game-choice.png'
import yutThrowCharacter from '../assets/characters/noopi-yut-throw.png'

function isRoomNotFound(error: unknown): error is { code: 'ROOM_NOT_FOUND' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ROOM_NOT_FOUND'
}

export function RoomPage() {
  const { roomId: value } = useParams(); const roomId = Number(value); const navigate = useNavigate(); const queryClient = useQueryClient(); const allowNavigationRef = useRef(false); const [connected, setConnected] = useState(true); const [screen, setScreen] = useState<'LOBBY'|'GAMES'|'SETUP'|'YUT_SETUP'>('LOBBY'); const [category, setCategory] = useState(''); const [notice, setNotice] = useState(''); const [showLeaveConfirm, setShowLeaveConfirm] = useState(false); const [showLobbyConfirm, setShowLobbyConfirm] = useState(false)
  const stateQuery = useQuery({
    queryKey: ['room-state', roomId],
    queryFn: ({ signal }) => api.getRoomState(roomId, signal),
    enabled: Number.isFinite(roomId),
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
  const games = useQuery({ queryKey: ['games'], queryFn: api.getGames, enabled: screen === 'GAMES' || screen === 'SETUP' })
  const categories = useQuery({ queryKey: ['liar-categories'], queryFn: api.getCategories, enabled: screen === 'SETUP' })
  const gameInProgress = stateQuery.data?.gameSession?.status === 'PLAYING'
  const blocker = useBlocker(useCallback(() => gameInProgress && !allowNavigationRef.current, [gameInProgress]))
  useBeforeUnload(useCallback((event) => {
    if (!gameInProgress || allowNavigationRef.current) return
    event.preventDefault()
    event.returnValue = ''
  }, [gameInProgress]))
  const sync = useCallback(() => queryClient.invalidateQueries({ queryKey: ['room-state', roomId] }), [queryClient, roomId])
  const showReturnedLobby = useCallback(() => {
    setScreen('LOBBY')
    setCategory('')
    setShowLobbyConfirm(false)
    setNotice('방장이 모두를 대기실로 이동했어요.')
    queryClient.setQueryData<Awaited<ReturnType<typeof api.getRoomState>>>(['room-state', roomId], current => current ? {
      ...current,
      room: { ...current.room, status: 'WAITING' },
      players: current.players.map(player => ({ ...player, currentGameParticipant: false })),
      gameSession: null,
    } : current)
  }, [queryClient, roomId])
  useEffect(() => api.subscribe(roomId, event => {
    if (event.type === 'ROOM_CLOSED') {
      localStorage.removeItem('noopi.lastRoomId')
      allowNavigationRef.current = true
      navigate('/', { replace: true })
      return
    }
    if (event.type === 'ROOM_RETURNED_TO_LOBBY') {
      showReturnedLobby()
      void sync()
      return
    }
    void sync()
  }, isUp => { setConnected(isUp); if (isUp) void sync() }), [navigate, roomId, showReturnedLobby, sync])
  useEffect(() => {
    if (!isRoomNotFound(stateQuery.error)) return
    localStorage.removeItem('noopi.lastRoomId')
    allowNavigationRef.current = true
    navigate('/', { replace: true })
  }, [navigate, stateQuery.error])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2_800)
    return () => window.clearTimeout(timer)
  }, [notice])
  const cancelLeave = useCallback(() => {
    setShowLeaveConfirm(false)
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (blocker.state === 'blocked') setShowLeaveConfirm(true)
  }, [blocker.state])
  useEffect(() => {
    if (!showLeaveConfirm) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelLeave() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [cancelLeave, showLeaveConfirm])
  useEffect(() => {
    if (!showLobbyConfirm) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowLobbyConfirm(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showLobbyConfirm])
  type ActionPayload = number|string|{ gameType: GameType; categoryCode?: string; mode?: YutMode }|{ actionType: MafiaNightActionType; targetPlayerId?: number }
  const mutation = useMutation({ mutationFn: async (action: { type:string; payload?: ActionPayload }) => {
    const s=stateQuery.data; const session=s?.gameSession
    switch(action.type) {
      case 'CREATE': {
        const input = action.payload as { gameType: GameType; categoryCode?: string; mode?: YutMode }
        const selectedGame = games.data?.games.find(game => game.gameType === input.gameType)
        if (!s?.me.host || !selectedGame || getGameUnavailableReason(selectedGame, s.players.length)) throw new Error('Game unavailable')
        const config = input.gameType === 'LIAR' ? { categoryCode: input.categoryCode ?? '' } : input.gameType === 'YUT' ? { mode: input.mode } : {}
        const created = await api.createGameSession(roomId, input.gameType, config)
        return created
      }
      case 'START': return api.startGame(roomId, session!.gameSessionId)
      case 'ROLE': return api.confirmRole(roomId, session!.gameSessionId)
      case 'START_VOTE': return api.startVote(roomId, session!.gameSessionId)
      case 'VOTE': { const g=session!.gameState; if(g.type !== 'LIAR' || (g.phase!=='VOTING'&&g.phase!=='REVOTING')) return; return api.submitVote(roomId, session!.gameSessionId, { voteRound:g.vote.round, targetPlayerId:Number(action.payload) }) }
      case 'GUESS': return api.submitGuess(roomId, session!.gameSessionId, String(action.payload))
      case 'BLIND_GUESS': return api.submitBlindGuess(roomId, session!.gameSessionId, String(action.payload))
      case 'MAFIA_ROLE': return api.confirmMafiaRole(roomId, session!.gameSessionId)
      case 'MAFIA_NIGHT': return api.submitMafiaNightAction(roomId, session!.gameSessionId, action.payload as { actionType: MafiaNightActionType; targetPlayerId?: number })
      case 'MAFIA_START_VOTE': return api.startMafiaVote(roomId, session!.gameSessionId)
      case 'MAFIA_VOTE': { const g=session!.gameState; if(g.type !== 'MAFIA' || (g.phase!=='VOTING'&&g.phase!=='REVOTING')) return; return api.submitMafiaVote(roomId, session!.gameSessionId, { voteRound:g.vote.round, targetPlayerId:Number(action.payload) }) }
      case 'MAFIA_JUDGMENT': return api.submitMafiaJudgment(roomId, session!.gameSessionId, action.payload as MafiaJudgmentChoice)
      case 'MAFIA_ADVANCE': return api.advanceMafia(roomId, session!.gameSessionId)
      case 'YUT_TEAM': return api.selectYutTeam(roomId, session!.gameSessionId, action.payload as YutTeamId)
      case 'YUT_THROW': {
        const game = session!.gameState
        const existingMoveTokens = game.type === 'YUT' && game.phase === 'PLAYING' ? game.turn.moveTokens : []
        const result = await api.throwYut(roomId, session!.gameSessionId)
        const onlyMoveTokenId = result.result === 'NAK' && existingMoveTokens.length === 1
          ? existingMoveTokens[0].moveTokenId
          : result.moveTokenId && !result.bonusThrowGranted && existingMoveTokens.length === 0
            ? result.moveTokenId
            : null
        if (onlyMoveTokenId) await api.selectYutMoveToken(roomId, session!.gameSessionId, onlyMoveTokenId)
        return result
      }
      case 'YUT_TOKEN': return api.selectYutMoveToken(roomId, session!.gameSessionId, String(action.payload))
      case 'YUT_PIECE': return api.selectYutPiece(roomId, session!.gameSessionId, String(action.payload))
      case 'YUT_PATH': return api.selectYutPath(roomId, session!.gameSessionId, String(action.payload))
    }
  }, onSuccess: (_data, action) => { setNotice(''); if(action.type==='CREATE') setScreen('LOBBY'); void sync() }, onError: () => { setNotice('지금은 이 행동을 할 수 없어요. 상태를 다시 확인했어요.'); void sync() } })
  const leaveMutation = useMutation({ mutationFn: () => api.leaveRoom(roomId), onSuccess: () => { localStorage.removeItem('noopi.lastRoomId'); setShowLeaveConfirm(false); if (blocker.state === 'blocked') blocker.proceed(); else { allowNavigationRef.current = true; navigate('/', { replace: true }) } }, onError: () => { cancelLeave(); setNotice('방을 나가지 못했어요. 잠시 후 다시 시도해주세요.') } })
  const lobbyMutation = useMutation({ mutationFn: () => api.returnToLobby(roomId), onSuccess: () => { showReturnedLobby(); void sync() }, onError: () => { setShowLobbyConfirm(false); setNotice('대기실로 이동하지 못했어요. 잠시 후 다시 시도해주세요.'); void sync() } })
  if (stateQuery.isLoading) return <Page><div className="centerState"><div className="loader" /><p>게임 상태를 불러오는 중...</p></div></Page>
  if (!stateQuery.data || stateQuery.isError) return <Page><div className="centerState"><div className="gameIcon">🥲</div><h1>방을 찾을 수 없어요</h1><Button onClick={() => navigate('/')}>홈으로</Button></div></Page>
  const state=stateQuery.data; const game=state.gameSession?.gameState
  const selectedGame = games.data?.games.find(game => game.gameType === 'LIAR')
  const setupUnavailableReason = selectedGame ? getGameUnavailableReason(selectedGame, state.players.length) : '게임 정보를 확인하고 있어요.'
  const choosingNextGame = game?.phase === 'FINISHED' && state.me.host && screen !== 'LOBBY'
  const requestLeave = () => {
    setShowLeaveConfirm(true)
  }
  const confirmLeave = () => {
    leaveMutation.mutate()
  }
  const act = async (type: string, payload?: ActionPayload|'REPLAY'|'OTHER') => {
    if (type === 'FINISH') {
      setNotice('')
      setCategory('')
      setScreen(payload === 'OTHER' ? 'GAMES' : 'SETUP')
      return undefined
    }
    try {
      return await mutation.mutateAsync({ type, payload: payload as ActionPayload|undefined })
    } catch {
      return undefined
    }
  }
  return <Page><header className="roomHeader"><Brand /><div className="roomHeaderActions">{state.me.host && <LobbyButton pending={lobbyMutation.isPending} onClick={() => setShowLobbyConfirm(true)} />}<LeaveRoomButton pending={leaveMutation.isPending} onClick={requestLeave} /></div></header>{!connected && <div className="network">연결이 불안정해요. 다시 연결하고 있습니다...</div>}{notice && screen !== 'GAMES' && <div className="toast" role="status">{notice}</div>}{notice && screen === 'GAMES' && <div className="gameNotice" role="status">{notice}</div>}<PlayerGenderProvider players={state.players}><div className="content">{game && !choosingNextGame ? <Game key={state.gameSession?.gameSessionId} game={game} state={state} pending={mutation.isPending} act={act} /> : screen === 'GAMES' && state.me.host ? <GameSelect games={games.data?.games ?? []} onSelect={selected => { const reason = getGameUnavailableReason(selected, state.players.length); setNotice(reason ?? ''); if (reason) return; if (selected.gameType === 'LIAR') setScreen('SETUP'); else if (selected.gameType === 'YUT') setScreen('YUT_SETUP'); else mutation.mutate({ type: 'CREATE', payload: { gameType: selected.gameType } }) }} /> : screen === 'SETUP' && state.me.host ? <Setup unavailableReason={setupUnavailableReason} categories={categories.data?.categories ?? []} category={category} setCategory={setCategory} pending={mutation.isPending} onCreate={() => mutation.mutate({type:'CREATE',payload:{ gameType: 'LIAR', categoryCode: category }})} /> : screen === 'YUT_SETUP' && state.me.host ? <YutSetupView playerCount={state.players.length} pending={mutation.isPending} onCreate={mode => mutation.mutate({ type: 'CREATE', payload: { gameType: 'YUT', mode } })} /> : <RoomLobby state={state} onSelect={() => setScreen('GAMES')} />}</div></PlayerGenderProvider>{showLobbyConfirm && <LobbyConfirm pending={lobbyMutation.isPending} onCancel={() => setShowLobbyConfirm(false)} onConfirm={() => lobbyMutation.mutate()} />}{showLeaveConfirm && <LeaveConfirm host={state.me.host} pending={leaveMutation.isPending} onCancel={cancelLeave} onConfirm={confirmLeave} />}</Page>
}

function LobbyButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <button type="button" className="leaveRoomButton" onClick={onClick} disabled={pending} aria-label="모두 대기실로 이동" title="모두 대기실로 이동"><svg aria-hidden viewBox="0 0 24 24"><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" /></svg></button>
}

function LeaveRoomButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <button type="button" className={`leaveRoomButton ${pending ? 'pending' : ''}`} onClick={onClick} disabled={pending} aria-label={pending ? '방에서 나가는 중' : '방 나가기'} title="방 나가기"><svg aria-hidden viewBox="0 0 24 24"><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3M10 12h11m-3-3 3 3-3 3" /></svg></button>
}

function LeaveConfirm({ host, pending, onCancel, onConfirm }: { host: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialogBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}><section className="leaveDialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-dialog-title" aria-describedby="leave-dialog-description"><h2 id="leave-dialog-title">{host ? '방을 종료할까요?' : '방에서 나갈까요?'}</h2><p id="leave-dialog-description">{host ? <>방장이 나가면 이 방은 사라지고<br />모든 참가자가 홈으로 이동해요.</> : <>나가면 홈 화면으로 이동해요.</>}</p><div className="leaveDialogActions"><Button className="secondary" autoFocus disabled={pending} onClick={onCancel}>취소</Button><Button className="danger" disabled={pending} onClick={onConfirm}>{pending ? '나가는 중...' : '나가기'}</Button></div></section></div>
}

function LobbyConfirm({ pending, onCancel, onConfirm }: { pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialogBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) onCancel() }}><section className="leaveDialog" role="alertdialog" aria-modal="true" aria-labelledby="lobby-dialog-title" aria-describedby="lobby-dialog-description"><h2 id="lobby-dialog-title">모두 대기실로 이동할까요?</h2><p id="lobby-dialog-description">진행 중인 게임은 종료되고<br />모든 참가자가 대기실로 이동해요.</p><div className="leaveDialogActions"><Button className="secondary" autoFocus disabled={pending} onClick={onCancel}>취소</Button><Button disabled={pending} onClick={onConfirm}>{pending ? '이동 중...' : '확인'}</Button></div></section></div>
}

type State = Awaited<ReturnType<typeof api.getRoomState>>
function LiarGameContent({ game, state, pending, act }: { game:LiarGameState; state:State; pending:boolean; act:(type:string,payload?:number|string|'REPLAY'|'OTHER')=>void }) {
  switch(game.phase) {
    case 'READY': return <ReadyView state={game} host={state.me.host} pending={pending} onStart={()=>act('START')} />
    case 'ROLE_REVEAL': return <RoleView state={game} players={state.players} pending={pending} onConfirm={()=>act('ROLE')} />
    case 'DISCUSSION': return <DiscussionView state={game} players={state.players} currentPlayerId={state.me.playerId} host={state.me.host} pending={pending} onVote={()=>act('START_VOTE')} />
    case 'VOTING': case 'REVOTING': return <VotingView key={game.vote.round} state={game} players={state.players} pending={pending} onSubmit={id=>act('VOTE',id)} />
    case 'VOTE_RESULT': return <VoteResultView state={game} />
    case 'LIAR_REVEAL': return <RevealView state={game} />
    case 'LIAR_GUESS': return <GuessView state={game} pending={pending} onGuess={answer=>act('GUESS',answer)} />
    case 'FINISHED': return <FinalView state={game} host={state.me.host} pending={pending} onAction={a=>act('FINISH',a)} />
    case 'CANCELLED': return <><div className="gameIcon">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">Room은 그대로 유지됩니다.</p></>
  }
}

function BlindGameContent({ game, state, pending, act }: { game:BlindGameState; state:State; pending:boolean; act:(type:string,payload?:number|string|'REPLAY'|'OTHER'|{ gameType: GameType })=>Promise<unknown> }) {
  switch (game.phase) {
    case 'READY': return <BlindReadyView host={state.me.host} pending={pending} onStart={() => act('START')} />
    case 'GUESSING': return <BlindGuessingView state={game} meGender={state.me.gender} opponentGender={state.players.find(player => player.playerId === game.opponentPlayer.playerId)?.gender ?? 'MALE'} pending={pending} onGuess={async answer => { try { const result = await act('BLIND_GUESS', answer); return typeof result === 'object' && result !== null && 'correct' in result && result.correct === true } catch { return false } }} />
    case 'FINISHED': return <BlindFinalView state={game} meId={state.me.playerId} meGender={state.me.gender} host={state.me.host} pending={pending} onAction={action => { if (action === 'REPLAY') void act('CREATE', { gameType: 'BLIND' }); else void act('FINISH', 'OTHER') }} />
    case 'CANCELLED': return <><div className="gameIcon">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">Room은 그대로 유지됩니다.</p></>
  }
}

function MafiaGameContent({ game, state, pending, act }: { game:MafiaGameState; state:State; pending:boolean; act:(type:string,payload?:number|string|'REPLAY'|'OTHER'|{ gameType: GameType }|{ actionType: MafiaNightActionType; targetPlayerId?: number })=>Promise<unknown> }) {
  const [investigationResult, setInvestigationResult] = useState<{ targetNickname: string; mafia: boolean }>()

  if (investigationResult) return <MafiaInvestigationResultView targetNickname={investigationResult.targetNickname} mafia={investigationResult.mafia} onConfirm={() => setInvestigationResult(undefined)} />

  switch (game.phase) {
    case 'READY': return <MafiaReadyView state={game} host={state.me.host} pending={pending} onStart={() => void act('START')} />
    case 'ROLE_REVEAL': return <MafiaRoleView state={game} pending={pending} onConfirm={() => void act('MAFIA_ROLE')} />
    case 'FIRST_NIGHT': case 'NIGHT': return <MafiaNightView state={game} pending={pending} onAction={async input => { const targetNickname = game.nightAction?.eligibleTargets?.find(target => target.playerId === input.targetPlayerId)?.nickname ?? '선택한 플레이어'; const result = await act('MAFIA_NIGHT', input); const response = typeof result === 'object' && result !== null ? result as { result?: { targetPlayerId: number; mafia: boolean } } : undefined; if (response?.result) setInvestigationResult({ targetNickname, mafia: response.result.mafia }); return response }} />
    case 'DAY': return <MafiaDayView state={game} host={state.me.host} pending={pending} onVote={() => void act('MAFIA_START_VOTE')} />
    case 'VOTING': case 'REVOTING': return <MafiaVotingView key={game.vote.round} state={game} pending={pending} onSubmit={id => void act('MAFIA_VOTE', id)} />
    case 'VOTE_RESULT': return <MafiaVoteResultView state={game} pending={pending} onAdvance={() => void act('MAFIA_ADVANCE')} />
    case 'JUDGMENT': return <MafiaJudgmentView state={game} pending={pending} onSubmit={choice => void act('MAFIA_JUDGMENT', choice)} />
    case 'JUDGMENT_RESULT': return <MafiaJudgmentResultView state={game} pending={pending} onAdvance={() => void act('MAFIA_ADVANCE')} />
    case 'EXECUTION': return <MafiaExecutionView state={game} pending={pending} onAdvance={() => void act('MAFIA_ADVANCE')} />
    case 'NIGHT_RESULT': return <MafiaNightResultView state={game} pending={pending} onAdvance={() => void act('MAFIA_ADVANCE')} />
    case 'FINISHED': return <MafiaFinalView state={game} host={state.me.host} pending={pending} onAction={action => { if (action === 'REPLAY') void act('CREATE', { gameType: 'MAFIA' }); else void act('FINISH', 'OTHER') }} />
    case 'CANCELLED': return <><div className="gameIcon">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">Room은 그대로 유지됩니다.</p></>
  }
}

function YutGameContent({ game, state, pending, act }: { game:YutGameState; state:State; pending:boolean; act:(type:string,payload?:number|string|'REPLAY'|'OTHER'|{ gameType: GameType; mode?: YutMode })=>Promise<unknown> }) {
  switch (game.phase) {
    case 'READY': return <YutStartingView host={state.me.host} pending={pending} onStart={() => void act('START')} />
    case 'TEAM_SELECT': return <YutTeamSelectView state={game} players={state.players} host={state.me.host} pending={pending} onTeam={team => void act('YUT_TEAM', team)} onStart={() => void act('START')} />
    case 'PLAYING': return <YutPlayingView state={game} players={state.players} myPlayerId={state.me.playerId} pending={pending} onThrow={async () => {
      const result = await act('YUT_THROW')
      return result && typeof result === 'object' && 'result' in result ? result as YutThrowResult : undefined
    }} onToken={id => void act('YUT_TOKEN', id)} onPiece={id => void act('YUT_PIECE', id)} onPath={id => void act('YUT_PATH', id)} />
    case 'FINISHED': return <YutFinalView state={game} host={state.me.host} pending={pending} onReplay={() => void act('CREATE', { gameType: 'YUT', mode: game.mode })} onOther={() => void act('FINISH', 'OTHER')} />
    case 'CANCELLED': return <><div className="gameIcon">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">Room은 그대로 유지됩니다.</p></>
  }
}

function YutStartingView({ host, pending, onStart }: { host: boolean; pending: boolean; onStart: () => void }) {
  const requested = useRef(false)
  useEffect(() => {
    if (!host || pending || requested.current) return
    requested.current = true
    onStart()
  }, [host, onStart, pending])
  return <div className="centerState" role="status"><div className="loader" /><p>{host ? '윷놀이를 시작하고 있어요…' : '방장이 윷놀이를 시작하고 있어요…'}</p></div>
}

function Game({ game, state, pending, act }: { game: GameState; state: State; pending: boolean; act: (type:string,payload?:number|string|'REPLAY'|'OTHER'|{ gameType: GameType; mode?: YutMode }|{ actionType: MafiaNightActionType; targetPlayerId?: number })=>Promise<unknown> }) {
  if (game.type === 'LIAR') return <LiarGameContent game={game} state={state} pending={pending} act={act} />
  if (game.type === 'BLIND') return <BlindGameContent game={game} state={state} pending={pending} act={act} />
  if (game.type === 'MAFIA') return <MafiaGameContent game={game} state={state} pending={pending} act={act} />
  return <YutGameContent game={game} state={state} pending={pending} act={act} />
}
function GameSelect({ games, onSelect }: { games: GameCatalog['games']; onSelect: (game: GameCatalog['games'][number]) => void }) {
  const [guideGame, setGuideGame] = useState<GameCatalog['games'][number] | null>(null)
  useEffect(() => {
    if (!guideGame) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setGuideGame(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [guideGame])

  return <>
    <h1>무슨 게임을 할까요?</h1>
    <p className="sub">오늘 분위기에 딱 맞는 게임을 골라보세요.</p>
    {games.filter(game => game.enabled).map(game => <article className="gameChoice" key={game.gameType}>
      <button className="gameChoiceHitArea" type="button" onClick={() => setGuideGame(game)} aria-label={`${game.name} 자세히 보기`} />
      <span className="gameChoiceCharacter" aria-hidden><img src={game.gameType === 'BLIND' ? blindGameChoiceCharacter : game.gameType === 'MAFIA' ? mafiaGameChoiceCharacter : game.gameType === 'YUT' ? yutThrowCharacter : liarGameChoiceCharacter} alt="" /></span>
      <span className="gameChoiceCopy" aria-hidden><small>{game.minPlayers === game.maxPlayers ? `${game.minPlayers}명 전용` : `${game.minPlayers}–${game.maxPlayers}명`}</small><strong>{game.name}</strong><span>{game.gameType === 'BLIND' ? '질문하면서 내 제시어를 먼저 맞춰보세요' : game.gameType === 'MAFIA' ? '밤의 단서를 모아 마피아를 찾아보세요' : game.gameType === 'YUT' ? '윷을 던지고 말을 먼저 완주해보세요' : '제시어를 숨긴 라이어를 찾아보세요'}</span></span>
    </article>)}
    {guideGame && (guideGame.gameType === 'LIAR' ? <LiarGameGuide game={guideGame} actionLabel="시작하기" onClose={() => setGuideGame(null)} onAction={() => { onSelect(guideGame); setGuideGame(null) }} /> : guideGame.gameType === 'BLIND' ? <BlindGameGuide game={guideGame} actionLabel="시작하기" onClose={() => setGuideGame(null)} onAction={() => { onSelect(guideGame); setGuideGame(null) }} /> : guideGame.gameType === 'MAFIA' ? <MafiaGameGuide game={guideGame} onClose={() => setGuideGame(null)} onAction={() => { onSelect(guideGame); setGuideGame(null) }} /> : <YutGameGuide game={guideGame} onClose={() => setGuideGame(null)} onAction={() => { onSelect(guideGame); setGuideGame(null) }} />)}
  </>
}
function Setup({ unavailableReason, categories, category, setCategory, pending, onCreate }: { unavailableReason:string|null;categories:{code:string;name:string;virtual:boolean}[];category:string;setCategory:(v:string)=>void;pending:boolean;onCreate:()=>void }) { return <div className="setupScreen"><div className="liarCharacter setupBackdrop" aria-hidden><img src={liarCharacter} alt="" /></div><div className="gameIntro setupIntro"><p className="eyebrow">라이어 게임</p><h1>카테고리를<br />골라주세요</h1></div><div className="categoryGrid">{categories.map(c=><button key={c.code} className={category===c.code?'selected':''} onClick={()=>setCategory(c.code)}><b>{c.name}</b>{category===c.code&&<i>✓</i>}</button>)}</div><p className="hint" role="status">{unavailableReason}</p><Button disabled={!category||pending||unavailableReason !== null} onClick={onCreate}>{pending?'준비 중...':'이 카테고리로 준비하기'}</Button></div> }
