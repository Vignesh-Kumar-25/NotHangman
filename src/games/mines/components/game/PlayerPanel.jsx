import Avatar from '@/components/shared/Avatar'
import styles from './PlayerPanel.module.css'

export default function PlayerPanel({
  players,
  playerOrder,
  currentPlayerUid,
  eliminated,
  uid,
  roundWins,
}) {
  const wins = roundWins || {}
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Players</h3>
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
