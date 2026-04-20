import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useRoom } from '@/hooks/useRoom'
import { GAME_STATES } from '../../constants/gameConfig'
import { reconnectRoomPresence, subscribeToPresenceConnection } from '../../db'
import GameOverScreen from './GameOverScreen'
import GameScreen from './GameScreen'
import LobbyScreen from './LobbyScreen'

export default function SpellcastRoomRoute({ uid }) {
  const { roomCode } = useParams()
  const { room, loading, notFound } = useRoom(roomCode)
  const reconnectingRef = useRef(false)

  useEffect(() => {
    if (!roomCode || !uid) return undefined

    async function attemptReconnect() {
      if (reconnectingRef.current) return
      reconnectingRef.current = true
      try {
        await reconnectRoomPresence(roomCode, uid)
      } catch {
        // Ignore transient reconnect failures; the next connection/page event retries.
      } finally {
        reconnectingRef.current = false
      }
    }

    const unsubscribe = subscribeToPresenceConnection((isConnected) => {
      if (isConnected) {
        attemptReconnect()
      }
    })

    function handlePageResume() {
      if (document.visibilityState === 'hidden') return
      attemptReconnect()
    }

    window.addEventListener('focus', handlePageResume)
    window.addEventListener('pageshow', handlePageResume)
    document.addEventListener('visibilitychange', handlePageResume)

    return () => {
      unsubscribe()
      window.removeEventListener('focus', handlePageResume)
      window.removeEventListener('pageshow', handlePageResume)
      document.removeEventListener('visibilitychange', handlePageResume)
    }
  }, [roomCode, uid])

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
