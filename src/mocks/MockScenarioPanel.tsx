import { useState } from 'react'
import { api } from '../api'
import type { Scenario } from '../api/types'

const choices: { value: Scenario; label: string }[] = [{ value: 'CITIZEN_WIN', label: '시민 승리' }, { value: 'WRONG_ACCUSATION', label: '시민 오지목' }, { value: 'LIAR_GUESS', label: '내가 라이어' }, { value: 'REPEATED_TIE', label: '2회 동률' }]
export function MockScenarioPanel({ roomId }: { roomId: number }) {
  const [open, setOpen] = useState(false); const [scenario, setScenario] = useState<Scenario>('CITIZEN_WIN')
  return <aside className={`mockPanel ${open ? 'open' : ''}`}><button className="mockToggle" onClick={() => setOpen(!open)}>🧪 Mock Lab</button>{open && <div><p>다음 게임 시나리오</p><select aria-label="Mock 시나리오" value={scenario} onChange={e => { const value = e.target.value as Scenario; setScenario(value); api.setScenario?.(value) }}>{choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select><button onClick={() => api.simulateDisconnect?.(roomId)}>연결 끊김 재현</button><small>판정은 Mock 서버 계층에서만 수행됩니다.</small></div>}</aside>
}
