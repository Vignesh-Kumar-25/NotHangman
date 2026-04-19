import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import { playGameOver, stopBgMusic } from '@/utils/soundManager'
import { leaveRoom, returnToLobby } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const soundPlayedRef = useRef(false)
  const { players, playerOrder, isHost, me } = useGameState(room, uid)

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
  const winnerId = sorted[0]
  const winner = winnerId ? players[winnerId] : null

  const medals = ['🥇', '🥈', '🥉']

  async function handleLeave() {
    await leaveRoom(roomCode, uid)
    navigate('/spellcast')
  }

  async function handleReturnToLobby() {
    await returnToLobby(roomCode)
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Game Over!</h1>

      {winner && (
        <div className={styles.winnerCard}>
          <Avatar avatarId={winner.avatarId} size={72} />
          <p className={styles.winnerName}>{winner.username}</p>
          <p className={styles.winnerScore}>{winner.score ?? 0} pts</p>
          <span className={styles.crown}>👑 Winner</span>
        </div>
      )}

      <div className={styles.leaderboard}>
        {sorted.map((playerId, index) => {
          const player = players[playerId]
          if (!player) return null
          const isMe = playerId === uid

          return (
            <div key={playerId} className={[styles.row, index === 0 ? styles.first : ''].join(' ')}>
              <span className={styles.rank}>{medals[index] ?? `${index + 1}.`}</span>
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
          <button className={styles.playAgainBtn} onClick={handleReturnToLobby} type="button">
            Return To Lobby
          </button>
        )}
        {!isHost && <p className={styles.waitMsg}>Waiting for host...</p>}
        <button className={styles.leaveBtn} onClick={handleLeave} type="button">
          Leave Room
        </button>
      </div>

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}
