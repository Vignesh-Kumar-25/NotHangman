import { useState, useEffect, useRef } from 'react'
import { TURN_DURATION } from '../constants/gameConfig'

export function useTimer(turnStartTime, serverTimeOffset = 0) {
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!turnStartTime) {
      setTimeLeft(TURN_DURATION)
      return
    }

    function tick() {
      const serverNow = Date.now() + serverTimeOffset
      const elapsed = serverNow - turnStartTime
      const remaining = Math.max(0, TURN_DURATION * 1000 - elapsed)
      setTimeLeft(Math.ceil(remaining / 1000))
    }

    tick() // immediate first tick
    intervalRef.current = setInterval(tick, 250)

    return () => clearInterval(intervalRef.current)
  }, [turnStartTime, serverTimeOffset])

  return timeLeft
}
