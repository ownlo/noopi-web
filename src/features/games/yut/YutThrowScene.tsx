import type { CSSProperties } from 'react'
import type { YutResultCode } from '../../../api/types'
import './yut-throw.css'

const names = { DO: '도', GAE: '개', GEOL: '걸', YUT: '윷', MO: '모' }
// Illustrative faces express the confirmed result; the API does not provide individual stick faces.
const flatFaces = { DO: 1, GAE: 2, GEOL: 3, YUT: 4, MO: 0 }
export function YutThrowScene({ result, active, animationId }: { result?: YutResultCode; active: boolean; animationId: number }) {
  return <div className={`yutThrowScene ${active ? 'isTossing' : ''}`} aria-hidden="true">
    <div className="yutThrowMat" />
    <div className="yutFlyingSet" key={animationId}>
      {[0, 1, 2, 3].map(index => <div className="yutFlyingLane" key={index} style={{ '--i': index, '--angle': `${[-28, 21, -12, 38][index]}deg`, '--land-x': `${[-66, -21, 24, 65][index]}px`, '--land-y': `${[3, -13, 9, -3][index]}px` } as CSSProperties}>
        <span className="yutGroundShadow" />
        <div className="yutWoodStick"><span className={`yutWoodFace ${result && index >= flatFaces[result] ? 'round' : ''}`}><i>×</i><i>×</i><i>×</i></span><span className="yutWoodBack" /></div>
      </div>)}
      <div className="yutImpactRing" /><span className="yutSpark s1">✦</span><span className="yutSpark s2">✧</span><span className="yutSpark s3">✦</span>
    </div>
    <div className="yutSceneResult">{result ? <><strong>{names[result]}!</strong><span>{result === 'YUT' || result === 'MO' ? '한 번 더!' : '좋아, 가보자!'}</span></> : null}</div>
  </div>
}


