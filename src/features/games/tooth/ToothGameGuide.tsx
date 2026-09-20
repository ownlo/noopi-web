import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../../components/ui'
import toothCharacter from '../../../assets/characters/noopi-tooth-open-mouth.png'
import './tooth.css'

type Props = {
  onClose: () => void
  onAction: () => void
  actionLabel?: string
  showCloseButton?: boolean
  actionVariant?: 'primary' | 'secondary'
}

export function ToothGameGuide({ onClose, onAction, actionLabel = '시작하기', showCloseButton = true, actionVariant = 'primary' }: Props) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return createPortal(
    <div className="dialogBackdrop gameGuideBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="gameGuideDialog toothGuideDialog" role="dialog" aria-modal="true" aria-labelledby="tooth-guide-title" aria-describedby="tooth-guide-summary">
        <header className="gameGuideHeader">
          <div><p>NOOPI GAME GUIDE</p><h2 id="tooth-guide-title">누피 콱!</h2></div>
          {showCloseButton && <button type="button" onClick={onClose} aria-label="게임 방법 닫기">×</button>}
        </header>
        <p className="gameGuideSummary" id="tooth-guide-summary">누피의 이빨을 하나씩 눌러요. 숨어 있는 꽝을 누르면 누피가 콱!</p>
        <div className="gameGuideMeta"><span>👥 2–8명</span><span>🦷 24개 · 꽝 1개</span></div>
        <ol className="gameGuideSteps">
          <li><div className="guideScene toothGuideScene" aria-hidden><img src={toothCharacter} alt="" /><i>☝️</i></div><div><small>STEP 1</small><h3>내 차례에 하나만 눌러요</h3><p>누르지 않은 이빨 중 하나를 골라요. 턴을 넘기거나 두 개를 연속으로 누를 수 없어요.</p></div></li>
          <li><div className="guideScene toothGuideScene toothGuideSafe" aria-hidden><img src={toothCharacter} alt="" /><i>딸깍!</i></div><div><small>STEP 2</small><h3>안전하면 다음 사람 차례</h3><p>눌린 이빨은 그대로 남고, 서버가 정한 다음 Player에게 차례가 넘어가요.</p></div></li>
          <li><div className="guideScene toothGuideScene toothGuideBomb" aria-hidden><img src={toothCharacter} alt="" /><i>콱!</i></div><div><small>STEP 3</small><h3>꽝을 누른 한 명이 당첨</h3><p>누피가 입을 닫으면 즉시 끝! 순위 없이 당첨자 한 명만 결정해요.</p></div></li>
        </ol>
        <div className="gameGuideTip"><b>누피의 팁</b><span>꽝 위치는 서버만 알고 있어요. 표정을 읽어도 소용없답니다 😼</span></div>
        <Button className={`gameGuideStart ${actionVariant === 'secondary' ? 'secondary' : ''}`} autoFocus={!showCloseButton} onClick={onAction}>{actionLabel}</Button>
      </section>
    </div>, document.body,
  )
}
