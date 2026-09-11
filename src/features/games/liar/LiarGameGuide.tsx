import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { GameCatalog } from '../../../api/types'
import { Button } from '../../../components/ui'
import animalDuo from '../../../assets/characters/noopi-animal-duo.png'
import citizenCharacter from '../../../assets/characters/noopi-citizen-dog.png'
import liarCharacter from '../../../assets/characters/noopi-liar-cat.png'
import liarGameChoiceCharacter from '../../../assets/characters/noopi-liar-cat-game-choice.png'

type Game = GameCatalog['games'][number]

export function LiarGameGuide({ game, actionLabel, onClose, onAction, showCloseButton = true, actionVariant = 'primary' }: { game: Game; actionLabel: string; onClose: () => void; onAction: () => void; showCloseButton?: boolean; actionVariant?: 'primary' | 'secondary' }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return createPortal(<div className="dialogBackdrop gameGuideBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="gameGuideDialog" role="dialog" aria-modal="true" aria-labelledby="game-guide-title" aria-describedby="game-guide-summary">
      <header className="gameGuideHeader">
        <div><p>NOOPI GAME GUIDE</p><h2 id="game-guide-title">{game.name}</h2></div>
        {showCloseButton && <button type="button" autoFocus onClick={onClose} aria-label="게임 방법 닫기">×</button>}
      </header>
      <p className="gameGuideSummary" id="game-guide-summary">한 명뿐인 라이어를 대화로 찾아내는 게임이에요. 휴대폰은 잠깐씩만 보고, 서로의 표정을 살펴보세요!</p>
      <div className="gameGuideMeta"><span>👥 {game.minPlayers}–{game.maxPlayers}명</span><span>라이어 1명</span></div>
      <ol className="gameGuideSteps">
        <li><div className="guideScene guideSceneSecret" aria-hidden><img className="guideCitizen" src={citizenCharacter} alt="" /><img className="guideLiar" src={liarCharacter} alt="" /><i>?</i></div><div><small>STEP 1</small><h3>나만의 역할을 확인해요</h3><p>시민은 모두 같은 제시어를 받아요. 단 한 명의 라이어만 제시어를 모른답니다.</p></div></li>
        <li><div className="guideScene guideSceneTalk" aria-hidden><img src={animalDuo} alt="" /><i>···</i></div><div><small>STEP 2</small><h3>한마디씩 이야기해요</h3><p>첫 발언자부터 제시어를 너무 티 나지 않게 설명해요. 질문하고 반응을 살피며 수상한 사람을 찾아보세요.</p></div></li>
        <li><div className="guideScene guideSceneVote" aria-hidden><img src={citizenCharacter} alt="" /><i>✓</i></div><div><small>STEP 3</small><h3>비밀투표로 지목해요</h3><p>자신을 제외하고 라이어 같은 한 명에게 투표해요. 동률이면 동률 후보만 두고 다시 투표합니다.</p></div></li>
        <li><div className="guideScene guideSceneFinal" aria-hidden><img src={liarGameChoiceCharacter} alt="" /><i>!</i></div><div><small>STEP 4</small><h3>라이어에게도 마지막 기회!</h3><p>라이어를 찾아도 끝은 아니에요. 라이어가 제시어를 맞히면 역전하고, 틀리면 시민이 승리해요.</p></div></li>
      </ol>
      <div className="gameGuideTip"><b>누피의 팁</b><span>정답을 그대로 말하지 말고, 모두가 조금씩 고민할 만한 힌트를 주세요!</span></div>
      <Button className={`gameGuideStart ${actionVariant === 'secondary' ? 'secondary' : ''}`} autoFocus={!showCloseButton} onClick={onAction}>{actionLabel}</Button>
    </section>
  </div>, document.body)
}
