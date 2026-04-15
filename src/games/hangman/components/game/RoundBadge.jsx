import styles from './RoundBadge.module.css'

// round = current word number (1-based), numRounds = full rounds configured by host,
// playerCount = number of players (each full round = playerCount turns)
export default function RoundBadge({ round, numRounds, playerCount }) {
  const displayRound = Math.ceil(round / Math.max(1, playerCount))
  return (
    <div className={styles.badge}>
      Round <strong>{displayRound}</strong> / {numRounds ?? '?'}
    </div>
  )
}
