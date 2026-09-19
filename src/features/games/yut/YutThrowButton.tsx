import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../../../components/ui'

const chargeDuration = 1400
type Hold = { startedAt: number; input: number | ' ' | 'Enter' }

export function YutThrowButton({ disabled, bonus, onThrow }: {
  disabled: boolean
  bonus: boolean
  onThrow: (power: number) => void
}) {
  const [power, setPower] = useState(0)
  const [charging, setCharging] = useState(false)
  const hold = useRef<Hold | null>(null)
  const frame = useRef(0)
  const submitted = useRef(false)

  function cancel() {
    hold.current = null
    cancelAnimationFrame(frame.current)
    setCharging(false)
    setPower(0)
  }

  useEffect(() => {
    if (disabled) cancel()
    else submitted.current = false
  }, [disabled])

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) cancel() }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      hold.current = null
      cancelAnimationFrame(frame.current)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function begin(input: Hold['input']) {
    if (disabled || submitted.current || hold.current) return
    hold.current = { startedAt: performance.now(), input }
    setPower(0)
    setCharging(true)
    const tick = () => {
      if (!hold.current) return
      const next = Math.min(1, (performance.now() - hold.current.startedAt) / chargeDuration)
      setPower(next)
      if (next < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  function release(input: Hold['input']) {
    if (hold.current?.input !== input) return
    const strength = Math.min(1, (performance.now() - hold.current.startedAt) / chargeDuration)
    cancel()
    submit(strength)
  }

  function submit(strength: number) {
    if (disabled || submitted.current) return
    submitted.current = true
    onThrow(strength)
  }

  const percent = Math.round(power * 100)
  return <div className={`yutThrowControl ${charging ? 'isCharging' : ''} ${power === 1 ? 'isFullPower' : ''}`} style={{ '--charge': `${power * 360}deg`, '--charge-empty': `${(1 - power) * 100}%`, '--charge-glow': `${12 + power * 28}px` } as CSSProperties}>
    <div className="yutChargeRing">
      <Button
        type="button"
        className="yutThrowButton"
        disabled={disabled}
        aria-label={bonus ? '한 번 더 던지기' : '던지기'}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || disabled || hold.current) return
          event.currentTarget.setPointerCapture(event.pointerId)
          begin(event.pointerId)
        }}
        onPointerUp={event => release(event.pointerId)}
        onPointerCancel={cancel}
        onLostPointerCapture={event => { if (hold.current?.input === event.pointerId) cancel() }}
        onBlur={cancel}
        onDragStart={event => event.preventDefault()}
        onContextMenu={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.key === 'Escape') { cancel(); return }
          if (event.key !== ' ' && event.key !== 'Enter') return
          event.preventDefault()
          if (!event.repeat) begin(event.key)
        }}
        onKeyUp={event => {
          if (event.key !== ' ' && event.key !== 'Enter') return
          event.preventDefault()
          release(event.key)
        }}
        onClick={event => { if (event.detail === 0 && !hold.current) submit(0) }}
      >
        <span className="yutChargeFill" aria-hidden="true" />
        <strong>{disabled ? '던지는 중' : charging ? '손을 떼요!' : '던지기'}</strong>
        {!charging && (disabled || bonus) && <small>{disabled ? '잠깐만요' : '한 번 더!'}</small>}
      </Button>
    </div>
    <span className="srOnly" role="meter" aria-label="던지기 파워" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} />
  </div>
}
