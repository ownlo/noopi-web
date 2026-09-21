import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Brand, Page } from '../components/ui'
import { findGameGuide, gameGuides } from '../content/gameGuides'

const defaultTitle = 'NOOPI | 우리끼리 모이면, 바로 게임 시작!'
const defaultDescription = '모이면 바로 시작! QR 또는 방 코드로 참여해 함께 즐기는 실시간 멀티플레이 게임 NOOPI.'

function useGuideMetadata(name: string, description: string, slug: string) {
  useEffect(() => {
    const descriptionMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    document.title = `${name} 게임 방법 | NOOPI`
    descriptionMeta?.setAttribute('content', description)
    canonical?.setAttribute('href', `https://noopi.kr/games/${slug}`)

    return () => {
      document.title = defaultTitle
      descriptionMeta?.setAttribute('content', defaultDescription)
      canonical?.setAttribute('href', 'https://noopi.kr/')
    }
  }, [description, name, slug])
}

export function GameGuidePage() {
  const { gameSlug } = useParams()
  const guide = findGameGuide(gameSlug)

  if (!guide) return <Navigate to="/" replace />

  return <GameGuideContent guide={guide} />
}

function GameGuideContent({ guide }: { guide: NonNullable<ReturnType<typeof findGameGuide>> }) {
  useGuideMetadata(guide.name, guide.description, guide.slug)
  const otherGames = gameGuides.filter(game => game.slug !== guide.slug)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <Page className="publicGameGuide">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <header className="publicGuideHeader">
        <Link className="publicGuideBrand" to="/" aria-label="NOOPI 홈으로"><Brand /></Link>
        <Link className="publicGuideHome" to="/" aria-label="게임 가이드 닫기">×</Link>
      </header>

      <article>
        <div className="publicGuideHero">
          <div>
            <p className="eyebrow">NOOPI GAME GUIDE</p>
            <h1>{guide.name}</h1>
            <p className="publicGuideTagline">{guide.tagline}</p>
          </div>
          <img src={guide.artwork} alt={guide.artworkAlt} />
        </div>

        <dl className="publicGuideMeta">
          {guide.meta.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>

        <section className="publicGuideIntro" aria-labelledby="guide-intro-title">
          <p className="publicGuideSectionLabel">게임 소개</p>
          <h2 id="guide-intro-title">어떤 게임인가요?</h2>
          <p>{guide.description}</p>
          <ul>{guide.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
        </section>

        <section aria-labelledby="guide-flow-title">
          <p className="publicGuideSectionLabel">진행 방법</p>
          <h2 id="guide-flow-title">이렇게 플레이해요</h2>
          <ol className="publicGuideSteps">
            {guide.steps.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
          </ol>
        </section>

        <section aria-labelledby="guide-rules-title">
          <p className="publicGuideSectionLabel">핵심 규칙</p>
          <h2 id="guide-rules-title">이것만은 기억하세요</h2>
          <div className="publicGuideRules">
            {guide.rules.map(rule => <div key={rule.title}><h3>{rule.title}</h3><p>{rule.description}</p></div>)}
          </div>
        </section>

        <section aria-labelledby="guide-faq-title">
          <p className="publicGuideSectionLabel">FAQ</p>
          <h2 id="guide-faq-title">자주 묻는 질문</h2>
          <div className="publicGuideFaq">
            {guide.faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
          </div>
        </section>

        <nav className="publicGuideMore" aria-label="다른 게임 안내">
          <h2>다른 게임도 둘러보세요</h2>
          <div className="homeGameScroller publicGuideGameScroller">
            {otherGames.map(game => (
              <Link className={`homeGameCard homeGameCard-${game.slug}`} key={game.slug} to={`/games/${game.slug}`}>
                <span className="homeGameCardArt"><img src={game.artwork} alt="" /></span>
                <strong>{game.name}</strong>
                <small>{game.meta[0].value}</small>
              </Link>
            ))}
          </div>
        </nav>
      </article>

    </Page>
  )
}
