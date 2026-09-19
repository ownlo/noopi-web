import { useEffect, useRef, useState } from 'react'
import type { RealtimeEvent } from '../../../api/types'

// Ephemeral presentation only. Scores, turns and actions still come from /state.
export function usePigRemoteRoll(event: RealtimeEvent | null, sessionId: number | undefined, meId: number) {
  const seen = useRef(new Set<string>())
  const [roll, setRoll] = useState<{ id: string; value: number; motion: 'rolling' | 'landing' } | null>(null)
  useEffect(() => {
    setRoll(null)
    if (!event || event.gameSessionId !== sessionId || event.type !== 'PIG_ROLL_RESOLVED' || event.payload.playerId === meId || seen.current.has(event.eventId)) return
    const value = event.payload.diceValue
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 6) return
    seen.current.add(event.eventId)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setRoll({ id: event.eventId, value, motion: 'rolling' })
    const landing = window.setTimeout(() => setRoll({ id: event.eventId, value, motion: 'landing' }), 650)
    const finish = window.setTimeout(() => setRoll(null), 1350)
    return () => { window.clearTimeout(landing); window.clearTimeout(finish) }
  }, [event, sessionId, meId])
  return roll
}
