import { useState } from 'react'
import type { Investigation, MafiaGameState, MafiaNightActionType, MafiaRole } from '../../../api/types'
import { Avatar, Button, Card, Progress, SpinnerText } from '../../../components/ui'
import mafiaNightReady from '../../../assets/characters/noopi-mafia-night-ready.png'
import mafiaNightAttack from '../../../assets/characters/noopi-mafia-night-attack.png'
import citizenSuspicion from '../../../assets/characters/noopi-mafia-citizen-suspicion-v2.png'
import roleDiscussion from '../../../assets/characters/noopi-mafia-role-discussion-day-v2.png'
import citizenNightResult from '../../../assets/characters/noopi-mafia-night-result-citizen.png'
import cityNightResult from '../../../assets/characters/noopi-mafia-night-result-city.png'
import mafiaNightResult from '../../../assets/characters/noopi-mafia-night-result-mafia.png'
import citizenRoleIcon from '../../../assets/characters/noopi-mafia-role-citizen.png'
import doctorRoleIcon from '../../../assets/characters/noopi-mafia-role-doctor.png'
import mafiaRoleIcon from '../../../assets/characters/noopi-mafia-role-mafia.png'
import policeRoleIcon from '../../../assets/characters/noopi-mafia-role-police.png'

const roleLabel: Record<MafiaRole, string> = { MAFIA: '마피아', POLICE: '경찰', DOCTOR: '의사', CITIZEN: '시민' }
const roleIcon: Record<MafiaRole, string> = { MAFIA: mafiaRoleIcon, POLICE: policeRoleIcon, DOCTOR: doctorRoleIcon, CITIZEN: citizenRoleIcon }
function RoleIcon({ role, large = false }: { role: MafiaRole; large?: boolean }) {
  return <span className={`mafiaRoleAvatar${large ? ' large' : ''}`} aria-hidden><img src={roleIcon[role]} alt="" /></span>
}
type MafiaTeammate = { playerId: number; nickname: string }
function RoleRecall({ role, teammates, investigationHistory }: { role: MafiaRole; teammates?: MafiaTeammate[]; investigationHistory?: Investigation[] }) {
  const [visible, setVisible] = useState(false)
  return <div className="mafiaRoleRecall"><Button className="secondary" onClick={() => setVisible(current => !current)} aria-expanded={visible}>{visible ? '🔒 내 역할 다시 가리기' : '🔒 내 역할 다시 보기'}</Button>{visible && <Card className="mafiaRoleSecret"><small>내 역할</small><RoleIcon role={role} large /><h2>{roleLabel[role]}</h2>{role === 'MAFIA' && (teammates?.length ? teammates.map(player => <p key={player.playerId}>동료 · {player.nickname}</p>) : <p>당신은 유일한 마피아입니다.</p>)}{role === 'POLICE' && investigationHistory?.length ? <div className="mafiaInvestigationHistory"><b>내 조사 기록</b>{investigationHistory.map(item => <p key={item.nightNo}>{item.nightNo}번째 밤 : {item.targetNickname} → {item.mafia ? '마피아' : '마피아 아님'}</p>)}</div> : null}</Card>}</div>
}
const actionCopy: Record<MafiaNightActionType, { title: string; description: string; submit: string }> = {
  ATTACK: { title: '오늘 밤 공격할 사람', description: '다른 마피아와 같은 사람을 고르면 공격에 성공해요.', submit: '공격 대상으로 선택' },
  INVESTIGATE: { title: '조사할 사람', description: '마피아인지 아닌지 바로 확인할 수 있어요.', submit: '이 사람 조사하기' },
  HEAL: { title: '오늘 밤 치료할 사람', description: '직전 밤에 치료한 사람은 연속으로 치료할 수 없어요.', submit: '이 사람 치료하기' },
  SUSPECT: { title: '가장 의심되는 사람', description: '의심만 할 뿐, 마피아로 지목하는 건 아니에요.', submit: '이 사람을 의심하기' },
  CONFIRM: { title: '첫 번째 밤이에요', description: '오늘 밤에는 사용할 능력이 없어요.', submit: '확인 완료' },
}
type CommonProps = { host: boolean; pending: boolean }

