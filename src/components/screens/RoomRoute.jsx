import { useParams, Navigate } from 'react-router-dom'
import { useRoom } from '../../hooks/useRoom'
import { GAME_STATES } from '../../constants/gameStates'
import LobbyScreen from './LobbyScreen'
import GameScreen from './GameScreen'
import GameOverScreen from './GameOverScreen'
import LoadingSpinner from '../shared/LoadingSpinner'
import styles from './RoomRoute.module.css'

export default function RoomRoute({ uid }) {
  const { roomCode } = useParams()
  const { room, loading, notFound } = useRoom(roomCode)

  if (loading) {
    return (
      <div className={styles.center}>
        <LoadingSpinner />
      </div>
    )
  }

  if (notFound) {
    return <Navigate to="/" replace />
  }

  const gameState = room?.game?.state
  const status = room?.meta?.status

  if (status === 'lobby' || gameState === GAME_STATES.LOBBY) {
    return <LobbyScreen room={room} roomCode={roomCode} uid={uid} />
  }

  if (status === 'finished' || gameState === GAME_STATES.GAME_OVER) {
    return <GameOverScreen room={room} roomCode={roomCode} uid={uid} />
  }

  return <GameScreen room={room} roomCode={roomCode} uid={uid} />
}
