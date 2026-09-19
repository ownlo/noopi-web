import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

const pips = [[5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]]
// Orthographic overhead view: the confirmed face points directly at the camera.
const rotations = ['', 'rotateY(-90deg)', 'rotateX(-90deg)', 'rotateX(90deg)', 'rotateY(90deg)', 'rotateY(180deg)'].map(face => `rotateZ(-12deg) ${face}`)

export function PigDice({ value, motion }: { value: number | null; motion: 'idle' | 'rolling' | 'landing' }) {
  const cube = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const previousMotion = useRef(motion)
  useLayoutEffect(() => {
    const element = cube.current
    if (!element) return
    if (motion === 'rolling' && previousMotion.current === 'rolling' && animation.current?.playState === 'running') return
    animation.current?.cancel()
    animation.current = null
    previousMotion.current = motion
    if (motion === 'rolling') {
      animation.current = element.animate([
        { transform: 'rotateX(8deg) rotateY(-12deg) rotateZ(-12deg)' },
        { transform: 'rotateX(128deg) rotateY(168deg) rotateZ(68deg)' },
        { transform: 'rotateX(248deg) rotateY(348deg) rotateZ(148deg)' },
        { transform: 'rotateX(368deg) rotateY(528deg) rotateZ(228deg)' },
      ], { duration: 780, iterations: Infinity, easing: 'linear' })
    } else if (motion === 'landing') {
      const rest = rotations[(value ?? 1) - 1]
      animation.current = element.animate([
        { transform: `${rest} scale(.94)` },
        { transform: `${rest} scale(1.06)`, offset: .56 },
        { transform: rest },
      ], { duration: 700, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'forwards' })
    }
  }, [motion, value])
  useEffect(() => () => {
    animation.current?.cancel()
    animation.current = null
  }, [])
  return <div className={`pigDiceStage ${motion}`} role="img" aria-label={motion === 'rolling' ? '주사위를 던지는 중' : value ? `주사위 결과 ${value}` : '주사위 던지기 대기'}>
    <div className="pigDiceShadow" />
    <div className="pigDiceFlight">
      <div ref={cube} className="pigDiceCube" style={{ '--dice-rest': rotations[(value ?? 1) - 1] } as CSSProperties} aria-hidden>
        {pips.map((positions, index) => <div className={`pigCubeFace face${index + 1}`} key={index}>{Array.from({ length: 9 }, (_, n) => <span key={n} className={(value !== null || motion === 'rolling') && positions.includes(n + 1) ? 'pip' : ''} />)}</div>)}
      </div>
    </div>
  </div>
}
