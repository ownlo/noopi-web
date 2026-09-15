import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { YutPiece } from '../../../api/types'

type Point = { id: string; x: number; y: number }
const hopMs = 170

// Draw intermediate positions on the displayed outer track only after the server
// confirms a move. Unknown routes are never guessed from coordinates.
export function useYutStepAnimation(board: RefObject<HTMLDivElement | null>, pieces: YutPiece[], nodes: Point[]) {
  const previous = useRef(pieces)
  const previousFaces = useRef(new Map<string, HTMLElement>())
  useLayoutEffect(() => {
    const before = previous.current
    previous.current = pieces
    const element = board.current
    if (!element) return
    const oldFaces = previousFaces.current
    const faces = new Map<string, HTMLElement>()
    element.querySelectorAll<HTMLElement>('[data-piece-id]').forEach(face => {
      const piece = pieces.find(item => item.pieceId === face.dataset.pieceId)
      piece?.groupPieceIds.forEach(id => faces.set(id, face.cloneNode(true) as HTMLElement))
    })
    previousFaces.current = faces
    element.style.setProperty('--capture-delay', '0ms')
    if (before === pieces || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animations: Animation[] = []
    const ghosts: HTMLElement[] = []
    const renderedGroups = new Set<string>()
    for (const piece of pieces) {
      const old = before.find(item => item.pieceId === piece.pieceId)
      if (!old || old.nodeId === piece.nodeId || piece.status === 'READY') continue
      const from = old.status === 'READY' ? -1 : nodes.findIndex(node => node.id === old.nodeId)
      const to = piece.status === 'FINISHED' ? nodes.length - 1 : nodes.findIndex(node => node.id === piece.nodeId)
      if ((old.status !== 'READY' && from < 0) || to < 0 || to <= from) continue
      const groupKey = [...piece.groupPieceIds].sort().join(',')
      if (renderedGroups.has(groupKey)) continue
      renderedGroups.add(groupKey)
      let target = Array.from(element.querySelectorAll<HTMLElement>('[data-piece-id]')).find(item => piece.groupPieceIds.includes(item.dataset.pieceId ?? ''))
      if (!target && piece.status === 'FINISHED') {
        target = oldFaces.get(piece.pieceId)
        if (target) {
          target.removeAttribute('data-piece-id')
          target.setAttribute('aria-hidden', 'true')
          target.setAttribute('tabindex', '-1')
          target.className = 'yutBoardPiece'
          target.style.pointerEvents = 'none'
          target.style.left = `${nodes[to].x}%`
          target.style.top = `${nodes[to].y}%`
          element.append(target)
          ghosts.push(target)
        }
      }
      if (!target) continue
      const end = nodes[to]
      const path = [from < 0 ? nodes[nodes.length - 1] : nodes[from], ...nodes.slice(from + 1, to + 1)]
      const frames: Keyframe[] = []
      const steps = path.length - 1
      const translate = (x: number, y: number, lift = 0) => `${(x - end.x) * element.clientWidth / 100}px ${(y - end.y) * element.clientHeight / 100 - lift}px`
      path.forEach((point, index) => {
        frames.push({ translate: translate(point.x, point.y), offset: index / steps, easing: 'ease-out' })
        const next = path[index + 1]
        if (next) frames.push({ translate: translate((point.x + next.x) / 2, (point.y + next.y) / 2, 10), offset: (index + .5) / steps, easing: 'ease-in' })
      })
      const duration = Math.min(steps * hopMs, 1200)
      element.style.setProperty('--capture-delay', `${duration}ms`)
      const animation = target.animate(frames, { duration, easing: 'linear' })
      if (piece.status === 'FINISHED') {
        const ghost = target
        animation.onfinish = () => ghost.remove()
      }
      animations.push(animation)
    }
    return () => { animations.forEach(animation => animation.cancel()); ghosts.forEach(ghost => ghost.remove()) }
  }, [board, pieces, nodes])
}
