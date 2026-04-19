import styles from './WordFeed.module.css'

export default function WordFeed({ foundWords, players }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Recent Spells</h2>
      {foundWords.length === 0 ? (
        <p className={styles.empty}>No words cast yet. Drag across the board to start the round.</p>
      ) : (
        <div className={styles.list}>
          {foundWords.slice(0, 10).map((entry) => (
            <div key={`${entry.word}-${entry.createdAt}`} className={styles.item}>
              <div>
                <div className={styles.word}>{entry.word.toUpperCase()}</div>
                <div className={styles.meta}>{players[entry.uid]?.username || 'Unknown mage'}</div>
              </div>
              <div className={styles.points}>+{entry.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
