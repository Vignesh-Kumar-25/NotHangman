import { useParams, Navigate } from 'react-router-dom'
import { useRoom } from '@/hooks/useRoom'
import { GAME_STATES } from '../../constants/gameConfig'
import LobbyScreen from './LobbyScreen'
import GameScreen from './GameScreen'
import GameOverScreen from './GameOverScreen'
import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function FlappyRoomRoute({ uid }) {
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
    return <Navigate to="/flappy" replace />
  }

  const gameState = room?.game?.state
  const status = room?.meta?.status

  if (status === 'lobby' || gameState === GAME_STATES.LOBBY) {
    return <LobbyScreen room={room} roomCode={roomCode} uid={uid} />
  }

  if (status === 'finished' || gameState === GAME_STATES.FINISHED) {
    return <GameOverScreen room={room} roomCode={roomCode} uid={uid} />
  }

  return <GameScreen room={room} roomCode={roomCode} uid={uid} />
}
