import { useNavigate } from 'react-router-dom'
import { resetGame, returnToLobby } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { PIECE_UNICODE } from '../../constants/gameConfig'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameOverScreen.module.css'

export default function GameOverScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const { game, players, playerOrder, isHost, me } = useGameState(room, uid)

  const whitePlayer = players[game.whiteUid]
  const blackPlayer = players[game.blackUid]

  const isDraw = game.winner === 'draw'
  const winnerColor = !isDraw ? game.winner : null
  const winnerUid = winnerColor === 'w' ? game.whiteUid : winnerColor === 'b' ? game.blackUid : null
  const winnerPlayer = winnerUid ? players[winnerUid] : null
  const isWinner = winnerUid === uid

  let resultTitle = ''
  let resultSubtitle = ''
  if (game.status === 'checkmate') {
    resultTitle = 'Checkmate!'
    resultSubtitle = `${winnerColor === 'w' ? 'White' : 'Black'} wins`
  } else if (game.status === 'stalemate') {
    resultTitle = 'Stalemate!'
    resultSubtitle = 'The game is a draw'
  } else if (game.status === 'resignation') {
    const loserColor = winnerColor === 'w' ? 'Black' : 'White'
    resultTitle = `${loserColor} Resigned`
    resultSubtitle = `${winnerColor === 'w' ? 'White' : 'Black'} wins`
  }

  async function handlePlayAgain() {
    await resetGame(roomCode, playerOrder)
  }

  async function handleNewRoom() {
    await returnToLobby(roomCode)
  }

  function handleLeave() {
    navigate('/chess')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{resultTitle}</h1>

      {isDraw ? (
        <div className={styles.drawCard}>
          <div className={styles.drawAvatars}>
            {whitePlayer && <Avatar avatarId={whitePlayer.avatarId} size={56} />}
            {blackPlayer && <Avatar avatarId={blackPlayer.avatarId} size={56} />}
          </div>
          <p className={styles.drawText}>{resultSubtitle}</p>
          <span className={styles.drawIcon}>{PIECE_UNICODE.wK} = {PIECE_UNICODE.bK}</span>
        </div>
      ) : winnerPlayer && (
        <div className={styles.winnerCard}>
          <Avatar avatarId={winnerPlayer.avatarId} size={72} />
          <p className={styles.winnerName}>{winnerPlayer.username}</p>
          <p className={styles.winnerSub}>{resultSubtitle}</p>
          <span className={styles.crown}>&#128081; Champion</span>
          {isWinner && <p className={styles.youWon}>That&rsquo;s you!</p>}
        </div>
      )}

      <div className={styles.matchInfo}>
        <h3 className={styles.infoTitle}>Match Summary</h3>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Total moves</span>
          <span className={styles.infoVal}>{game.moveCount || 0}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>White</span>
          <span className={styles.infoVal}>{whitePlayer?.username || '?'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Black</span>
          <span className={styles.infoVal}>{blackPlayer?.username || '?'}</span>
        </div>
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
