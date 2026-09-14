import { useState } from 'react'
import type { MafiaRole } from '../api/types'

export function MockModeToggle() {
  const [enabled, setEnabled] = useState(() => sessionStorage.getItem('noopi.mockMode') === 'true')
  const [playerCount, setPlayerCount] = useState(() => {
    const saved = Number(sessionStorage.getItem('noopi.mockPlayerCount'))
    return saved >= 2 && saved <= 12 ? saved : 4
  })
  const [mafiaRole, setMafiaRole] = useState<MafiaRole>(() => {
    const saved = sessionStorage.getItem('noopi.mockMafiaRole')
    return saved === 'MAFIA' || saved === 'POLICE' || saved === 'DOCTOR' || saved === 'CITIZEN' ? saved : 'CITIZEN'
  })

  const toggle = () => {
    const next = !enabled
    sessionStorage.setItem('noopi.mockMode', String(next))
    if (next && !sessionStorage.getItem('noopi.mockPlayerCount')) sessionStorage.setItem('noopi.mockPlayerCount', String(playerCount))
    if (next && !sessionStorage.getItem('noopi.mockMafiaRole')) sessionStorage.setItem('noopi.mockMafiaRole', mafiaRole)
    setEnabled(next)
    window.location.assign('/')
  }

  const changeMafiaRole = (role: MafiaRole) => {
    setMafiaRole(role)
    sessionStorage.setItem('noopi.mockMafiaRole', role)
    window.location.assign('/')
  }

  const changePlayerCount = (value: number) => {
    setPlayerCount(value)
    sessionStorage.setItem('noopi.mockPlayerCount', String(value))
    window.location.assign('/')
  }

  return <div className={`mockControls ${enabled ? 'enabled' : ''}`}>
    {enabled && <><label className="mockPlayerCount"><span>마피아 역할</span><select aria-label="Mock 마피아 게임 역할" value={mafiaRole} onChange={event => changeMafiaRole(event.target.value as MafiaRole)}><option value="CITIZEN">시민</option><option value="MAFIA">마피아</option><option value="POLICE">경찰</option><option value="DOCTOR">의사</option></select></label><label className="mockPlayerCount"><span>인원</span><select aria-label="Mock 플레이어 인원" value={playerCount} onChange={event => changePlayerCount(Number(event.target.value))}>{Array.from({ length: 11 }, (_, index) => index + 2).map(count => <option key={count} value={count}>{count}명</option>)}</select></label></>}
    <button type="button" className={`mockToggle ${enabled ? 'enabled' : ''}`} aria-pressed={enabled} onClick={toggle}><span aria-hidden />Mock {enabled ? 'ON' : 'OFF'}</button>
  </div>
}
