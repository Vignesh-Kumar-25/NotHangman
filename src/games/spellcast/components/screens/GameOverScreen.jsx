import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetGame } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { playGameOver, stopBgMusic } from '@/utils/soundManager'
import Avatar from '@/components/shared/Avatar'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const { players, playerOrder, isHost, meta } = useGameState(room, uid)
  const soundPlayedRef = useRef(false)

  useEffect(() => {
    if (!soundPlayedRef.current) {
      stopBgMusic()
      playGameOver()
      soundPlayedRef.current = true
    }
  }, [])

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

  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Game Over!</h1>

      {winner && players[winner] && (
        <div className={styles.winnerCard}>
          <Avatar avatarId={players[winner].avatarId} size={72} />
          <p className={styles.winnerName}>{players[winner].username}</p>
          <p className={styles.winnerScore}>{players[winner].score} pts</p>
          <span className={styles.crown}>{'\uD83D\uDC51'} Winner</span>
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

      <p className={styles.gemNote}>Leftover gems were converted to points (1 gem = 1 pt)</p>

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
