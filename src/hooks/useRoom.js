import { useState, useEffect } from 'react'
import { subscribeToRoom } from '../firebase/db'

export function useRoom(roomCode) {
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!roomCode) return
    setLoading(true)
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (!data) {
        setNotFound(true)
      } else {
        // Firebase RTDB may return a single-element array as {0: uid} — normalise it
        if (data.playerOrder && !Array.isArray(data.playerOrder)) {
          data.playerOrder = Object.values(data.playerOrder)
        }
        setRoom(data)
        setNotFound(false)
      }
      setLoading(false)
    })
    return unsub
  }, [roomCode])

  return { room, loading, notFound }
}
