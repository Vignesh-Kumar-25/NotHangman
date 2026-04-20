import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './HomeScreen.module.css'

const GAMES = [
  {
    id: 'hangman',
    name: 'Not Hangman',
    description: 'Guess the word letter by letter. Correct guess keeps your turn!',
    icon: '🔤',
    path: '/hangman',
    available: true,
  },
  {
    id: 'mines',
    name: 'Not Minesweeper',
    description: 'Take turns revealing tiles. Hit a bomb and you\'re out!',
    icon: '\uD83D\uDCA3',
    path: '/mines',
    available: true,
  },
  {
    id: 'chess',
    name: 'Not Chess',
    description: 'Strategic chess on a compact 5\u00d78 board. Checkmate to win!',
    icon: '\u265B',
    path: '/chess',
    available: true,
  },
  {
    id: 'spellcast',
    name: 'Not Spellcast',
    description: 'Trace adjacent runes to cast words on a board that keeps rewriting itself.',
    icon: '\u2728',
    path: '/spellcast',
    available: true,
  },
]

export default function HomeScreen() {
  const { authError } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      {authError && (
        <div className={styles.authError}>
          <strong>Firebase setup required</strong>
          <p>{authError}</p>
        </div>
      )}

      <div className={styles.hero}>
        <h1 className={styles.title}>Party<br />Games</h1>
        <p className={styles.subtitle}>
          Pick a game and play with friends online
        </p>
      </div>

      <div className={styles.grid}>
        {GAMES.map((game) => (
          <button
            key={game.id}
            className={[styles.card, !game.available ? styles.cardDisabled : ''].join(' ')}
            onClick={() => game.available && navigate(game.path)}
            disabled={!game.available}
          >
            <span className={styles.cardIcon}>{game.icon}</span>
            <h2 className={styles.cardName}>{game.name}</h2>
            <p className={styles.cardDesc}>{game.description}</p>
            {game.available && <span className={styles.cardAction}>Play</span>}
            {!game.available && <span className={styles.cardBadge}>Soon</span>}
          </button>
        ))}
        <div className={styles.comingSoon}>
          <span className={styles.comingSoonIcon}>🎮</span>
          <p className={styles.comingSoonText}>More games coming soon</p>
        </div>
      </div>
    </div>
  )
}
