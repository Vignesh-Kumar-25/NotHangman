import styles from './RoundResultOverlay.module.css'

export default function RoundResultOverlay({ game, players, playerOrder }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>Round {game.round} Complete!</h2>
        {playerOrder.map(uid => {
          const p = players[uid]
          if (!p) return null
          return (
            <div key={uid} className={styles.playerRow}>
              <span className={styles.playerName}>{p.username}</span>
              <span className={styles.playerScore}>{p.score ?? 0} pts</span>
            </div>
          )
        })}
        <p className={styles.hint}>Next round starting soon...</p>
      </div>
    </div>
  )
}
