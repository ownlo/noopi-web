import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { YutPiece } from '../../../api/types'
import { confirmedMovePoints } from './yutBoardPresentation'

const hopMs = 170

// Only animate between confirmed server endpoints, including shortcut nodes.
export function useYutStepAnimation(board: RefObject<HTMLDivElement | null>, pieces: YutPiece[]) {
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
      const path = confirmedMovePoints(old.nodeId, piece.nodeId)
      const end = path.at(-1)
      if (!end || path.length < 2) continue
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
          target.style.left = `${end.x}%`
          target.style.top = `${end.y}%`
          element.append(target)
          ghosts.push(target)
        }
      }
      if (!target) continue
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
  }, [board, pieces])
}
