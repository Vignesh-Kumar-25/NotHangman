import styles from './LetterGrid.module.css'

const ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  'ZXCVBNM'.split(''),
]

export default function LetterGrid({ guessedLetters = {}, onGuess, disabled = false }) {
  return (
    <div className={styles.keyboard} role="group" aria-label="Letter buttons">
      {ROWS.map((row, ri) => (
        <div key={ri} className={styles.row}>
          {row.map((letter) => {
            const state = guessedLetters[letter]
            const isCorrect = state === true
            const isWrong = state === false
            const isGuessed = state !== undefined

            return (
              <button
                key={letter}
                className={[
                  styles.btn,
                  isCorrect ? styles.correct : '',
                  isWrong   ? styles.wrong   : '',
                  isGuessed ? styles.guessed : '',
                ].join(' ')}
                onClick={() => onGuess(letter)}
                disabled={disabled || isGuessed}
                aria-label={`Guess letter ${letter}`}
              >
                {letter}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
