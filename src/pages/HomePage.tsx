import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { GameCatalog } from '../api/types'
import { Brand, Button, Card, CharacterStage, Page } from '../components/ui'
import { LiarGameGuide } from '../features/games/liar/LiarGameGuide'
import { BlindGameGuide } from '../features/games/blind/BlindGameGuide'
import liarGameChoiceCharacter from '../assets/characters/noopi-liar-cat-game-choice.png'
import blindGameChoiceCharacter from '../assets/characters/noopi-blind-game-choice.png'

export function HomePage() {
  const navigate = useNavigate()
  const [showGameCatalog, setShowGameCatalog] = useState(false)
  const [guideGame, setGuideGame] = useState<GameCatalog['games'][number] | null>(null)
  const games = useQuery({ queryKey: ['games'], queryFn: api.getGames })
  const availableGames = games.data?.games.filter(game => game.enabled) ?? []
  useEffect(() => {
    if (!showGameCatalog || guideGame) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowGameCatalog(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [guideGame, showGameCatalog])
  return <Page className="home"><header className="homeHeader"><Brand /><button className="homeGuideLink" type="button" disabled={games.isLoading} onClick={() => setShowGameCatalog(true)}>게임 안내</button></header><div className="hero"><p className="eyebrow">같이 있을 때 더 재밌는</p><h1>우리끼리 모이면,<br /><em>바로 게임 시작!</em></h1><p className="sub">설치도, 가입도 없이<br />친구들과 바로 플레이하세요.</p><CharacterStage /></div><Card className="actionCard"><Button onClick={() => navigate('/create')}>방 만들기</Button><Button className="secondary" onClick={() => navigate('/join')}>방 코드로 참가</Button></Card><p className="footnote">게임은 사람끼리, 진행은 누피가.</p>{showGameCatalog && !guideGame && <HomeGameCatalog games={availableGames} onClose={() => setShowGameCatalog(false)} onSelect={game => setGuideGame(game)} />}{guideGame && (guideGame.gameType === 'LIAR' ? <LiarGameGuide game={guideGame} actionLabel="닫기" actionVariant="secondary" showCloseButton={false} onClose={() => setGuideGame(null)} onAction={() => setGuideGame(null)} /> : <BlindGameGuide game={guideGame} actionLabel="닫기" actionVariant="secondary" showCloseButton={false} onClose={() => setGuideGame(null)} onAction={() => setGuideGame(null)} />)}</Page>
}

function HomeGameCatalog({ games, onClose, onSelect }: { games: GameCatalog['games']; onClose: () => void; onSelect: (game: GameCatalog['games'][number]) => void }) {
  return <div className="dialogBackdrop homeCatalogBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="homeCatalogDialog" role="dialog" aria-modal="true" aria-labelledby="home-catalog-title">
      <div className="homeCatalogHeader"><p className="eyebrow">NOOPI GAMES</p><h2 id="home-catalog-title">어떤 게임이 있나요?</h2><p>궁금한 게임을 누르면 방법을 알려드릴게요.</p></div>
      <div className="homeCatalogList">{games.length > 0 ? games.map(game => <button type="button" key={game.gameType} onClick={() => onSelect(game)}><img className="homeCatalogCharacter" src={getGameArtwork(game)} alt="" /><span><small>{game.minPlayers}–{game.maxPlayers}명</small><strong>{game.name}</strong><em>{getGameSummary(game)}</em></span></button>) : <p className="homeCatalogEmpty">게임 정보를 불러오지 못했어요.</p>}</div>
      <Button className="secondary homeCatalogClose" autoFocus onClick={onClose}>닫기</Button>
    </section>
  </div>
}

function getGameSummary(game: GameCatalog['games'][number]) {
  switch (game.gameType) {
    case 'LIAR': return '제시어를 숨긴 라이어를 찾아보세요'
    case 'BLIND': return '질문하면서 내 제시어를 먼저 맞춰보세요'
  }
}

function getGameArtwork(game: GameCatalog['games'][number]) {
  switch (game.gameType) {
    case 'LIAR': return liarGameChoiceCharacter
    case 'BLIND': return blindGameChoiceCharacter
  }
}
