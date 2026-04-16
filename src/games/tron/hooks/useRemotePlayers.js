import { useEffect, useRef } from 'react'
import { ref, onChildAdded, off, query, orderByKey } from 'firebase/database'
import { db } from '@/firebase/config'

export function useRemotePlayers(roomCode, uid, engineRef, isPlaying) {
  const seenKeysRef = useRef(new Set())

  useEffect(() => {
    if (!isPlaying || !roomCode) return

    seenKeysRef.current.clear()
    const inputsRef = query(
      ref(db, `rooms/${roomCode}/game/inputs`),
      orderByKey()
    )

    const handler = onChildAdded(inputsRef, (snap) => {
      const key = snap.key
      if (seenKeysRef.current.has(key)) return
      seenKeysRef.current.add(key)

      const data = snap.val()
      if (!data || data.uid === uid) return  // skip own inputs

      const engine = engineRef?.current
      if (!engine) return

      engine.applyRemoteInput(data.uid, data.direction, data.x, data.y)
    })

    return () => {
      off(inputsRef, 'child_added', handler)
    }
  }, [roomCode, uid, engineRef, isPlaying])
}
