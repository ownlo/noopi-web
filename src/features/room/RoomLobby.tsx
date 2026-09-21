import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Player, RoomState } from '../../api/types'
import { Avatar, Button, Card, CharacterStage, SpinnerText } from '../../components/ui'

export function PlayerList({ state, kickPending, onKick }: { state: RoomState; kickPending: boolean; onKick: (player: Player) => void }) {
  return (
    <Card className="playerCard">
      <div className="sectionHead"><strong>플레이어</strong><span>{state.players.length}명</span></div>
      <div className="players">
        {state.players.map(player => (
          <div className="player" key={player.playerId}>
            <Avatar name={player.nickname} gender={player.gender} />
            <span className="playerIdentity">
              <b>{player.nickname}</b>
              {player.playerId === state.me.playerId && <small>나</small>}
              {state.me.host && !player.host && player.playerId !== state.me.playerId && (
                <button type="button" className="kickPlayerIcon" disabled={kickPending} onClick={() => onKick(player)} aria-label={`${player.nickname}님 내보내기`} title="내보내기">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10M9 12h10M15 8l4 4-4 4" />
                  </svg>
                </button>
              )}
            </span>
            {player.host && <i>👑 방장</i>}
            {player.connectionStatus === 'DISCONNECTED' && <em>연결 끊김</em>}
            <span className={`online ${player.connectionStatus.toLowerCase()}`} />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RoomLobby({ state, kickPending, onSelect, onKick }: { state: RoomState; kickPending: boolean; onSelect: () => void; onKick: (playerId: number) => void }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'code' | 'link' | 'error'>('idle')
  const [showQrCode, setShowQrCode] = useState(false)
  const [kickTarget, setKickTarget] = useState<Player | null>(null)
  const inviteUrl = `${window.location.origin}/join?code=${encodeURIComponent(state.room.roomCode)}`

  useEffect(() => {
    if (!showQrCode) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowQrCode(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showQrCode])

  useEffect(() => {
    if (!kickTarget || kickPending) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setKickTarget(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [kickPending, kickTarget])

  const copyInvite = async (kind: 'code' | 'link') => {
    const value = kind === 'code'
      ? state.room.roomCode
      : inviteUrl
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(kind)
    } catch {
      setCopyStatus('error')
    }
    window.setTimeout(() => setCopyStatus('idle'), 1_500)
  }

  return (
    <>
      <div className="invite">
        <p>방 코드</p>
        <button className="inviteCode" onClick={() => void copyInvite('code')} aria-label={'방 코드 ' + state.room.roomCode + ' 복사'}>
          {state.room.roomCode}
        </button>
        <small>코드를 눌러 복사하세요</small>
        <div className="inviteActions">
          <button className="inviteLink" onClick={() => void copyInvite('link')}>🔗 초대 링크 복사</button>
          <button className="inviteQrButton" onClick={() => setShowQrCode(true)}>
            <QrIcon />
            QR 코드
          </button>
        </div>
        <small aria-live="polite">
          {copyStatus === 'code' && '방 코드가 복사됐어요!'}
          {copyStatus === 'link' && '초대 링크가 복사됐어요!'}
          {copyStatus === 'error' && '복사하지 못했어요. 다시 시도해주세요.'}
        </small>
      </div>
      <CharacterStage compact />
      <PlayerList state={state} kickPending={kickPending} onKick={setKickTarget} />
      {state.me.host
        ? <Button onClick={onSelect}>게임 선택하기</Button>
        : <SpinnerText>방장이 게임을 고르는 중이에요</SpinnerText>}
      {showQrCode && <QrCodeDialog roomCode={state.room.roomCode} inviteUrl={inviteUrl} onClose={() => setShowQrCode(false)} />}
      {kickTarget && <KickPlayerDialog player={kickTarget} pending={kickPending} onCancel={() => setKickTarget(null)} onConfirm={() => { onKick(kickTarget.playerId); setKickTarget(null) }} />}
    </>
  )
}

function KickPlayerDialog({ player, pending, onCancel, onConfirm }: { player: Player; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="dialogBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) onCancel() }}>
      <section className="leaveDialog" role="alertdialog" aria-modal="true" aria-labelledby="kick-dialog-title" aria-describedby="kick-dialog-description">
        <h2 id="kick-dialog-title">{player.nickname}님을 내보낼까요?</h2>
        <p id="kick-dialog-description">이 참가자는 방에서 즉시 퇴장하고<br />홈 화면으로 이동해요.</p>
        <div className="leaveDialogActions">
          <Button className="secondary" autoFocus disabled={pending} onClick={onCancel}>취소</Button>
          <Button className="danger" disabled={pending} onClick={onConfirm}>{pending ? '내보내는 중...' : '내보내기'}</Button>
        </div>
      </section>
    </div>
  )
}

function QrIcon() {
  return (
    <svg className="qrButtonIcon" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 3h7v7H3V3Zm2 2v3h3V5H5Zm9-2h7v7h-7V3Zm2 2v3h3V5h-3ZM3 14h7v7H3v-7Zm2 2v3h3v-3H5Zm9-2h3v3h-3v-3Zm4 0h3v3h-3v-3Zm-4 4h3v3h-3v-3Zm4 1h3v2h-3v-2Z" />
    </svg>
  )
}

function QrCodeDialog({ roomCode, inviteUrl, onClose }: { roomCode: string; inviteUrl: string; onClose: () => void }) {
  return (
    <div className="dialogBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="qrDialog" role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title" aria-describedby="qr-dialog-description">
        <h2 id="qr-dialog-title">QR로 바로 참가해요</h2>
        <p id="qr-dialog-description">카메라로 QR 코드를 스캔하면<br />닉네임 입력 화면으로 이동해요.</p>
        <div className="qrCodeFrame">
          <QRCodeSVG value={inviteUrl} size={220} level="M" title={`방 코드 ${roomCode} 참가 QR 코드`} />
        </div>
        <Button autoFocus onClick={onClose}>확인</Button>
      </section>
    </div>
  )
}
