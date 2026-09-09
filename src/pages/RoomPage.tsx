import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api, isMockMode } from '../api'
import type { LiarGameState } from '../api/types'
import { Brand, Button, Card, Page, PlayerGenderProvider } from '../components/ui'
import { RoomLobby } from '../features/room/RoomLobby'
import { DiscussionView, FinalView, GuessView, ReadyView, RevealView, RoleView, VoteResultView, VotingView } from '../features/games/liar/LiarViews'
import { MockScenarioPanel } from '../mocks/MockScenarioPanel'

export function RoomPage() {
  const { roomId: value } = useParams(); const roomId = Number(value); const navigate = useNavigate(); const queryClient = useQueryClient(); const [connected, setConnected] = useState(true); const [screen, setScreen] = useState<'LOBBY'|'GAMES'|'SETUP'>('LOBBY'); const [category, setCategory] = useState(''); const [notice, setNotice] = useState('')
  const stateQuery = useQuery({ queryKey: ['room-state', roomId], queryFn: () => api.getRoomState(roomId), enabled: Number.isFinite(roomId) })
  const games = useQuery({ queryKey: ['games'], queryFn: api.getGames, enabled: screen === 'GAMES' })
  const categories = useQuery({ queryKey: ['liar-categories'], queryFn: api.getCategories, enabled: screen === 'SETUP' })
  const sync = useCallback(() => queryClient.invalidateQueries({ queryKey: ['room-state', roomId] }), [queryClient, roomId])
  useEffect(() => api.subscribe(roomId, () => { void sync() }, isUp => { setConnected(isUp); if (isUp) void sync() }), [roomId, sync])
  const mutation = useMutation({ mutationFn: async (action: { type:string; payload?: number|string|'REPLAY'|'OTHER' }) => { const s=stateQuery.data; const session=s?.gameSession; switch(action.type) { case 'CREATE': return api.createGameSession(roomId, String(action.payload)); case 'START': return api.startGame(roomId, session!.gameSessionId); case 'ROLE': return api.confirmRole(roomId, session!.gameSessionId); case 'START_VOTE': return api.startVote(roomId, session!.gameSessionId); case 'VOTE': { const g=session!.gameState; if(g.phase!=='VOTING'&&g.phase!=='REVOTING') return; return api.submitVote(roomId, session!.gameSessionId, { voteRound:g.vote.round, targetPlayerId:Number(action.payload) }) } case 'GUESS': return api.submitGuess(roomId, session!.gameSessionId, String(action.payload)); case 'FINISH': return api.finishAndChoose(roomId, action.payload as 'REPLAY'|'OTHER') } }, onSuccess: (_data, action) => { setNotice(''); if(action.type==='CREATE') setScreen('LOBBY'); if(action.type==='FINISH') setScreen(action.payload==='OTHER'?'GAMES':'SETUP'); void sync() }, onError: () => { setNotice('지금은 이 행동을 할 수 없어요. 상태를 다시 확인했어요.'); void sync() } })
  if (stateQuery.isLoading) return <Page><div className="centerState"><div className="loader" /><p>게임 상태를 불러오는 중...</p></div></Page>
  if (!stateQuery.data || stateQuery.isError) return <Page><div className="centerState"><div className="gameIcon">🥲</div><h1>방을 찾을 수 없어요</h1><Button onClick={() => navigate('/')}>홈으로</Button></div></Page>
  const state=stateQuery.data; const game=state.gameSession?.gameState
  return <Page><header className="roomHeader"><Brand /></header>{!connected && <div className="network">연결이 불안정해요. 다시 연결하고 있습니다...</div>}{notice && <div className="toast" role="status">{notice}</div>}<PlayerGenderProvider players={state.players}><div className="content">{game ? <Game game={game} state={state} pending={mutation.isPending} act={(type,payload)=>mutation.mutate({type,payload})} /> : screen === 'GAMES' ? <GameSelect games={games.data?.games ?? []} onSelect={() => setScreen('SETUP')} /> : screen === 'SETUP' ? <Setup categories={categories.data?.categories ?? []} category={category} setCategory={setCategory} pending={mutation.isPending} onCreate={() => mutation.mutate({type:'CREATE',payload:category})} /> : <RoomLobby state={state} onSelect={() => setScreen('GAMES')} />}</div></PlayerGenderProvider>{isMockMode && <MockScenarioPanel roomId={roomId} />}</Page>
}

type State = Awaited<ReturnType<typeof api.getRoomState>>
function GameContent({ game, state, pending, act }: { game:LiarGameState; state:State; pending:boolean; act:(type:string,payload?:number|string|'REPLAY'|'OTHER')=>void }) {
  switch(game.phase) {
    case 'READY': return <ReadyView state={game} host={state.me.host} pending={pending} onStart={()=>act('START')} />
    case 'ROLE_REVEAL': return <RoleView state={game} players={state.players} pending={pending} onConfirm={()=>act('ROLE')} />
    case 'DISCUSSION': return <DiscussionView first={state.players.find(p=>p.playerId===game.firstSpeakerPlayerId)!} host={state.me.host} pending={pending} onVote={()=>act('START_VOTE')} />
    case 'VOTING': case 'REVOTING': return <VotingView key={game.vote.round} state={game} players={state.players} pending={pending} onSubmit={id=>act('VOTE',id)} />
    case 'VOTE_RESULT': return <VoteResultView state={game} />
    case 'LIAR_REVEAL': return <RevealView state={game} />
    case 'LIAR_GUESS': return <GuessView state={game} pending={pending} onGuess={answer=>act('GUESS',answer)} />
    case 'FINISHED': return <FinalView state={game} host={state.me.host} pending={pending} onAction={a=>act('FINISH',a)} />
    case 'CANCELLED': return <><div className="gameIcon">🫧</div><h1>게임이 취소됐어요</h1><p className="sub">Room은 그대로 유지됩니다.</p></>
  }
}

function Game(props: Parameters<typeof GameContent>[0]) { return <GameContent {...props} /> }
function GameSelect({ games, onSelect }: { games:{gameType:'LIAR';name:string;minPlayers:number;maxPlayers:number;enabled:boolean}[]; onSelect:()=>void }) { return <><p className="eyebrow">GAME SELECT</p><h1>무슨 게임을 할까요?</h1><p className="sub">오늘 분위기에 딱 맞는 게임을 골라보세요.</p>{games.map(game=><button className="gameChoice" key={game.gameType} onClick={onSelect}><span>😈</span><div><small>{game.minPlayers}–{game.maxPlayers}명</small><h2>{game.name}</h2><p>제시어를 숨긴 라이어를 찾아보세요</p></div><b>→</b></button>)}</> }
function Setup({ categories, category, setCategory, pending, onCreate }: { categories:{code:string;name:string;virtual:boolean}[];category:string;setCategory:(v:string)=>void;pending:boolean;onCreate:()=>void }) { return <><div className="gameIcon">😈</div><p className="eyebrow">라이어 게임</p><h1>카테고리를<br />골라주세요</h1><div className="categoryGrid">{categories.map(c=><button key={c.code} className={category===c.code?'selected':''} onClick={()=>setCategory(c.code)}><b>{c.name}</b>{category===c.code&&<i>✓</i>}</button>)}</div><Card className="rule"><span>👥 참가자 4명</span><span>😈 라이어 1명</span></Card><Button disabled={!category||pending} onClick={onCreate}>{pending?'준비 중...':'이 카테고리로 준비하기'}</Button></> }
