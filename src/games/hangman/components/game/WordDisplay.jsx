import styles from './WordDisplay.module.css'

export default function WordDisplay({ maskedWord = [] }) {
  // Group letters into words (split on spaces) so whole words wrap together
  const words = []
  let current = []
  for (let i = 0; i < maskedWord.length; i++) {
    if (maskedWord[i].isSpace) {
      if (current.length > 0) words.push(current)
      current = []
    } else {
      current.push({ ...maskedWord[i], idx: i })
    }
  }
  if (current.length > 0) words.push(current)

  return (
    <div className={styles.row} aria-label="Word to guess">
      {words.map((word, wi) => (
        <span key={wi} className={styles.wordGroup}>
          {wi > 0 && <span className={styles.dash} aria-hidden="true">—</span>}
          <span className={styles.word}>
            {word.map((cell) => (
              <span
                key={cell.idx}
                className={[styles.cell, cell.revealed ? styles.revealed : styles.blank].join(' ')}
              >
                {cell.revealed ? cell.char : ''}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}
