import { useNavigate } from 'react-router-dom'
import { resetGame } from '../../firebase/db'
import { useGameState } from '../../hooks/useGameState'
import Avatar from '../shared/Avatar'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const { players, playerOrder, isHost } = useGameState(room, uid)

  const sorted = [...playerOrder]
    .filter((id) => players[id])
    .sort((a, b) => (players[b].score ?? 0) - (players[a].score ?? 0))

  const winner = sorted[0]

  async function handlePlayAgain() {
    await resetGame(roomCode, playerOrder, players)
  }

  function handleLeave() {
    navigate('/')
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Game Over!</h1>

      {winner && players[winner] && (
        <div className={styles.winnerCard}>
          <Avatar avatarId={players[winner].avatarId} size={72} />
          <p className={styles.winnerName}>{players[winner].username}</p>
          <p className={styles.winnerScore}>{players[winner].score} pts</p>
          <span className={styles.crown}>👑 Winner</span>
        </div>
      )}

      <div className={styles.leaderboard}>
        {sorted.map((id, i) => {
          const player = players[id]
          const isMe = id === uid
          return (
            <div key={id} className={[styles.row, i === 0 ? styles.first : ''].join(' ')}>
              <span className={styles.rank}>{medals[i] ?? `${i + 1}.`}</span>
              <Avatar avatarId={player.avatarId} size={32} />
              <span className={styles.name}>
                {player.username}
                {isMe && <span className={styles.you}> (you)</span>}
              </span>
              <span className={styles.score}>{player.score ?? 0} pts</span>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        {isHost && (
          <button className={styles.playAgainBtn} onClick={handlePlayAgain}>
            Play Again
          </button>
        )}
        <button className={styles.leaveBtn} onClick={handleLeave}>
          Leave Room
        </button>
      </div>
    </div>
  )
}
