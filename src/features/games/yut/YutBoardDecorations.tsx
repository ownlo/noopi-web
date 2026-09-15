import './yut-board.css'

function Paw({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 40 40"><ellipse cx="20" cy="27" rx="11" ry="8" /><ellipse cx="8" cy="17" rx="4" ry="5" transform="rotate(-25 8 17)" /><ellipse cx="16" cy="10" rx="4" ry="5" /><ellipse cx="26" cy="11" rx="4" ry="5" /><ellipse cx="33" cy="19" rx="4" ry="5" transform="rotate(25 33 19)" /></svg>
}

export function YutBoardDecorations() {
  return <div className="yutBoardDecorations" aria-hidden="true">
    <svg className="yutGrassTufts" viewBox="0 0 100 100" fill="none">
      {[[25, 24], [68, 22], [18, 64], [72, 68], [42, 78], [51, 16], [35, 57], [65, 43]].map(([x, y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><path d="M0 3Q-1 0-2-1M0 3Q0 0 1-3M0 3Q2 0 3 0" /></g>)}
    </svg>
    <Paw className="yutBoardPaw left" /><Paw className="yutBoardPaw right" />
    <span className="yutBoardTwinkle t1">✧</span><span className="yutBoardTwinkle t2">✦</span>
    <span className="yutBoardTwinkle t3">✧</span><span className="yutBoardTwinkle t4">✦</span>
    <span className="yutBoardMoon">☾</span>
  </div>
}
