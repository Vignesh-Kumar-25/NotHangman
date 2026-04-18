import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetGame, returnToLobby } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { playMatchWin, stopBgMusic } from '../../utils/minesSounds'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const { game, players, playerOrder, meta, isHost, me, eliminated } = useGameState(room, uid)

  const roundWins = game.roundWins || {}
  const totalRounds = game.totalRounds || 1
  const roundResults = game.roundResults || {}
  const matchWinnerUid = game.matchWinner
  const matchWinner = matchWinnerUid ? players[matchWinnerUid] : null
  const isWinner = matchWinnerUid === uid

  useEffect(() => {
    stopBgMusic()
    playMatchWin()
  }, [])

  const sorted = [...playerOrder]
    .filter((id) => players[id])
    .sort((a, b) => (roundWins[b] || 0) - (roundWins[a] || 0))

  async function handlePlayAgain() {
    await resetGame(roomCode, playerOrder, meta)
  }

  async function handleNewRoom() {
    await returnToLobby(roomCode)
  }

  function handleLeave() {
    navigate('/mines')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Match Complete!</h1>

      {matchWinner && (
        <div className={styles.winnerCard}>
          <Avatar avatarId={matchWinner.avatarId} size={72} />
          <p className={styles.winnerName}>{matchWinner.username}</p>
          <p className={styles.winnerWins}>{roundWins[matchWinnerUid] || 0} / {totalRounds} rounds won</p>
          <span className={styles.crown}>&#128081; Champion</span>
          {isWinner && <p className={styles.youWon}>That&rsquo;s you!</p>}
        </div>
      )}

      <div className={styles.standings}>
        <h3 className={styles.standingsTitle}>Final Standings</h3>
        {sorted.map((id, i) => {
          const player = players[id]
          if (!player) return null
          const isMe = id === uid
          const isWin = id === matchWinnerUid
          const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']
          return (
            <div
              key={id}
              className={[styles.row, isWin ? styles.winnerRow : ''].join(' ')}
            >
              <span className={styles.rank}>{medals[i] ?? `${i + 1}.`}</span>
              <Avatar avatarId={player.avatarId} size={32} />
              <span className={styles.name}>
                {player.username}
                {isMe && <span className={styles.youTag}> (you)</span>}
              </span>
              <span className={styles.winsCount}>{roundWins[id] || 0}W</span>
            </div>
          )
        })}
      </div>

      {totalRounds > 1 && (
        <div className={styles.roundBreakdown}>
          <h3 className={styles.standingsTitle}>Round Results</h3>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
            const winnerId = roundResults[r]
            const winnerP = winnerId ? players[winnerId] : null
            return (
              <div key={r} className={styles.roundRow}>
                <span className={styles.roundNum}>Round {r}</span>
                {winnerP ? (
                  <span className={styles.roundWinnerLabel}>{winnerP.username}</span>
                ) : (
                  <span className={styles.roundDash}>&mdash;</span>
                )}
              </div>
            )
          })}
        </div>
      )}

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
