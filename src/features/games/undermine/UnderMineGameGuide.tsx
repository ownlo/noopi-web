import { createPortal } from 'react-dom'
import { Button } from '../../../components/ui'
import mineNoopi from '../../../assets/characters/noopi-cat.png'
import './undermine.css'

export function UnderMineGameGuide({ onClose, onAction }: { onClose: () => void; onAction: () => void }) {
  return createPortal(<div className="dialogBackdrop gameGuideBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="gameGuideDialog undermineGuide" role="dialog" aria-modal="true" aria-labelledby="undermine-guide-title">
      <header className="gameGuideHeader"><div><p>NOOPI GAME GUIDE</p><h2 id="undermine-guide-title">언더마인</h2></div><button type="button" onClick={onClose} aria-label="게임 방법 닫기">×</button></header>
      <p className="gameGuideSummary">길을 이어 금을 찾는 광부와, 몰래 길을 방해하는 방해꾼의 정체 은닉 카드 게임이에요.</p>
      <div className="gameGuideMeta"><span>👥 3–10명</span><span>⛏️ 3라운드</span></div>
      <ol className="gameGuideSteps">
        <li><div className="guideScene undermineGuideScene"><img src={mineNoopi} alt="" /><i>?</i></div><div><small>STEP 1</small><h3>역할은 나만 확인</h3><p>광부는 금을 향해 길을 잇고, 방해꾼은 정체를 숨긴 채 길을 방해해요.</p></div></li>
        <li><div className="guideScene undermineGuideScene"><b aria-hidden>╋ ━ ┓</b></div><div><small>STEP 2</small><h3>카드 한 장을 플레이</h3><p>길을 놓거나 도구를 고장·수리하고, 지도와 파괴 카드로 판을 바꿔요.</p></div></li>
        <li><div className="guideScene undermineGuideScene"><span aria-hidden>💎</span></div><div><small>STEP 3</small><h3>3라운드 금 합산</h3><p>금에 닿으면 광부, 카드가 떨어질 때까지 막으면 방해꾼이 보상을 받아요.</p></div></li>
      </ol>
      <div className="gameGuideTip"><b>중요한 규칙</b><span>낼 수 있는 카드가 하나도 없을 때만 카드 한 장을 버릴 수 있어요.</span></div>
      <Button className="gameGuideStart" onClick={onAction}>광산 입장하기</Button>
    </section>
  </div>, document.body)
}