export function MafiaReadyView({ state, host, pending, onStart }: CommonProps & { state: Extract<MafiaGameState, { phase: 'READY' }>; onStart: () => void }) {
  const roles = state.roleComposition
  return <div className="mafiaScene mafiaReadyScreen"><div className="mafiaReadyVisual" aria-hidden><img src={mafiaNightReady} alt="" /></div><div className="mafiaReadyCopy"><p className="eyebrow">마피아 게임</p><h1>도시의 밤이<br />시작됩니다</h1></div><Card className="mafiaCompositionCard"><div className="sectionHead"><b>이번 게임 역할 구성</b><span>{state.participantCount}명</span></div><div className="mafiaComposition"><span><RoleIcon role="CITIZEN" /><small>시민</small><b>{roles.citizen}명</b></span><span><RoleIcon role="MAFIA" /><small>마피아</small><b>{roles.mafia}명</b></span><span><RoleIcon role="POLICE" /><small>경찰</small><b>{roles.police}명</b></span><span><RoleIcon role="DOCTOR" /><small>의사</small><b>{roles.doctor}명</b></span></div><p>역할은 서버가 자동으로 배정해요.</p></Card>{host ? <Button disabled={pending} onClick={onStart}>{pending ? '시작 중...' : '게임 시작'}</Button> : <SpinnerText>방장이 게임을 시작할 거예요</SpinnerText>}</div>
}

export function MafiaRoleView({ state, pending, onConfirm }: { state: Extract<MafiaGameState, { phase: 'ROLE_REVEAL' }>; pending: boolean; onConfirm: () => void }) {
  if (state.roleChecked) return <div className="mafiaScene"><p className="eyebrow">역할 확인 완료</p><h1>역할을 안전하게<br />가려두었어요</h1><RoleRecall role={state.myRole} teammates={state.mafiaTeammates} /><Progress value={state.roleCheckedCount} max={state.participantCount} /><SpinnerText>다른 플레이어의 확인을 기다리고 있어요</SpinnerText></div>
  return <div className="mafiaScene"><p className="eyebrow">나만 확인하세요</p><RoleIcon role={state.myRole} large /><h1>당신은<br /><em>{roleLabel[state.myRole]}</em>입니다</h1>{state.myRole === 'MAFIA' && <Card><b>함께하는 마피아</b>{state.mafiaTeammates?.length ? state.mafiaTeammates.map(player => <p className="mafiaTeammateRow" key={player.playerId}><Avatar name={player.nickname} /><span>{player.nickname}</span></p>) : <p>당신은 유일한 마피아입니다.</p>}</Card>}<Button disabled={pending} onClick={onConfirm}>{pending ? '확인 중...' : '확인했어요'}</Button></div>
}

