import type { CSSProperties } from 'react'
import type { YutResultCode } from '../../../api/types'
import noopiCharacter from '../../../assets/characters/noopi-cat.png'
import './yut-throw.css'

const names = { BACK_DO: '빽도', DO: '도', GAE: '개', GEOL: '걸', YUT: '윷', MO: '모' }
// Illustrative faces express the confirmed result; the API does not provide individual stick faces.
const flatFaceIndexes: Record<YutResultCode, number[]> = {
  BACK_DO: [0], DO: [1], GAE: [0, 1], GEOL: [0, 1, 2], YUT: [0, 1, 2, 3], MO: [],
}
export function YutThrowScene({ result, active, animationId, power = 0.5 }: { result?: YutResultCode; active: boolean; animationId: number; power?: number }) {
  // Power controls presentation only; the confirmed result always comes from the server.
  const strength = Math.max(0, Math.min(1, power))
  const style = {
    '--throw-height': `${-45 - strength * 115}px`,
    '--throw-fall': `${-30 - strength * 95}px`,
    '--throw-scale': 1.05 + strength * 0.3,
    '--throw-spin': `${strength >= 0.6 ? 360 : 0}deg`,
    '--throw-bounce': `${8 + strength * 22}px`,
    '--impact-scale': 1.2 + strength * 1.4,
    '--spark-rise': `${-14 - strength * 34}px`,
  } as CSSProperties
  return <div className={`yutThrowScene ${active ? 'isTossing' : ''}`} style={style} aria-hidden="true">
    <div className="yutThrowMat" />
    <div className="yutFlyingSet" key={animationId}>
      {[0, 1, 2, 3].map(index => <div className="yutFlyingLane" key={index} style={{ '--i': index, '--angle': `${[-28, 21, -12, 38][index]}deg`, '--land-x': `${[-66, -21, 24, 65][index]}px`, '--land-y': `${[3, -13, 9, -3][index]}px` } as CSSProperties}>
        <span className="yutGroundShadow" />
        <div className="yutWoodStick"><span className={`yutWoodFace ${result && !flatFaceIndexes[result].includes(index) ? 'round' : ''} ${index === 0 ? 'marked' : ''}`}>{index === 0 ? <img className="yutBackDoCharacter" src={noopiCharacter} alt="" /> : <><i>×</i><i>×</i><i>×</i></>}<b className="yutWoodLogo">NOOPI</b></span><span className="yutWoodBack"><b className="yutWoodLogo">NOOPI</b></span></div>
      </div>)}
      <div className="yutImpactRing" /><span className="yutSpark s1">✦</span><span className="yutSpark s2">✧</span><span className="yutSpark s3">✦</span>
    </div>
    <div className="yutSceneResult">{result ? <><strong>{names[result]}!</strong><span>{result === 'YUT' || result === 'MO' ? '한 번 더!' : result === 'BACK_DO' ? '한 칸 뒤로!' : '좋아, 가보자!'}</span></> : null}</div>
  </div>
}

