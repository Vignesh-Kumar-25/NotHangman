import { useState, useEffect, useRef } from 'react'
import Avatar from '@/components/shared/Avatar'
import styles from './PlayerPanel.module.css'

export default function PlayerPanel({
  players,
  playerOrder,
  currentPlayerUid,
  eliminated,
  uid,
  turnStartedAt,
  turnTimeLimit,
  roundWins,
}) {
  const wins = roundWins || {}
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Players</h3>
        {turnTimeLimit > 0 && turnStartedAt && (
          <TurnTimer startedAt={turnStartedAt} limit={turnTimeLimit} />
        )}
      </div>
      <div className={styles.list}>
        {playerOrder.map((id) => {
          const player = players[id]
          if (!player) return null
          const isEliminated = !!eliminated[id]
          const isCurrent = id === currentPlayerUid && !isEliminated
          const isMe = id === uid
          const disconnected = player.connected === false

          return (
            <div
              key={id}
              className={[
                styles.player,
                isCurrent ? styles.current : '',
                isEliminated ? styles.eliminated : '',
                disconnected ? styles.disconnected : '',
              ].join(' ')}
            >
              <div className={styles.avatarWrap}>
                <Avatar avatarId={player.avatarId} size={28} />
                {isEliminated && <span className={styles.skull}>&#128128;</span>}
              </div>
              <span className={styles.name}>
                {player.username}
                {isMe && <span className={styles.youTag}> (you)</span>}
              </span>
              {wins[id] > 0 && <span className={styles.winsTag}>{wins[id]}W</span>}
              {isCurrent && <span className={styles.turnDot} />}
              {isEliminated && <span className={styles.elimTag}>OUT</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TurnTimer({ startedAt, limit }) {
  const [remaining, setRemaining] = useState(limit)
  const intervalRef = useRef(null)

  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, Math.ceil(limit - elapsed))
      setRemaining(left)
    }
    tick()
    intervalRef.current = setInterval(tick, 250)
    return () => clearInterval(intervalRef.current)
  }, [startedAt, limit])

  const urgent = remaining <= 5

  return (
    <span className={`${styles.timer} ${urgent ? styles.timerUrgent : ''}`}>
      {remaining}s
    </span>
  )
}
