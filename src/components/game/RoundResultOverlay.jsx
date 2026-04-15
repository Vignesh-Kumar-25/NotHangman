import Avatar from '../shared/Avatar'
import styles from './RoundResultOverlay.module.css'

export default function RoundResultOverlay({ game, players }) {
  const solver = game.solverUid ? players[game.solverUid] : null
  const word = game.word || ''

  return (
    <div className={styles.backdrop}>
      <div className={styles.card + ' overlay-in'}>
        <p className={styles.solved}>Round Solved!</p>
        <p className={styles.word}>{word}</p>
        {solver && (
          <div className={styles.winner}>
            <Avatar avatarId={solver.avatarId} size={48} />
            <div>
              <p className={styles.winnerName}>{solver.username}</p>
              <p className={styles.winnerPts}>+bonus 100 pts</p>
            </div>
          </div>
        )}
        <p className={styles.next}>Next round starting soon…</p>
      </div>
    </div>
  )
}
