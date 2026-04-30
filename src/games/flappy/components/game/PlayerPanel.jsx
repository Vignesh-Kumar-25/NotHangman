import Avatar from '@/components/shared/Avatar'
import styles from './PlayerPanel.module.css'

export default function PlayerPanel({ players, playerOrder, runs, uid }) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Flight Board</h3>
      <div className={styles.list}>
        {playerOrder.map((id) => {
          const player = players[id]
          if (!player) return null
          const run = runs[id] || {}
          const alive = run.alive !== false
          return (
            <div key={id} className={`${styles.row} ${alive ? styles.alive : styles.out}`}>
              <Avatar avatarId={player.avatarId} size={30} />
              <span className={styles.name}>
                {player.username}
                {id === uid && <span className={styles.you}>You</span>}
              </span>
              <span className={styles.score}>{run.score || 0}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