export function MafiaNightView({ state, pending, onAction }: { state: Extract<MafiaGameState, { phase: 'FIRST_NIGHT' | 'NIGHT' }>; pending: boolean; onAction: (input: { actionType: MafiaNightActionType; targetPlayerId?: number }) => Promise<{ result?: { targetPlayerId: number; mafia: boolean } } | undefined> }) {
  const [selected, setSelected] = useState<number>()
  const [investigation, setInvestigation] = useState<{ targetPlayerId: number; mafia: boolean }>()
  const action = state.nightAction
  const copy = action ? actionCopy[action.actionType] : undefined
  const submit = async () => { if (!action || (action.actionType !== 'CONFIRM' && !selected)) return; const response = await onAction({ actionType: action.actionType, targetPlayerId: selected }); if (response?.result) setInvestigation(response.result) }
  if (!state.alive) return <DeadView />
  if (action?.submitted || investigation) return <div className="mafiaScene"><div className="mafiaMoon" aria-hidden>{investigation ? (investigation.mafia ? '🚨' : '✅') : '🌙'}</div>{state.phase === 'FIRST_NIGHT' && <p className="mafiaFirstNightLabel">첫 번째 밤</p>}<h1>{investigation ? (investigation.mafia ? '마피아입니다' : '마피아가 아닙니다') : '행동 완료!'}</h1>{investigation && <Card><b>{action?.eligibleTargets?.find(item => item.playerId === investigation.targetPlayerId)?.nickname ?? '선택한 플레이어'}</b><p>조사 기록에서 언제든 다시 확인할 수 있어요.</p></Card>}<NightHistory state={state} /><Progress value={state.nightProgress?.completedActionCount ?? 0} max={state.nightProgress?.requiredActionCount ?? 1} /><SpinnerText>밤이 끝나기를 기다리고 있어요</SpinnerText></div>
  return <div className={`mafiaScene mafiaNightActionScene${action?.actionType === 'SUSPECT' ? ' mafiaSuspicionScene' : ''}${action?.actionType === 'ATTACK' ? ' mafiaAttackScene' : ''}`}>{state.phase !== 'FIRST_NIGHT' && action?.actionType !== 'ATTACK' && <p className="eyebrow">{state.nightNo}번째 밤</p>}{action?.actionType === 'ATTACK' ? <div className="mafiaAttackVisual" aria-hidden><img src={mafiaNightAttack} alt="" /></div> : action?.actionType === 'SUSPECT' ? <div className="mafiaSuspicionVisual" aria-hidden><img src={citizenSuspicion} alt="" /></div> : <div className="mafiaMoon" aria-hidden>🌙</div>}{state.phase === 'FIRST_NIGHT' && <p className="mafiaFirstNightLabel">첫 번째 밤</p>}<h1>{copy?.title}</h1><p className="sub">{copy?.description}</p>{action?.actionType !== 'CONFIRM' && <div className="candidateList">{action?.eligibleTargets?.map(candidate => <button type="button" key={candidate.playerId} className={selected === candidate.playerId ? 'selected' : ''} onClick={() => setSelected(candidate.playerId)}><Avatar name={candidate.nickname} /><b>{candidate.nickname}</b><span>{selected === candidate.playerId ? '✓' : ''}</span></button>)}</div>}<Button disabled={pending || (action?.actionType !== 'CONFIRM' && !selected)} onClick={() => void submit()}>{pending ? '제출 중...' : copy?.submit}</Button><RoleRecall role={state.myRole} teammates={state.mafiaTeammates} /><NightHistory state={state} /></div>
}

function NightHistory({ state }: { state: Extract<MafiaGameState, { phase: 'FIRST_NIGHT' | 'NIGHT' }> }) { if (state.myRole !== 'POLICE' || !state.investigationHistory?.length) return null; return <Card><b>지난 조사 기록</b>{state.investigationHistory.map(item => <p key={item.nightNo}>{item.nightNo}번째 밤 · {item.targetNickname} — <strong>{item.mafia ? '마피아' : '마피아 아님'}</strong></p>)}</Card> }

export function MafiaInvestigationResultView({ targetNickname, mafia, onConfirm }: { targetNickname: string; mafia: boolean; onConfirm: () => void }) {
  return <div className="mafiaScene"><RoleIcon role="POLICE" large /><p className="eyebrow">경찰 조사 결과</p><h1>{targetNickname}님은<br /><em>{mafia ? '마피아입니다' : '마피아가 아닙니다'}</em></h1><Card><p>조사 기록에서 언제든 다시 확인할 수 있어요.</p></Card><Button onClick={onConfirm}>확인</Button></div>
}

type NightOutcome = Extract<MafiaGameState, { phase: 'DAY' }>['lastNightResult']
function NightOutcomeContent({ result }: { result: NightOutcome }) {
  const deadPlayer = result.deadPlayer
  const image = deadPlayer ? (deadPlayer.revealedRole === 'MAFIA' ? mafiaNightResult : citizenNightResult) : cityNightResult

  return <><div className="mafiaNightOutcomeVisual" aria-hidden><img src={image} alt="" /></div><p className="eyebrow">지난 밤,</p><h1>{deadPlayer ? `${deadPlayer.nickname}님이 죽었습니다` : '아무도 죽지 않았습니다'}</h1>{deadPlayer && <p className="mafiaNightOutcomeRole">직업은 <strong>{roleLabel[deadPlayer.revealedRole]}</strong>였습니다</p>}</>
}

