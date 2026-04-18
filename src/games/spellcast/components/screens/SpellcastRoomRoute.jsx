import { useEffect, useRef } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useRoom } from '@/hooks/useRoom'
import { reconnectPlayer } from '../../db'
import { GAME_STATES } from '../../constants/gameStates'
import LobbyScreen from './LobbyScreen'
import GameScreen from './GameScreen'
import GameOverScreen from './GameOverScreen'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import styles from './SpellcastRoomRoute.module.css'

export default function SpellcastRoomRoute({ uid }) {
  const { roomCode } = useParams()
  const { room, loading, notFound } = useRoom(roomCode)
  const reconnectedRef = useRef(false)

  useEffect(() => {
    if (!room || !uid || reconnectedRef.current) return
    const player = room.players?.[uid]
    if (player && player.connected === false && !player.kicked) {
      reconnectedRef.current = true
      reconnectPlayer(roomCode, uid).catch(console.error)
    } else if (player && player.connected) {
      reconnectedRef.current = true
    }
  }, [room, uid, roomCode])

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

  if (room?.players?.[uid]?.kicked) {
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
