import { useState, useEffect, useRef } from 'react'
import { COUNTDOWN_DURATION } from '../constants/gameConfig'

export function useCountdown(isActive) {
  const [count, setCount] = useState(COUNTDOWN_DURATION)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!isActive) {
      setCount(COUNTDOWN_DURATION)
      return
    }

    setCount(COUNTDOWN_DURATION)
    intervalRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isActive])

  return count
}
