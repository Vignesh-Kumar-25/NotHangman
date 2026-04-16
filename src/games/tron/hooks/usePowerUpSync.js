import { useEffect } from 'react'
import { ref, onChildAdded, off } from 'firebase/database'
import { db } from '@/firebase/config'

export function usePowerUpSync(roomCode, uid, engineRef, isPlaying) {
  useEffect(() => {
    if (!isPlaying || !roomCode) return

    const puRef = ref(db, `rooms/${roomCode}/game/powerUps`)

    const handler = onChildAdded(puRef, (snap) => {
      const data = snap.val()
      if (!data || !data.claimedBy) return
      // If someone else claimed a power-up, we could sync it
      // For now, deterministic RNG handles spawns so we don't need to sync spawns
      // Only claims need syncing, and the engine handles pickup locally
    })

    return () => {
      off(puRef, 'child_added', handler)
    }
  }, [roomCode, uid, engineRef, isPlaying])
}
