import { useNavigate } from 'react-router-dom'
import { Brand, Button, Card, Page } from '../components/ui'

export function HomePage() {
  const navigate = useNavigate()
  return <Page className="home"><Brand /><div className="hero"><div className="mascot" aria-hidden><span>😈</span><span>🤫</span><span>🕵️</span></div><p className="eyebrow">모이면 바로 시작!</p><h1>게임은 사람끼리,<br /><em>진행은 웹이.</em></h1><p className="sub">설치도, 가입도 없이<br />친구들과 바로 플레이하세요.</p></div><Card className="actionCard"><Button onClick={() => navigate('/create')}>＋ 방 만들기</Button><Button className="secondary" onClick={() => navigate('/join')}>⌁ 방 코드로 참가</Button></Card><p className="footnote">NOOPI · 우리 사이에 게임 한 스푼</p></Page>
}
