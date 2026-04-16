import { useState, useEffect } from 'react'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'
import { POWERUP_DEFS } from '../../constants/powerUps'
import styles from './HUD.module.css'

export default function HUD({ game, meta, aliveCount, totalPlayers, engineRef, uid }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const serverTimeOffset = useServerTimeOffset()

  // Round timer
  useEffect(() => {
    if (!game?.roundStartTime || game.state !== 'playing') {
      setTimeLeft(null)
      return
    }

    const roundDuration = meta?.roundDuration || 90
    const interval = setInterval(() => {
      const serverNow = Date.now() + (serverTimeOffset || 0)
      const elapsed = (serverNow - game.roundStartTime) / 1000
      const remaining = Math.max(0, Math.ceil(roundDuration - elapsed))
      setTimeLeft(remaining)
    }, 250)

    return () => clearInterval(interval)
  }, [game?.roundStartTime, game?.state, meta?.roundDuration, serverTimeOffset])

  // Active power-up for local player
  const engine = engineRef?.current
  const localPlayer = engine?.players?.get(uid)
  const activePU = localPlayer?.activePowerUp
  const puDef = activePU ? POWERUP_DEFS[activePU] : null

  return (
    <div className={styles.hud}>
      <div className={styles.left}>
        <span className={styles.round}>Round {game?.round || 1} / {game?.totalRounds || 1}</span>
        <span className={styles.alive}>{aliveCount} / {totalPlayers} alive</span>
      </div>

      <div className={styles.center}>
        {timeLeft !== null && (
          <span className={[styles.timer, timeLeft <= 10 ? styles.timerLow : ''].join(' ')}>
            {timeLeft}s
          </span>
        )}
      </div>

      <div className={styles.right}>
        {puDef && (
          <span className={styles.powerUp} style={{ color: puDef.color }}>
            {puDef.symbol} {puDef.name}
          </span>
        )}
      </div>
    </div>
  )
}
