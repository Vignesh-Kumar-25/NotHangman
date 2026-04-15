import styles from './LetterGrid.module.css'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function LetterGrid({ guessedLetters = {}, onGuess, disabled = false }) {
  return (
    <div className={styles.grid} role="group" aria-label="Letter buttons">
      {LETTERS.map((letter) => {
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
  )
}
