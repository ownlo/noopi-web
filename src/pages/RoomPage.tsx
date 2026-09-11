import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { GameCatalog, LiarGameState } from '../api/types'
import { Brand, Button, Page, PlayerGenderProvider } from '../components/ui'
import { RoomLobby } from '../features/room/RoomLobby'
import { getGameUnavailableReason } from '../features/game-session/gameAvailability'
import { LiarGameGuide } from '../features/games/liar/LiarGameGuide'
import { DiscussionView, FinalView, GuessView, ReadyView, RevealView, RoleView, VoteResultView, VotingView } from '../features/games/liar/LiarViews'
import liarCharacter from '../assets/characters/noopi-liar-cat.png'
import liarGameChoiceCharacter from '../assets/characters/noopi-liar-cat-game-choice.png'

function isRoomNotFound(error: unknown): error is { code: 'ROOM_NOT_FOUND' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ROOM_NOT_FOUND'
}

export function RoomPage() {
  const { roomId: value } = useParams(); const roomId = Number(value); const navigate = useNavigate(); const queryClient = useQueryClient(); const [connected, setConnected] = useState(true); const [screen, setScreen] = useState<'LOBBY'|'GAMES'|'SETUP'>('LOBBY'); const [category, setCategory] = useState(''); const [notice, setNotice] = useState(''); const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
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
  const sync = useCallback(() => queryClient.invalidateQueries({ queryKey: ['room-state', roomId] }), [queryClient, roomId])
  useEffect(() => api.subscribe(roomId, event => {
    if (event.type === 'ROOM_CLOSED') {
      localStorage.removeItem('noopi.lastRoomId')
      navigate('/', { replace: true })
      return
    }
    void sync()
  }, isUp => { setConnected(isUp); if (isUp) void sync() }), [navigate, roomId, sync])
  useEffect(() => {
    if (!isRoomNotFound(stateQuery.error)) return
    localStorage.removeItem('noopi.lastRoomId')
    navigate('/', { replace: true })
  }, [navigate, stateQuery.error])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2_800)
    return () => window.clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    if (!showLeaveConfirm) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowLeaveConfirm(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showLeaveConfirm])
  const mutation = useMutation({ mutationFn: async (action: { type:string; payload?: number|string }) => { const s=stateQuery.data; const session=s?.gameSession; switch(action.type) { case 'CREATE': { const selectedGame = games.data?.games.find(game => game.gameType === 'LIAR'); if (!s?.me.host || !selectedGame || getGameUnavailableReason(selectedGame, s.players.length)) throw new Error('Game unavailable'); return api.createGameSession(roomId, String(action.payload)) } case 'START': return api.startGame(roomId, session!.gameSessionId); case 'ROLE': return api.confirmRole(roomId, session!.gameSessionId); case 'START_VOTE': return api.startVote(roomId, session!.gameSessionId); case 'VOTE': { const g=session!.gameState; if(g.phase!=='VOTING'&&g.phase!=='REVOTING') return; return api.submitVote(roomId, session!.gameSessionId, { voteRound:g.vote.round, targetPlayerId:Number(action.payload) }) } case 'GUESS': return api.submitGuess(roomId, session!.gameSessionId, String(action.payload)) } }, onSuccess: (_data, action) => { setNotice(''); if(action.type==='CREATE') setScreen('LOBBY'); void sync() }, onError: () => { setNotice('지금은 이 행동을 할 수 없어요. 상태를 다시 확인했어요.'); void sync() } })
  const leaveMutation = useMutation({ mutationFn: () => api.leaveRoom(roomId), onSuccess: () => { localStorage.removeItem('noopi.lastRoomId'); navigate('/', { replace: true }) }, onError: () => setNotice('방을 나가지 못했어요. 잠시 후 다시 시도해주세요.') })
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
    setShowLeaveConfirm(false)
    leaveMutation.mutate()
  }
  const act = (type: string, payload?: number|string|'REPLAY'|'OTHER') => {
    if (type === 'FINISH') {
      setNotice('')
      setCategory('')
      setScreen(payload === 'OTHER' ? 'GAMES' : 'SETUP')
      return
    }
    mutation.mutate({ type, payload: payload as number|string|undefined })
  }
  return <Page><header className="roomHeader"><Brand /><LeaveRoomButton pending={leaveMutation.isPending} onClick={requestLeave} /></header>{!connected && <div className="network">연결이 불안정해요. 다시 연결하고 있습니다...</div>}{notice && screen !== 'GAMES' && <div className="toast" role="status">{notice}</div>}{notice && screen === 'GAMES' && <div className="gameNotice" role="status">{notice}</div>}<PlayerGenderProvider players={state.players}><div className="content">{game && !choosingNextGame ? <Game key={state.gameSession?.gameSessionId} game={game} state={state} pending={mutation.isPending} act={act} /> : screen === 'GAMES' && state.me.host ? <GameSelect games={games.data?.games ?? []} onSelect={selected => { const reason = getGameUnavailableReason(selected, state.players.length); setNotice(reason ?? ''); if (!reason) setScreen('SETUP') }} /> : screen === 'SETUP' && state.me.host ? <Setup unavailableReason={setupUnavailableReason} categories={categories.data?.categories ?? []} category={category} setCategory={setCategory} pending={mutation.isPending} onCreate={() => mutation.mutate({type:'CREATE',payload:category})} /> : <RoomLobby state={state} onSelect={() => setScreen('GAMES')} />}</div></PlayerGenderProvider>{showLeaveConfirm && <LeaveConfirm host={state.me.host} pending={leaveMutation.isPending} onCancel={() => setShowLeaveConfirm(false)} onConfirm={confirmLeave} />}</Page>
}

function LeaveRoomButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <button type="button" className={`leaveRoomButton ${pending ? 'pending' : ''}`} onClick={onClick} disabled={pending} aria-label={pending ? '방에서 나가는 중' : '방 나가기'} title="방 나가기"><svg aria-hidden viewBox="0 0 24 24"><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3M10 12h11m-3-3 3 3-3 3" /></svg></button>
}

function LeaveConfirm({ host, pending, onCancel, onConfirm }: { host: boolean; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialogBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}><section className="leaveDialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-dialog-title" aria-describedby="leave-dialog-description"><h2 id="leave-dialog-title">{host ? '방을 종료할까요?' : '방에서 나갈까요?'}</h2><p id="leave-dialog-description">{host ? <>방장이 나가면 이 방은 사라지고<br />모든 참가자가 홈으로 이동해요.</> : <>나가면 홈 화면으로 이동해요.</>}</p><div className="leaveDialogActions"><Button className="secondary" autoFocus disabled={pending} onClick={onCancel}>취소</Button><Button className="danger" disabled={pending} onClick={onConfirm}>{pending ? '나가는 중...' : '나가기'}</Button></div></section></div>
}

type State = Awaited<ReturnType<typeof api.getRoomState>>
function GameContent({ game, state, pending, act }: { game:LiarGameState; state:State; pending:boolean; act:(type:string,payload?:number|string|'REPLAY'|'OTHER')=>void }) {
  switch(game.phase) {
    case 'READY': return <ReadyView state={game} host={state.me.host} pending={pending} onStart={()=>act('START')} />
    case 'ROLE_REVEAL': return <RoleView state={game} players={state.players} pending={pending} onConfirm={()=>act('ROLE')} />
    case 'DISCUSSION': return <DiscussionView state={game} first={state.players.find(p=>p.playerId===game.firstSpeakerPlayerId)!} host={state.me.host} pending={pending} onVote={()=>act('START_VOTE')} />
    case 'VOTING': case 'REVOTING': return <VotingView key={game.vote.round} state={game} players={state.players} pending={pending} onSubmit={id=>act('VOTE',id)} />
    case 'VOTE_RESULT': return <VoteResultView state={game} />
    case 'LIAR_REVEAL': return <RevealView state={game} />
    case 'LIAR_GUESS': return <GuessView state={game} pending={pending} onGuess={answer=>act('GUESS',answer)} />
    case 'FINISHED': return <FinalView state={game} host={state.me.host} pending={pending} onAction={a=>act('FINISH',a)} />
    case 'CANCELLED': return <><div className="gameIcon">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">Room은 그대로 유지됩니다.</p></>
  }
}

function Game(props: Parameters<typeof GameContent>[0]) { return <GameContent {...props} /> }
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
      <span className="gameChoiceCharacter" aria-hidden><img src={liarGameChoiceCharacter} alt="" /></span>
      <span className="gameChoiceCopy" aria-hidden><small>{game.minPlayers}–{game.maxPlayers}명</small><strong>{game.name}</strong><span>제시어를 숨긴 라이어를 찾아보세요</span></span>
    </article>)}
    {guideGame && <LiarGameGuide game={guideGame} actionLabel="시작하기" onClose={() => setGuideGame(null)} onAction={() => { onSelect(guideGame); setGuideGame(null) }} />}
  </>
}
function Setup({ unavailableReason, categories, category, setCategory, pending, onCreate }: { unavailableReason:string|null;categories:{code:string;name:string;virtual:boolean}[];category:string;setCategory:(v:string)=>void;pending:boolean;onCreate:()=>void }) { return <div className="setupScreen"><div className="liarCharacter setupBackdrop" aria-hidden><img src={liarCharacter} alt="" /></div><div className="gameIntro setupIntro"><p className="eyebrow">라이어 게임</p><h1>카테고리를<br />골라주세요</h1></div><div className="categoryGrid">{categories.map(c=><button key={c.code} className={category===c.code?'selected':''} onClick={()=>setCategory(c.code)}><b>{c.name}</b>{category===c.code&&<i>✓</i>}</button>)}</div><p className="hint" role="status">{unavailableReason}</p><Button disabled={!category||pending||unavailableReason !== null} onClick={onCreate}>{pending?'준비 중...':'이 카테고리로 준비하기'}</Button></div> }
