import { useEffect, useRef } from 'react'

const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID
const slotId = import.meta.env.VITE_ADSENSE_DISPLAY_SLOT_ID
const testMode = import.meta.env.VITE_ADSENSE_TEST_MODE !== 'false'

export function AdSenseDisplayBanner() {
  const initialized = useRef(false)

  useEffect(() => {
    if (testMode || !clientId || !slotId || initialized.current) return

    const scriptId = 'google-adsense-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    const requestAd = () => {
      if (initialized.current) return
      initialized.current = true
      const adsbygoogle = ((window as Window & { adsbygoogle?: object[] }).adsbygoogle ??= [])
      adsbygoogle.push({})
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.async = true
      script.crossOrigin = 'anonymous'
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`
      script.addEventListener('load', requestAd, { once: true })
      document.head.appendChild(script)
    } else if (script.dataset.loaded === 'true') {
      requestAd()
    } else {
      script.addEventListener('load', requestAd, { once: true })
    }

    const markLoaded = () => { if (script) script.dataset.loaded = 'true' }
    script.addEventListener('load', markLoaded, { once: true })
    return () => {
      script?.removeEventListener('load', requestAd)
      script?.removeEventListener('load', markLoaded)
    }
  }, [])

  return (
    <aside className="displayAd" aria-label="광고">
      <span className="displayAdLabel">광고</span>
      {testMode || !clientId || !slotId ? (
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
