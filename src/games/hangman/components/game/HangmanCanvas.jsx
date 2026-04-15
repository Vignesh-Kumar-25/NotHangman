import styles from './HangmanCanvas.module.css'

// wrongGuessCount goes 0–6; each part appears in order:
// 1=head, 2=body, 3=left arm, 4=right arm, 5=left leg, 6=right leg
export default function HangmanCanvas({ wrongGuessCount = 0 }) {
  const n = wrongGuessCount

  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 200 220" className={styles.svg} aria-label={`${n} wrong guesses`}>
        {/* Gallows — always visible */}
        {/* Base */}
        <line x1="20" y1="210" x2="180" y2="210" stroke="var(--hangman-stroke)" strokeWidth="4" strokeLinecap="round" />
        {/* Vertical pole */}
        <line x1="60" y1="210" x2="60" y2="20" stroke="var(--hangman-stroke)" strokeWidth="4" strokeLinecap="round" />
        {/* Horizontal beam */}
        <line x1="60" y1="20" x2="130" y2="20" stroke="var(--hangman-stroke)" strokeWidth="4" strokeLinecap="round" />
        {/* Rope */}
        <line x1="130" y1="20" x2="130" y2="50" stroke="var(--hangman-stroke)" strokeWidth="3" strokeLinecap="round" />

        {/* Head */}
        {n >= 1 && (
          <circle
            cx="130" cy="68" r="18"
            stroke="var(--accent-danger)" strokeWidth="3.5" fill="none"
            className={`${styles.part} ${styles.drawn}`}
          />
        )}

        {/* Body */}
        {n >= 2 && (
          <line x1="130" y1="86" x2="130" y2="145"
            stroke="var(--accent-danger)" strokeWidth="3.5" strokeLinecap="round"
            className={`${styles.part} ${styles.drawn}`}
          />
        )}

        {/* Left arm */}
        {n >= 3 && (
          <line x1="130" y1="100" x2="105" y2="125"
            stroke="var(--accent-danger)" strokeWidth="3.5" strokeLinecap="round"
            className={`${styles.part} ${styles.drawn}`}
          />
        )}

        {/* Right arm */}
        {n >= 4 && (
          <line x1="130" y1="100" x2="155" y2="125"
            stroke="var(--accent-danger)" strokeWidth="3.5" strokeLinecap="round"
            className={`${styles.part} ${styles.drawn}`}
          />
        )}

        {/* Left leg */}
        {n >= 5 && (
          <line x1="130" y1="145" x2="105" y2="175"
            stroke="var(--accent-danger)" strokeWidth="3.5" strokeLinecap="round"
            className={`${styles.part} ${styles.drawn}`}
          />
        )}

        {/* Right leg */}
        {n >= 6 && (
          <line x1="130" y1="145" x2="155" y2="175"
            stroke="var(--accent-danger)" strokeWidth="3.5" strokeLinecap="round"
            className={`${styles.part} ${styles.drawn}`}
          />
        )}

        {/* X eyes when fully drawn */}
        {n >= 6 && (
          <>
            <line x1="124" y1="62" x2="128" y2="66" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round" />
            <line x1="128" y1="62" x2="124" y2="66" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round" />
            <line x1="132" y1="62" x2="136" y2="66" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round" />
            <line x1="136" y1="62" x2="132" y2="66" stroke="var(--accent-danger)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  )
}
