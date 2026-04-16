import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './HomeScreen.module.css'

const GAMES = [
  {
    id: 'hangman',
    name: 'Hangman',
    description: 'Guess the word letter by letter. Correct guess keeps your turn!',
    icon: '🔤',
    path: '/hangman',
    available: true,
  },
  {
    id: 'tron',
    name: 'Tron',
    description: 'Drive your light cycle and trap opponents in your trail!',
    icon: '🏍️',
    path: '/tron',
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
      </div>
    </div>
  )
}
