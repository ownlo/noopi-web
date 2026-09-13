export const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID
export const adsenseSlotId = import.meta.env.VITE_ADSENSE_DISPLAY_SLOT_ID
export const adsenseTestMode = import.meta.env.VITE_ADSENSE_TEST_MODE !== 'false'

export function loadAdSenseScript() {
  if (adsenseTestMode || !adsenseClientId || document.getElementById('google-adsense-script')) return

  const script = document.createElement('script')
  script.id = 'google-adsense-script'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`
  document.head.appendChild(script)
}
