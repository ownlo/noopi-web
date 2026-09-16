import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { GameCatalog, YutGameState, YutMode, YutTeamId } from '../../../api/types'
import { Button, Card } from '../../../components/ui'
import yutGroup from '../../../assets/characters/noopi-yut-group-transparent.png'
import yutMove from '../../../assets/characters/noopi-yut-move.png'
import yutTeam from '../../../assets/characters/noopi-yut-team-highfive.png'
import yutVictory from '../../../assets/characters/noopi-yut-victory.png'
import './yut-setup.css'

export { YutPlayingView } from './YutPlayingView'

const showTeamMode = import.meta.env.DEV

export function YutGameGuide({ game, onClose, onAction, actionLabel = '시작하기', showCloseButton = true, actionVariant = 'primary' }: { game: GameCatalog['games'][number]; onClose: () => void; onAction: () => void; actionLabel?: string; showCloseButton?: boolean; actionVariant?: 'primary' | 'secondary' }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return createPortal(<div className="dialogBackdrop gameGuideBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="gameGuideDialog yutGameGuideDialog" role="dialog" aria-modal="true" aria-labelledby="yut-guide-title" aria-describedby="yut-guide-summary"><header className="gameGuideHeader"><div><p>NOOPI GAME GUIDE</p><h2 id="yut-guide-title">{game.name}</h2></div>{showCloseButton && <button type="button" autoFocus onClick={onClose} aria-label="게임 방법 닫기">×</button>}</header><p className="gameGuideSummary" id="yut-guide-summary">윷을 던져 말을 움직여요. 내 말 4개를 가장 먼저 도착시키면 이겨요!</p><div className="gameGuideMeta"><span>👥 {game.minPlayers}–{game.maxPlayers}명</span><span>🏁 {showTeamMode ? '개인전 · 2:2 팀전' : '개인전'}</span></div><ol className="gameGuideSteps yutGuideSteps"><li><div className="yutGuideIcon">🎲</div><div><small>STEP 1</small><h3>윷을 던져요</h3><p>내 차례가 오면 윷을 던져요. 윷이나 모가 나오면 한 번 더!</p></div></li><li><div className="yutGuideIcon">🐾</div><div><small>STEP 2</small><h3>말을 움직여요</h3><p>나온 칸 수만큼 움직일 말을 골라요. 갈림길에서는 지름길도 갈 수 있어요.</p></div></li><li><div className="yutGuideIcon">🏆</div><div><small>STEP 3</small><h3>먼저 도착하면 승리!</h3><p>내 말끼리 업고 상대 말을 잡아보세요. 말 4개가 모두 도착하면 이겨요.</p></div></li></ol><div className="gameGuideTip yutGuideTip"><b>누피의 팁</b><span>말을 함께 업으면 빨리 갈 수 있지만, 잡히면 모두 출발점으로 돌아가니 조심하세요!</span></div><Button className={`gameGuideStart ${actionVariant === 'secondary' ? 'secondary' : ''}`} autoFocus={!showCloseButton} onClick={onAction}>{actionLabel}</Button></section></div>, document.body)
}

export function YutSetupView({ playerCount, pending, onCreate }: { playerCount: number; pending: boolean; onCreate: (mode: YutMode) => void }) {
  return <div className="yutSetup">
    <header className="yutSetupHeading"><h1 className="yutSetupTitle">윷놀이</h1></header>
    <div className="yutSetupScene" aria-hidden="true"><img src={yutGroup} alt="" /></div>
    <div className="yutSetupChoices">
      <button className="yutSetupChoice individual" type="button" disabled={pending || playerCount < 2 || playerCount > 4} onClick={() => onCreate('INDIVIDUAL')}><strong className="yutSetupChoiceTitle">개인전</strong><span className="yutSetupChoiceCaption">우정은 잠시 접어두고</span><img src={yutMove} alt="" /></button>
      {showTeamMode && <button className="yutSetupChoice teams" type="button" disabled={pending || playerCount !== 4} onClick={() => onCreate('TEAM')}><strong className="yutSetupChoiceTitle">2 vs 2 팀전</strong><span className="yutSetupChoiceCaption">내 편 하나면 든든하지</span><img src={yutTeam} alt="" /></button>}
    </div>
    {(pending || (showTeamMode && playerCount === 4)) && <p className="yutSetupHint" role="status">{pending ? '윷판을 준비하고 있어요…' : '팀전에서는 누피팀과 데이팀을 직접 고를 수 있어요.'}</p>}
  </div>
}

export function YutTeamSelectView({ state, host, pending, onTeam, onStart }: { state: Extract<YutGameState, { phase: 'TEAM_SELECT' }>; host: boolean; pending: boolean; onTeam: (team: YutTeamId) => void; onStart: () => void }) {
  return <div className="yutTeamSelect"><p className="eyebrow">2:2 팀전</p><h1>어느 팀으로 갈까요?</h1><div className="yutTeams">{state.teams.map(team => { const selectable = state.selectableTeams.includes(team.team); return <Card className={`yutTeamCard ${team.team.toLowerCase()} ${state.myTeam === team.team ? 'selected' : ''}`} key={team.team}><header><strong>{team.team === 'NOOPI' ? '🐈‍⬛' : '🔵'} {team.name}</strong><span>{team.players.length}/{team.capacity}</span></header><ul>{team.players.map(player => <li key={player.playerId}>{player.nickname}</li>)}</ul><Button className="secondary" disabled={pending || !selectable || state.myTeam === team.team} onClick={() => onTeam(team.team)}>{state.myTeam === team.team ? '선택한 팀' : selectable ? '선택하기' : '마감'}</Button></Card> })}</div>{host ? <Button disabled={pending || !state.canStart} onClick={onStart}>{state.canStart ? '팀전 시작' : '모두 팀을 선택해주세요'}</Button> : <p className="hint">팀이 모두 정해지면 방장이 시작할 수 있어요.</p>}</div>
}

export function YutFinalView({ state, host, pending, onReplay, onOther }: { state: Extract<YutGameState, { phase: 'FINISHED' }>; host: boolean; pending: boolean; onReplay: () => void; onOther: () => void }) {
  const winner = state.mode === 'TEAM' ? state.winnerTeam?.name : state.winnerPlayer?.nickname
  return <div className="centerState yutFinal"><img className="yutVictoryBackdrop" src={yutVictory} alt="" aria-hidden /><p className="eyebrow">게임 종료</p><h1>{winner} 승리!</h1>{host ? <div className="stack"><Button disabled={pending} onClick={onReplay}>같은 모드로 다시하기</Button><Button className="secondary" disabled={pending} onClick={onOther}>다른 게임 선택</Button></div> : <div className="waiting"><span className="dots">•••</span><p>방장이 다음 게임을 선택하고 있어요</p></div>}</div>
}
