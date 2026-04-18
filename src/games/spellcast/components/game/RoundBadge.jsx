import styles from './RoundBadge.module.css'

export default function RoundBadge({ round, numRounds }) {
  return (
    <span className={styles.badge}>
      Round {round} / {numRounds}
    </span>
  )
}