function SurvivalStatus({ players }: { players: NonNullable<Extract<MafiaGameState, { phase: 'DAY' }>['players']> }) {
  const [visible, setVisible] = useState(false)
  const aliveCount = players.filter(player => player.alive).length

  return <div className="mafiaSurvivalStatus"><Button className="mafiaSurvivalToggle" onClick={() => setVisible(current => !current)} aria-expanded={visible}><span className="mafiaSurvivalToggleTitle"><i aria-hidden><span className="aliveDot" /><span className="deadDot" /></i><b>{visible ? '생존 현황 닫기' : '생존 현황'}</b></span><small>생존 {aliveCount} · 사망 {players.length - aliveCount}</small></Button>{visible && <Card className="mafiaSurvivalCard"><div className="sectionHead"><b>전체 생존 현황</b><span>생존 {aliveCount}명 · 사망 {players.length - aliveCount}명</span></div><div className="mafiaSurvivalList">{players.map(player => <div className="mafiaSurvivalRow" key={player.playerId}><Avatar name={player.nickname} /><b>{player.nickname}</b><span className={player.alive ? 'alive' : 'dead'}>{player.alive ? '생존' : '사망'}</span></div>)}</div></Card>}</div>
}

export function MafiaDayView({ state, host, pending, onVote }: { state: Extract<MafiaGameState, { phase: 'DAY' }>; host: boolean; pending: boolean; onVote: () => void }) {
  const [firstNightResultSeen, setFirstNightResultSeen] = useState(state.dayNo !== 1)

  if (!firstNightResultSeen) {
    return <div className="mafiaScene mafiaNightOutcomeScene"><NightOutcomeContent result={state.lastNightResult} /><Button onClick={() => setFirstNightResultSeen(true)}>다음</Button></div>
  }

  return <div className="mafiaScene mafiaDayScene"><div className="mafiaDiscussionVisual" aria-hidden><img src={roleDiscussion} alt="" /></div><p className="eyebrow">낮이 밝았어요</p><h1>자유롭게 토론하세요</h1>{state.alive && state.lastNightResult.mySuspicionCount !== null && <Card><b>지난 밤, 나를 의심한 사람</b><h2>{state.lastNightResult.mySuspicionCount}명</h2></Card>}{state.players?.length ? <SurvivalStatus players={state.players} /> : null}<RoleRecall role={state.myRole} teammates={state.mafiaTeammates} investigationHistory={state.investigationHistory} />{!state.alive ? <DeadView /> : host ? <Button disabled={pending} onClick={onVote}>{pending ? '투표 준비 중...' : '토론을 마치고 투표 시작'}</Button> : <SpinnerText>자유롭게 토론하며 방장의 투표 시작을 기다려주세요</SpinnerText>}</div>
}

export function MafiaVotingView({ state, pending, onSubmit }: { state: Extract<MafiaGameState, { phase: 'VOTING' | 'REVOTING' }>; pending: boolean; onSubmit: (id: number) => void }) { const [selected, setSelected] = useState<number>(); if (!state.alive) return <DeadView />; if (state.vote.myVoteSubmitted) return <div className="mafiaScene"><div className="successIcon">✓</div><h1>투표 완료!</h1><Progress value={state.vote.completedVoteCount} max={state.vote.requiredVoteCount} /><SpinnerText>다른 생존자의 투표를 기다리고 있어요</SpinnerText></div>; return <div className="mafiaScene mafiaVotingScene"><p className="eyebrow">비밀 투표{state.vote.round > 1 ? ` · ${state.vote.round}차` : ''}</p><h1>{state.phase === 'REVOTING' ? '동률 후보에게 재투표하세요' : '처형할 사람을 선택하세요'}</h1>{state.previousVoteResult?.tied ? <><p className="mafiaTieNotice">최다 득표가 같아 재투표합니다</p><VoteBars counts={state.previousVoteResult.counts} /></> : null}<div className="candidateList">{state.vote.eligibleCandidates.map(candidate => <button type="button" key={candidate.playerId} className={selected === candidate.playerId ? 'selected' : ''} onClick={() => setSelected(candidate.playerId)}><Avatar name={candidate.nickname} /><b>{candidate.nickname}</b><span>{selected === candidate.playerId ? '✓' : ''}</span></button>)}</div><Button disabled={!selected || pending} onClick={() => selected && onSubmit(selected)}>{pending ? '제출 중...' : '투표 제출'}</Button><RoleRecall role={state.myRole} teammates={state.mafiaTeammates} investigationHistory={state.investigationHistory} /><p className="privacyLine">🔒 투표 완료자와 투표 대상은 공개되지 않아요</p></div> }

