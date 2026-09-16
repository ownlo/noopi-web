// Stable IDs shared with the server spec. Only used to draw confirmed movement;
// never used to choose legal actions, captures, destinations, or winners.
export const outerNodes = Array.from({ length: 20 }, (_, index) => {
  const side = Math.floor(index / 5)
  const step = (index % 5 + 1) * 15.2
  const [x, y] = side === 0 ? [88, 88 - step] : side === 1 ? [88 - step, 12] : side === 2 ? [12, 12 + step] : [12 + step, 88]
  return { id: `OUTER_${index + 1}`, x, y, corner: (index + 1) % 5 === 0 }
})
const diagonal = (id: number, step: number, fromRight: boolean) => ({
  id: `CENTER_${id}`, x: fromRight ? 88 - step * 76 / 6 : 12 + step * 76 / 6,
  y: 12 + step * 76 / 6, corner: false,
})
export const boardNodes = [...outerNodes,
  diagonal(1, 1, true), diagonal(2, 2, true), diagonal(3, 3, true),
  diagonal(4, 4, true), diagonal(5, 5, true),
  diagonal(6, 1, false), diagonal(7, 2, false), diagonal(8, 4, false), diagonal(9, 5, false),
]
export const pathLabels: Record<string, string> = {
  OUTER: '바깥길로 가요', CENTER_SHORTCUT_A: '왼쪽 아래로 가요',
  CENTER_SHORTCUT_B: '지름길로 가요', CENTER_SHORTCUT_HOME: '도착점으로 가요',
}
const tracks = [
  ['START', ...outerNodes.map(node => node.id), 'FINISH'],
  ['OUTER_5', 'CENTER_1', 'CENTER_2', 'CENTER_3', 'CENTER_4', 'CENTER_5', 'OUTER_15'],
  ['OUTER_10', 'CENTER_6', 'CENTER_7', 'CENTER_3', 'CENTER_8', 'CENTER_9', 'OUTER_20'],
]

export function confirmedMovePoints(from: string | null, to: string | null) {
  const start = from ?? 'START'
  const end = to ?? 'FINISH'
  if (start === 'OUTER_1' && end === 'OUTER_20') {
    return ['OUTER_1', 'OUTER_20'].map(id => boardNodes.find(node => node.id === id)!)
  }
  // At most five hops between confirmed endpoints. Ambiguous/unknown movement is
  // shown at the server destination rather than guessed or used as game state.
  function find(direction: 1 | -1) {
    let paths = [[start]]
    for (let depth = 0; depth < 5; depth++) {
      paths = paths.flatMap(path => {
      const last = path.at(-1)
      return [...new Set(tracks.flatMap(track => {
        const index = track.indexOf(last ?? '')
        const nextIndex = index + direction
        return index >= 0 && nextIndex >= 0 && nextIndex < track.length ? [track[nextIndex]] : []
      }))].filter(node => !path.includes(node)).map(node => [...path, node])
      })
      const matches = paths.filter(path => path.at(-1) === end)
      if (matches.length > 1) return []
      if (matches.length === 1) return matches[0].map(id =>
        boardNodes.find(node => node.id === (id === 'START' || id === 'FINISH' ? 'OUTER_20' : id))!)
    }
    return []
  }
  const forward = find(1)
  return forward.length > 0 ? forward : find(-1)
}
