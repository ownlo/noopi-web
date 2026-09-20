import { useEffect, useState } from 'react'
import { Button } from './ui'

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string }

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function getInstallPlatform() {
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isAppleMobile) return 'IOS'

  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(navigator.userAgent)
  return isSafari ? 'MAC_SAFARI' : 'OTHER'
}

const dismissedKey = 'noopi.pwaInstallBannerDismissed'

export function PwaInstallBanner() {
  const installPlatform = getInstallPlatform()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => isStandalone() || sessionStorage.getItem(dismissedKey) === 'true')
  const [showGuide, setShowGuide] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    if (hidden) {
      document.documentElement.classList.remove('pwaBannerVisible')
      return
    }

    document.documentElement.classList.add('pwaBannerVisible')
    return () => document.documentElement.classList.remove('pwaBannerVisible')
  }, [hidden])

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => setHidden(true)

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (hidden) return null

  const dismiss = () => {
    sessionStorage.setItem(dismissedKey, 'true')
    setHidden(true)
  }

  const addIcon = async () => {
    if (!installPrompt) {
      setShowGuide(true)
      return
    }

    setIsInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      if (choice.outcome === 'accepted') setHidden(true)
    } finally {
      setIsInstalling(false)
    }
  }

  return <>
    <aside className="pwaInstallBanner" aria-label="홈 화면 아이콘 추가">
      <p>앱 설치 없이 바탕화면에 아이콘 추가하고 바로 접속하기</p>
      <button type="button" onClick={addIcon} disabled={isInstalling}>{isInstalling ? '추가 중…' : '아이콘 추가'}</button>
      <button className="pwaInstallDismiss" type="button" onClick={dismiss} aria-label="설치 안내 닫기">×</button>
    </aside>
    {showGuide && <div className="dialogBackdrop pwaGuideBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowGuide(false) }}>
      <section className="pwaGuideDialog" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
        <h2 id="pwa-guide-title">바탕화면에 아이콘 추가하기</h2>
        <p className="pwaGuideIntro">한 번 추가하면 주소를 입력하지 않고<br />NOOPI를 바로 열 수 있어요.</p>
        <ol className="pwaInstallSteps">
          {installPlatform === 'IOS' ? <>
            <li><span>1</span><div><b>Safari에서 열기</b><p>현재 페이지를 iPhone의 Safari 브라우저에서 열어주세요.</p></div></li>
            <li><span>2</span><div><b>공유 버튼 누르기</b><p>화면 아래의 네모에서 화살표가 올라오는 공유 버튼을 눌러주세요.</p></div></li>
            <li><span>3</span><div><b>홈 화면에 추가</b><p>메뉴에서 ‘홈 화면에 추가’를 선택하고 오른쪽 위 ‘추가’를 눌러주세요.</p></div></li>
          </> : installPlatform === 'MAC_SAFARI' ? <>
            <li><span>1</span><div><b>Safari에서 페이지 열기</b><p>macOS Safari에서 NOOPI 페이지를 열어주세요.</p></div></li>
            <li><span>2</span><div><b>Dock에 추가 선택</b><p>화면 위 메뉴 막대에서 ‘파일’을 누르고 ‘Dock에 추가’를 선택해주세요.</p></div></li>
            <li><span>3</span><div><b>이름 확인 후 추가</b><p>이름이 NOOPI인지 확인하고 ‘추가’를 누르면 완료돼요.</p></div></li>
          </> : <>
            <li><span>1</span><div><b>브라우저 메뉴 열기</b><p>Chrome 또는 Edge 오른쪽 위의 점 세 개 메뉴를 눌러주세요.</p></div></li>
            <li><span>2</span><div><b>설치 메뉴 선택</b><p>‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해주세요.</p></div></li>
            <li><span>3</span><div><b>추가 확인하기</b><p>표시되는 확인창에서 ‘설치’ 또는 ‘추가’를 누르면 완료돼요.</p></div></li>
          </>}
        </ol>
        <p className="pwaGuideTip">추가된 NOOPI 아이콘을 누르면 전체 화면으로 바로 시작됩니다.</p>
        <Button autoFocus onClick={() => setShowGuide(false)}>확인</Button>
      </section>
    </div>}
  </>
}
