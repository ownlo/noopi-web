import './yut-board.css'

function Paw({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 40 40"><ellipse cx="20" cy="27" rx="11" ry="8" /><ellipse cx="8" cy="17" rx="4" ry="5" transform="rotate(-25 8 17)" /><ellipse cx="16" cy="10" rx="4" ry="5" /><ellipse cx="26" cy="11" rx="4" ry="5" /><ellipse cx="33" cy="19" rx="4" ry="5" transform="rotate(25 33 19)" /></svg>
}

export function YutBoardDecorations() {
  return <div className="yutBoardDecorations" aria-hidden="true">
    <Paw className="yutBoardPaw left" /><Paw className="yutBoardPaw right" />
    <span className="yutBoardTwinkle t1">✧</span><span className="yutBoardTwinkle t2">✦</span>
    <span className="yutBoardTwinkle t3">✧</span><span className="yutBoardTwinkle t4">✦</span>
    <span className="yutBoardMoon">☾</span>
    <span className="yutBoardStitch top" /><span className="yutBoardStitch bottom" />
  </div>
}

