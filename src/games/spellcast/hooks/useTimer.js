import { useState, useEffect, useRef } from 'react'
import { TURN_DURATION } from '../constants/gameConfig'

export function useTimer(turnStartTime, serverTimeOffset = 0, turnDuration = TURN_DURATION) {
  const [timeLeft, setTimeLeft] = useState(turnDuration)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!turnStartTime) {
      setTimeLeft(turnDuration)
      return
    }

    function tick() {
      const serverNow = Date.now() + serverTimeOffset
      const elapsed = serverNow - turnStartTime
      const remaining = Math.max(0, turnDuration * 1000 - elapsed)
      setTimeLeft(Math.ceil(remaining / 1000))
    }

    tick()
    intervalRef.current = setInterval(tick, 250)

    return () => clearInterval(intervalRef.current)
  }, [turnStartTime, serverTimeOffset, turnDuration])

  return timeLeft
}
