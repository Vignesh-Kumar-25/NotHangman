import { useCallback, useRef } from 'react'
import { broadcastInput } from '../db'

export function useInputSync(roomCode, uid, engineRef) {
  const lastBroadcastRef = useRef(0)

  const handleLocalInput = useCallback((direction) => {
    const engine = engineRef?.current
    if (!engine || !engine.running) return

    const player = engine.players.get(uid)
    if (!player || !player.alive) return

    // Apply locally immediately
    engine.queueInput(uid, direction)

    // Throttle broadcasts to avoid flooding Firebase (min 50ms between)
    const now = Date.now()
    if (now - lastBroadcastRef.current < 50) return
    lastBroadcastRef.current = now

    // Broadcast to Firebase
    broadcastInput(roomCode, uid, direction, player.x, player.y, engine.tickNumber)
      .catch(console.error)
  }, [roomCode, uid, engineRef])

  return handleLocalInput
}
