import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../../components/ui'
import rollCharacter from '../../../assets/characters/noopi-pig-game-choice.png'
import stopCharacter from '../../../assets/characters/noopi-pig-stop.png'
import catCharacter from '../../../assets/characters/noopi-cat.png'
import animalDuo from '../../../assets/characters/noopi-animal-duo.png'
import './pig.css'

type Props = {
  onClose: () => void
  onAction: () => void
  actionLabel?: string
  showCloseButton?: boolean
  actionVariant?: 'primary' | 'secondary'
}

export function PigGuide({ onClose, onAction, actionLabel = '시작하기', showCloseButton = true, actionVariant = 'primary' }: Props) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return createPortal(
    <div className="dialogBackdrop gameGuideBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="gameGuideDialog pigGameGuideDialog" role="dialog" aria-modal="true" aria-labelledby="pig-guide-title" aria-describedby="pig-guide-summary">
        <header className="gameGuideHeader">
          <div><p>NOOPI GAME GUIDE</p><h2 id="pig-guide-title">피그 게임</h2></div>
          {showCloseButton && <button type="button" autoFocus onClick={onClose} aria-label="게임 방법 닫기">×</button>}
        </header>
        <p className="gameGuideSummary" id="pig-guide-summary">한 번 더 던질까, 지금 멈출까? 주사위로 점수를 모으고, 먼저 50점을 확정해보세요!</p>
        <div className="gameGuideMeta"><span>👥 2–6명</span><span>🎲 개인전 · 목표 50점</span></div>
        <ol className="gameGuideSteps">
          <li>
            <div className="guideScene pigGuideScene" aria-hidden><img src={rollCharacter} alt="" /></div>
            <div><small>STEP 1</small><h3>내 차례에 주사위를 던져요</h3><p>2~6이 나오면 이번 턴 점수에 더해요. 같은 숫자도 다시 나올 수 있고, 성공할 때마다 다음 1의 확률이 10%p씩 올라가요.</p></div>
          </li>
          <li>
            <div className="guideScene pigGuideScene pigGuideRisk" aria-hidden><img src={catCharacter} alt="" /><i>1!</i></div>
            <div><small>STEP 2</small><h3>1이 나오면 이번 턴은 끝!</h3><p>이번 턴에 모은 점수만 사라지고 다음 차례로 넘어가요. 이미 확정한 점수는 안전해요.</p></div>
          </li>
          <li>
            <div className="guideScene pigGuideScene" aria-hidden><img src={stopCharacter} alt="" /></div>
            <div><small>STEP 3</small><h3>멈춰서 점수를 챙겨요</h3><p>첫 성공 이후 ‘멈추기’를 누르면 이번 턴 점수가 총점에 더해져요. 다음 턴의 1 확률은 다시 20%로 시작해요.</p></div>
          </li>
          <li>
            <div className="guideScene pigGuideScene" aria-hidden><img src={animalDuo} alt="" /><i>50</i></div>
            <div><small>STEP 4</small><h3>50점 확정 순서가 순위!</h3><p>50점 이상을 확정하면 순위를 받고 관전해요. 마지막 한 명은 점수와 관계없이 마지막 순위로 자동 확정돼요.</p></div>
          </li>
        </ol>
        <div className="gameGuideTip"><b>누피의 팁</b><span>1이 나올 확률은 성공할수록 올라가 최대 90%가 돼요. 위험도를 보고 멈출 타이밍을 잡으세요!</span></div>
        <Button className={`gameGuideStart ${actionVariant === 'secondary' ? 'secondary' : ''}`} autoFocus={!showCloseButton} onClick={onAction}>{actionLabel}</Button>
      </section>
    </div>, document.body,
  )
}
