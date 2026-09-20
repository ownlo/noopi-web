import { useEffect, useState } from 'react'
import noopiCharacter from '../assets/characters/noopi-dog.png'

type SplashPhase = 'visible' | 'leaving' | 'hidden'

function shouldShowSplash() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
  return standalone && sessionStorage.getItem('noopi.splashShown') !== 'true'
}

export function PwaSplash() {
  const [shouldDisplay] = useState(shouldShowSplash)
  const [phase, setPhase] = useState<SplashPhase>(() => shouldDisplay ? 'visible' : 'hidden')

  useEffect(() => {
    if (!shouldDisplay) return

    const leaveTimer = window.setTimeout(() => setPhase('leaving'), 700)
    const hideTimer = window.setTimeout(() => {
      sessionStorage.setItem('noopi.splashShown', 'true')
      setPhase('hidden')
    }, 980)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
    }
  }, [shouldDisplay])

  if (phase === 'hidden') return null

  return <div className={`pwaSplash ${phase}`} role="status" aria-label="NOOPI 시작 중">
    <div className="pwaSplashGlow" />
    <img src={noopiCharacter} alt="" />
    <h1>NOOPI</h1>
  </div>
}
