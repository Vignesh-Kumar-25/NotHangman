import styles from './WordDisplay.module.css'

export default function WordDisplay({ maskedWord = [] }) {
  return (
    <div className={styles.row} aria-label="Word to guess">
      {maskedWord.map((cell, i) => {
        if (cell.isSpace) {
          return <span key={i} className={styles.space} aria-hidden="true" />
        }
        return (
          <span
            key={i}
            className={[styles.cell, cell.revealed ? styles.revealed : styles.blank].join(' ')}
          >
            {cell.revealed ? cell.char : ''}
          </span>
        )
      })}
    </div>
  )
}
