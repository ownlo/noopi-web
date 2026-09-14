import { useEffect, useRef } from 'react'
import { adsenseClientId as clientId, adsenseSlotId as slotId, adsenseTestMode as testMode } from '../utils/adsense'

export function AdSenseDisplayBanner() {
  const initialized = useRef(false)

  useEffect(() => {
    if (testMode || !clientId || !slotId || initialized.current) return

    initialized.current = true
    try {
      // AdSense consumes queued requests when its async script finishes loading.
      const adsbygoogle = ((window as Window & { adsbygoogle?: object[] }).adsbygoogle ??= [])
      adsbygoogle.push({})
    } catch {
      // Advertising failures must not interrupt the game UI.
    }
  }, [])

  if (!testMode && (!clientId || !slotId)) return null

  return (
    <aside className="displayAd" aria-label="광고">
      <span className="displayAdLabel">광고</span>
      {testMode ? (
        <div className="displayAdTest" role="img" aria-label="AdSense 테스트 광고">
          <span>AD</span>
          <div><b>Google AdSense</b><small>테스트 디스플레이 광고</small></div>
          <em>TEST</em>
        </div>
      ) : (
        <ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={clientId} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true" />
      )}
    </aside>
  )
}
