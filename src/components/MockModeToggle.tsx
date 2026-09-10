import { useState } from 'react'

export function MockModeToggle() {
  const [enabled, setEnabled] = useState(() => sessionStorage.getItem('noopi.mockMode') === 'true')

  const toggle = () => {
    const next = !enabled
    sessionStorage.setItem('noopi.mockMode', String(next))
    setEnabled(next)
    window.location.assign('/')
  }

  return <button type="button" className={`mockToggle ${enabled ? 'enabled' : ''}`} aria-pressed={enabled} onClick={toggle}><span aria-hidden />Mock {enabled ? 'ON' : 'OFF'}</button>
}
