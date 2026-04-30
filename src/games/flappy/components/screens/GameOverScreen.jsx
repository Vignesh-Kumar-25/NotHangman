import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetGame, returnToLobby } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { sortRuns } from '../../utils/flappyLogic'
import { playGameOverVoice, stopPopMusic } from '../../utils/flappySounds'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const serverTimeOffset = useServerTimeOffset()
  const { game, players, playerOrder, meta, isHost, me, runs } = useGameState(room, uid)

  const standings = sortRuns(playerOrder, players, runs)
  const winnerUid = game.winner || standings[0]
  const winner = winnerUid ? players[winnerUid] : null
  const isWinner = winnerUid === uid

  useEffect(() => {
    stopPopMusic()
    playGameOverVoice()
  }, [])

  async function handlePlayAgain() {
    await resetGame(roomCode, playerOrder, meta, serverTimeOffset)
  }

  async function handleNewRoom() {
    await returnToLobby(roomCode)
  }

  function handleLeave() {
    navigate('/flappy')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Game Over</h1>

      {winner && (
        <div className={styles.winnerCard}>
          <Avatar avatarId={winner.avatarId} size={72} />
          <p className={styles.winnerName}>{winner.username}</p>
          <p className={styles.winnerWins}>
            {runs[winnerUid]?.score || 0} pipes, {Math.round((runs[winnerUid]?.survivalMs || 0) / 1000)}s survived
          </p>
          <span className={styles.crown}>&#128081; High Score</span>
          {isWinner && <p className={styles.youWon}>That&rsquo;s you!</p>}
        </div>
      )}

      <div className={styles.standings}>
        <h3 className={styles.standingsTitle}>Final Standings</h3>
        {standings.map((id, i) => {
          const player = players[id]
          const run = runs[id] || {}
          const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']
          return (
            <div
              key={id}
              className={`${styles.row} ${id === winnerUid ? styles.winnerRow : ''}`}
            >
              <span className={styles.rank}>{medals[i] ?? `${i + 1}.`}</span>
              <Avatar avatarId={player.avatarId} size={32} />
              <span className={styles.name}>
                {player.username}
                {id === uid && <span className={styles.youTag}> (you)</span>}
              </span>
              <span className={styles.winsCount}>{run.score || 0}</span>
              <span className={styles.timeCount}>{Math.round((run.survivalMs || 0) / 1000)}s</span>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        {isHost && (
          <>
            <button className={styles.playAgainBtn} onClick={handlePlayAgain}>
              Play Again
            </button>
            <button className={styles.newRoomBtn} onClick={handleNewRoom}>
              Back to Lobby
            </button>
          </>
        )}
        {!isHost && <p className={styles.waitMsg}>Waiting for host...</p>}
        <button className={styles.leaveBtn} onClick={handleLeave}>
          Leave Room
        </button>
      </div>

      {me && (
        <ChatPanel
          roomCode={roomCode}
          uid={uid}
          username={me.username}
          avatarId={me.avatarId}
        />
      )}
    </div>
  )
}
