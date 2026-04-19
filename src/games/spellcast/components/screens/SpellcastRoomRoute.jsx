import { Navigate, useParams } from 'react-router-dom'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useRoom } from '@/hooks/useRoom'
import { GAME_STATES } from '../../constants/gameConfig'
import GameOverScreen from './GameOverScreen'
import GameScreen from './GameScreen'
import LobbyScreen from './LobbyScreen'

export default function SpellcastRoomRoute({ uid }) {
  const { roomCode } = useParams()
  const { room, loading, notFound } = useRoom(roomCode)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  if (notFound) {
    return <Navigate to="/spellcast" replace />
  }

  const status = room?.meta?.status
  if (status === GAME_STATES.LOBBY || room?.game?.state === GAME_STATES.LOBBY) {
    return <LobbyScreen room={room} roomCode={roomCode} uid={uid} />
  }

  if (status === GAME_STATES.FINISHED || room?.game?.state === GAME_STATES.FINISHED) {
    return <GameOverScreen room={room} roomCode={roomCode} uid={uid} />
  }

  return <GameScreen room={room} roomCode={roomCode} uid={uid} />
}
