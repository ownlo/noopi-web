import { useState } from 'react'
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

  const copyInvite = async (kind: 'code' | 'link') => {
    const value = kind === 'code'
      ? state.room.roomCode
      : `${window.location.origin}/join?code=${encodeURIComponent(state.room.roomCode)}`
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
        <button className="inviteLink" onClick={() => void copyInvite('link')}>🔗 초대 링크 복사</button>
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
    </>
  )
}
