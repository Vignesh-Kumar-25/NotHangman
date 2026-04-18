import styles from './LastWordDisplay.module.css'

export default function LastWordDisplay({ lastWord, players }) {
  if (!lastWord) {
    return (
      <div className={styles.display}>
        <span className={styles.empty}>Drag letters to form a word</span>
      </div>
    )
  }

  const playerName = players[lastWord.playerUid]?.username || 'Unknown'

  return (
    <div className={styles.display}>
      <span className={styles.word}>{lastWord.word}</span>
      <span className={styles.score}>+{lastWord.score}</span>
      <span className={styles.player}>by {playerName}</span>
    </div>
  )
}
