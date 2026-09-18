import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { RoomState } from '../../api/types'
import { Avatar, Button, Card, CharacterStage, SpinnerText } from '../../components/ui'

export function PlayerList({ state }: { state: RoomState }) {
  return (
    <Card className="playerCard">
      <div className="sectionHead"><strong>플레이어</strong><span>{state.players.length}명</span></div>
      <div className="players">
        {state.players.map(player => (
          <div className="player" key={player.playerId}>
            <Avatar name={player.nickname} gender={player.gender} />
            <span><b>{player.nickname}</b>{player.playerId === state.me.playerId && <small> 나</small>}</span>
            {player.host && <i>👑 방장</i>}
            {player.connectionStatus === 'DISCONNECTED' && <em>연결 끊김</em>}
            <span className={`online ${player.connectionStatus.toLowerCase()}`} />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RoomLobby({ state, onSelect }: { state: RoomState; onSelect: () => void }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'code' | 'link' | 'error'>('idle')
  const [showQrCode, setShowQrCode] = useState(false)
  const inviteUrl = `${window.location.origin}/join?code=${encodeURIComponent(state.room.roomCode)}`

  useEffect(() => {
    if (!showQrCode) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowQrCode(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showQrCode])

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
      <PlayerList state={state} />
      {state.me.host
        ? <Button onClick={onSelect}>게임 선택하기</Button>
        : <SpinnerText>방장이 게임을 고르는 중이에요</SpinnerText>}
      {showQrCode && <QrCodeDialog roomCode={state.room.roomCode} inviteUrl={inviteUrl} onClose={() => setShowQrCode(false)} />}
    </>
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
