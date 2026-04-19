import Avatar from '@/components/shared/Avatar'
import styles from './ScorePanel.module.css'

export default function ScorePanel({ leaderboard, currentUid }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Mages</h2>
      {leaderboard.map((player) => (
        <div
          key={player.uid}
          className={[styles.row, currentUid === player.uid ? styles.active : ''].join(' ')}
        >
          <Avatar avatarId={player.avatarId} size={38} />
          <div className={styles.meta}>
            <span className={styles.name}>{player.username}</span>
            <span className={styles.sub}>{player.foundCount} words found</span>
          </div>
          <span className={styles.score}>{player.score}</span>
        </div>
      ))}
    </div>
  )
}