function VoteBars({ counts }: { counts: { playerId: number; nickname: string; voteCount: number }[] }) { const max = Math.max(1, ...counts.map(item => item.voteCount)); return <Card className="voteBars">{counts.map(item => <div key={item.playerId}><span>{item.nickname}</span><div><i style={{ width: `${item.voteCount / max * 100}%` }} /></div><b>{item.voteCount}표</b></div>)}</Card> }
export function MafiaVoteResultView({ state, pending, onAdvance }: { state: Extract<MafiaGameState, { phase: 'VOTE_RESULT' }>; pending: boolean; onAdvance: () => void }) { return <div className="mafiaScene"><p className="eyebrow">최종 투표 결과</p><h1>처형 대상이<br />결정됐습니다</h1><VoteBars counts={state.voteResult.counts} />{state.canAdvance ? <Button disabled={pending} onClick={onAdvance}>정체 공개하기</Button> : <SpinnerText>방장이 정체를 공개할 거예요</SpinnerText>}</div> }
export function MafiaExecutionView({ state, pending, onAdvance }: { state: Extract<MafiaGameState, { phase: 'EXECUTION' }>; pending: boolean; onAdvance: () => void }) { return <div className="mafiaScene"><RoleIcon role={state.executionResult.revealedRole} large /><p className="eyebrow">처형 결과</p><h1>{state.executionResult.nickname}님은<br /><em>{roleLabel[state.executionResult.revealedRole]}</em>였습니다</h1>{state.canAdvance ? <Button disabled={pending} onClick={onAdvance}>다음 밤 시작</Button> : <SpinnerText>방장이 다음 밤을 시작할 거예요</SpinnerText>}</div> }
export function MafiaNightResultView({ state, pending, onAdvance }: { state: Extract<MafiaGameState, { phase: 'NIGHT_RESULT' }>; pending: boolean; onAdvance: () => void }) { return <div className="mafiaScene mafiaNightOutcomeScene"><NightOutcomeContent result={state.nightResult} />{state.canAdvance ? <Button disabled={pending} onClick={onAdvance}>낮 시작</Button> : <SpinnerText>방장이 낮을 시작할 거예요</SpinnerText>}</div> }

export function MafiaFinalView({ state, host, pending, onAction }: { state: Extract<MafiaGameState, { phase: 'FINISHED' }>; host: boolean; pending: boolean; onAction: (action: 'REPLAY' | 'OTHER') => void }) { const mafiaWon = state.result.winnerTeam === 'MAFIA_TEAM'; return <div className="mafiaScene"><div className="confetti" aria-hidden>✦　·　✧　⋆</div><RoleIcon role={mafiaWon ? 'MAFIA' : 'CITIZEN'} large /><p className="eyebrow">게임 종료</p><h1>{mafiaWon ? '마피아팀 승리!' : '시민팀 승리!'}</h1><Card>{state.result.players.map(player => <div className="mafiaResultRow" key={player.playerId}><span><Avatar name={player.nickname} /> {player.nickname}</span><b className="mafiaRoleName"><RoleIcon role={player.role} /> {roleLabel[player.role]} · {player.alive ? '생존' : '사망'}</b></div>)}</Card>{host ? <><Button disabled={pending} onClick={() => onAction('REPLAY')}>같은 게임 다시하기</Button><Button className="secondary" disabled={pending} onClick={() => onAction('OTHER')}>다른 게임 고르기</Button></> : <SpinnerText>방장이 다음 게임을 고르고 있어요</SpinnerText>}</div> }
export function DeadView() { return <div className="mafiaDead"><div aria-hidden>👻</div><h2>당신은 사망했습니다</h2><p>게임이 끝날 때까지 생존자들의 게임을 지켜봐 주세요.</p></div> }
