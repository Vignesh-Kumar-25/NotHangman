import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase/config'

// Reads Firebase server time offset once; returns it for clock-skew correction
export function useServerTimeOffset() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset')
    const unsub = onValue(offsetRef, (snap) => {
      setOffset(snap.val() ?? 0)
    })
    return unsub
  }, [])

  return offset
}
