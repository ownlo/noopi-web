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
  const [copied, setCopied] = useState(false)

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(state.room.roomCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <>
      <div className="invite">
        <p>방 코드</p>
        <button onClick={() => void copyRoomCode()} aria-label={'방 코드 ' + state.room.roomCode + ' 복사'}>
          {state.room.roomCode}
        </button>
        <small aria-live="polite">{copied ? '복사됐어요!' : '코드를 눌러 복사하세요'}</small>
      </div>
      <CharacterStage compact />
      <PlayerList state={state} />
      {state.me.host
        ? <Button onClick={onSelect}>게임 선택하기 <span>→</span></Button>
        : <SpinnerText>방장이 게임을 고르는 중이에요</SpinnerText>}
    </>
  )
}
