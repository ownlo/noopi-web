import { useEffect, useRef, useState, type RefObject } from 'react'
import type { YutPiece } from '../../../api/types'

type CaptureAnimation = { captured: YutPiece[]; attackerIds: string[] }

// Compare confirmed snapshots only to animate an already-applied server change.
// These short-lived ghosts never determine piece positions, captures, or turns.
export function useYutCaptureAnimation(pieces: YutPiece[], board: RefObject<HTMLDivElement | null>) {
  const previous = useRef(pieces)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [animation, setAnimation] = useState<CaptureAnimation>({ captured: [], attackerIds: [] })
  useEffect(() => {
    const before = previous.current
    previous.current = pieces
    const returned = before.filter(piece => piece.status === 'ON_BOARD' && pieces.some(next => next.pieceId === piece.pieceId && next.status === 'READY'))
    const attackers = pieces.filter(piece => piece.status === 'ON_BOARD' && before.some(old => old.pieceId === piece.pieceId && old.nodeId !== piece.nodeId) && returned.some(old => old.nodeId === piece.nodeId && old.ownerId !== piece.ownerId))
    const captured = returned.filter((piece, index) => attackers.some(attacker => attacker.nodeId === piece.nodeId) && !returned.slice(0, index).some(other => other.groupPieceIds.includes(piece.pieceId)))
    if (captured.length === 0) return
    clearTimeout(timer.current)
    setAnimation({ captured, attackerIds: attackers.map(piece => piece.pieceId) })
    const movementDelay = Number.parseFloat(board.current?.style.getPropertyValue('--capture-delay') || '0')
    timer.current = setTimeout(() => setAnimation({ captured: [], attackerIds: [] }), movementDelay + 850)
  }, [pieces, board])
  useEffect(() => () => clearTimeout(timer.current), [])
  return animation
}
