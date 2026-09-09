import { useNavigate } from 'react-router-dom'
import { Brand, Button, Card, CharacterStage, Page } from '../components/ui'

export function HomePage() {
  const navigate = useNavigate()
  return <Page className="home"><header className="homeHeader"><Brand /></header><div className="hero"><p className="eyebrow">같이 있을 때 더 재밌는</p><h1>우리끼리 모이면,<br /><em>바로 게임 시작!</em></h1><p className="sub">설치도, 가입도 없이<br />친구들과 바로 플레이하세요.</p><CharacterStage /></div><Card className="actionCard"><Button onClick={() => navigate('/create')}><span>방 만들기</span><b>→</b></Button><Button className="secondary" onClick={() => navigate('/join')}><span>방 코드로 참가</span><b>⌁</b></Button></Card><p className="footnote">게임은 사람끼리, 진행은 누피가.</p></Page>
}
