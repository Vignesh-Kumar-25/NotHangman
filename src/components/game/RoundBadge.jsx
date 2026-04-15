import styles from './RoundBadge.module.css'

export default function RoundBadge({ round, totalRounds }) {
  return (
    <div className={styles.badge}>
      Round <strong>{round}</strong> / {totalRounds}
    </div>
  )
}
