import { useState } from 'react'

export function MockModeToggle() {
  const [enabled, setEnabled] = useState(() => sessionStorage.getItem('noopi.mockMode') === 'true')
  const [playerCount, setPlayerCount] = useState(() => {
    const saved = Number(sessionStorage.getItem('noopi.mockPlayerCount'))
    return saved >= 2 && saved <= 4 ? saved : 4
  })

  const toggle = () => {
    const next = !enabled
    sessionStorage.setItem('noopi.mockMode', String(next))
    if (next && !sessionStorage.getItem('noopi.mockPlayerCount')) sessionStorage.setItem('noopi.mockPlayerCount', String(playerCount))
    setEnabled(next)
    window.location.assign('/')
  }

  const changePlayerCount = (value: number) => {
    setPlayerCount(value)
    sessionStorage.setItem('noopi.mockPlayerCount', String(value))
    window.location.assign('/')
  }

  return <div className={`mockControls ${enabled ? 'enabled' : ''}`}>
    {enabled && <label className="mockPlayerCount"><span>인원</span><select aria-label="Mock 플레이어 인원" value={playerCount} onChange={event => changePlayerCount(Number(event.target.value))}><option value={2}>2명</option><option value={3}>3명</option><option value={4}>4명</option></select></label>}
    <button type="button" className={`mockToggle ${enabled ? 'enabled' : ''}`} aria-pressed={enabled} onClick={toggle}><span aria-hidden />Mock {enabled ? 'ON' : 'OFF'}</button>
  </div>
}
