import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { makeMove, resignGame, leaveRoom, finishGame } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { flatToBoard, getLegalMoves, needsPromotion } from '../../utils/chessLogic'
import { playPieceSelect, playPieceMove, playPieceCapture, playCheck, playCheckmate, playStalemate, isMuted, setMuted } from '../../utils/chessSounds'
import { GAME_STATES, PIECE_UNICODE } from '../../constants/gameConfig'
import Board from '../game/Board'
import PromotionPicker from '../game/PromotionPicker'
import CapturedPieces from '../game/CapturedPieces'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const { game, players, playerOrder, meta, me, myColor, isMyTurn } = useGameState(room, uid)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalMoves, setLegalMoves] = useState([])
  const [pendingPromo, setPendingPromo] = useState(null)
  const [moving, setMoving] = useState(false)
  const [showResignConfirm, setShowResignConfirm] = useState(false)
  const [soundMuted, setSoundMuted] = useState(isMuted())
  const [endPopup, setEndPopup] = useState(null)

  const lastStatusRef = useRef(game.status)
  const lastMoveTimestampRef = useRef(game.lastMove?.timestamp)
  const endTimerRef = useRef(null)

  const board = flatToBoard(game.board)
  const turnTimeLimit = meta.turnTimeLimit || 0

  const whitePlayer = players[game.whiteUid]
  const blackPlayer = players[game.blackUid]
  const capturedWhite = game.capturedWhite ? (Array.isArray(game.capturedWhite) ? game.capturedWhite : Object.values(game.capturedWhite)) : []
  const capturedBlack = game.capturedBlack ? (Array.isArray(game.capturedBlack) ? game.capturedBlack : Object.values(game.capturedBlack)) : []

  const kingInCheck = (game.status === 'check' || game.status === 'checkmate') ? game.currentTurn : null
  const isGameEnded = game.status === 'checkmate' || game.status === 'stalemate'

  useEffect(() => {
    const moveTs = game.lastMove?.timestamp
    if (moveTs && moveTs !== lastMoveTimestampRef.current) {
      lastMoveTimestampRef.current = moveTs
      if (game.lastMove?.color !== myColor) {
        if (game.lastMove.captured) {
          playPieceCapture()
        } else {
          playPieceMove()
        }
      }
    }
  }, [game.lastMove?.timestamp, game.lastMove?.color, game.lastMove?.captured, myColor])

  useEffect(() => {
    const prev = lastStatusRef.current
    lastStatusRef.current = game.status

    if (prev === game.status) return

    if (game.status === 'check') {
      playCheck()
    } else if (game.status === 'checkmate') {
      playCheckmate()
      const winnerColor = game.winner
      const winnerUid = winnerColor === 'w' ? game.whiteUid : game.blackUid
      const winnerPlayer = players[winnerUid]
      setEndPopup({
        type: 'checkmate',
        title: 'Checkmate!',
        subtitle: `${winnerPlayer?.username || (winnerColor === 'w' ? 'White' : 'Black')} wins!`,
      })
      endTimerRef.current = setTimeout(() => {
        finishGame(roomCode)
      }, 4000)
    } else if (game.status === 'stalemate') {
      playStalemate()
      setEndPopup({
        type: 'stalemate',
        title: 'Stalemate!',
        subtitle: 'The game is a draw',
      })
      endTimerRef.current = setTimeout(() => {
        finishGame(roomCode)
      }, 4000)
    }

    return () => clearTimeout(endTimerRef.current)
  }, [game.status, game.winner, game.whiteUid, game.blackUid, players, roomCode])

  useEffect(() => {
    setSelectedSquare(null)
    setLegalMoves([])
  }, [game.currentTurn])

  useEffect(() => {
    return () => clearTimeout(endTimerRef.current)
  }, [])

  const handleSquareClick = useCallback((r, c) => {
    if (!isMyTurn || moving || isGameEnded) return

    const piece = board[r][c]

    if (selectedSquare) {
      const isLegal = legalMoves.some(m => m.r === r && m.c === c)
      if (isLegal) {
        if (needsPromotion(board, selectedSquare.r, selectedSquare.c, r)) {
          setPendingPromo({ fromR: selectedSquare.r, fromC: selectedSquare.c, toR: r, toC: c })
          return
        }
        const targetPiece = board[r][c]
        if (targetPiece) {
          playPieceCapture()
        } else {
          playPieceMove()
        }
        executeMove(selectedSquare.r, selectedSquare.c, r, c, null)
        return
      }
    }

    if (piece && piece.color === myColor) {
      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        setSelectedSquare(null)
        setLegalMoves([])
      } else {
        playPieceSelect()
        setSelectedSquare({ r, c })
        setLegalMoves(getLegalMoves(board, r, c))
      }
    } else {
      setSelectedSquare(null)
      setLegalMoves([])
    }
  }, [isMyTurn, moving, isGameEnded, selectedSquare, legalMoves, board, myColor])

  async function executeMove(fromR, fromC, toR, toC, promoType) {
    setMoving(true)
    setSelectedSquare(null)
    setLegalMoves([])
    setPendingPromo(null)
    try {
      await makeMove(roomCode, uid, fromR, fromC, toR, toC, promoType)
    } finally {
      setMoving(false)
    }
  }

  function handlePromoSelect(type) {
    if (!pendingPromo) return
    const targetPiece = board[pendingPromo.toR][pendingPromo.toC]
    if (targetPiece) {
      playPieceCapture()
    } else {
      playPieceMove()
    }
    executeMove(pendingPromo.fromR, pendingPromo.fromC, pendingPromo.toR, pendingPromo.toC, type)
  }

  async function handleResign() {
    setShowResignConfirm(false)
    await resignGame(roomCode, uid)
  }

  async function handleLeave() {
    await leaveRoom(roomCode, uid)
    navigate('/chess')
  }

  function handleToggleMute() {
    const newVal = !soundMuted
    setSoundMuted(newVal)
    setMuted(newVal)
  }

  const currentTurnLabel = game.currentTurn === 'w' ? 'White' : 'Black'
  const turnText = isGameEnded
    ? (game.status === 'checkmate' ? 'Checkmate!' : 'Stalemate!')
    : isMyTurn
    ? 'Your turn'
    : `${currentTurnLabel}'s turn`

  const statusText = game.status === 'check'
    ? `${currentTurnLabel} is in check!`
    : null

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.roomInfo}>
          <span className={styles.roomLabel}>Room</span>
          <span className={styles.roomCodeSmall}>{roomCode}</span>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>Move {game.moveCount || 0}</span>
        </div>
        <div className={styles.topActions}>
          <button
            className={`${styles.muteBtn} ${soundMuted ? styles.muteBtnActive : ''}`}
            onClick={handleToggleMute}
            title={soundMuted ? 'Unmute' : 'Mute'}
          >
            {soundMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
          </button>
          <button className={styles.leaveBtn} onClick={handleLeave}>Leave</button>
        </div>
      </div>

      {turnTimeLimit > 0 && game.turnStartedAt && !isGameEnded && (
        <TurnTimer startedAt={game.turnStartedAt} limit={turnTimeLimit} />
      )}

      <div className={styles.playerBar}>
        <PlayerBadge
          player={myColor === 'b' ? whitePlayer : blackPlayer}
          color={myColor === 'b' ? 'w' : 'b'}
          isActive={game.currentTurn === (myColor === 'b' ? 'w' : 'b')}
          captured={myColor === 'b' ? capturedWhite : capturedBlack}
          capturedByColor={myColor === 'b' ? 'w' : 'b'}
        />
      </div>

      <div className={styles.turnBanner}>
        <span className={`${styles.turnText} ${isMyTurn && !isGameEnded ? styles.turnTextActive : ''} ${isGameEnded ? styles.turnTextEnd : ''}`}>
          {turnText}
        </span>
        {statusText && <span className={styles.checkBadge}>{statusText}</span>}
      </div>

      <div className={styles.boardArea}>
        <Board
          board={board}
          myColor={myColor}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={game.lastMove}
          kingInCheck={kingInCheck}
          onSquareClick={handleSquareClick}
          disabled={!isMyTurn || moving || isGameEnded}
        />
      </div>

      <div className={styles.playerBar}>
        <PlayerBadge
          player={myColor === 'w' ? whitePlayer : blackPlayer}
          color={myColor || 'w'}
          isActive={game.currentTurn === myColor}
          captured={myColor === 'w' ? capturedWhite : capturedBlack}
          capturedByColor={myColor || 'w'}
          isYou
        />
      </div>

      {myColor && !isGameEnded && (
        <div className={styles.gameActions}>
          {!showResignConfirm ? (
            <button className={styles.resignBtn} onClick={() => setShowResignConfirm(true)}>
              Resign
            </button>
          ) : (
            <div className={styles.resignConfirm}>
              <span className={styles.resignMsg}>Resign this game?</span>
              <button className={styles.resignYes} onClick={handleResign}>Yes</button>
              <button className={styles.resignNo} onClick={() => setShowResignConfirm(false)}>No</button>
            </div>
          )}
        </div>
      )}

      {pendingPromo && (
        <PromotionPicker color={myColor} onSelect={handlePromoSelect} />
      )}

      {endPopup && (
        <div className={styles.popupOverlay}>
          <div className={`${styles.endCard} ${endPopup.type === 'checkmate' ? styles.endCardCheckmate : styles.endCardStalemate}`}>
            <span className={styles.endIcon}>
              {endPopup.type === 'checkmate' ? '\u265A' : '\u00BD'}
            </span>
            <h2 className={styles.endTitle}>{endPopup.title}</h2>
            <p className={styles.endSubtitle}>{endPopup.subtitle}</p>
          </div>
        </div>
      )}

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}

function PlayerBadge({ player, color, isActive, captured, capturedByColor, isYou }) {
  if (!player) return null
  const colorLabel = color === 'w' ? 'White' : 'Black'
  const kingIcon = PIECE_UNICODE[color + 'K']

  return (
    <div className={`${styles.playerBadge} ${isActive ? styles.playerBadgeActive : ''}`}>
      <Avatar avatarId={player.avatarId} size={32} />
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>
          {player.username}
          {isYou && <span className={styles.youTag}>(you)</span>}
        </span>
        <span className={styles.playerColor}>{kingIcon} {colorLabel}</span>
      </div>
      <CapturedPieces pieces={captured} capturedByColor={capturedByColor} />
    </div>
  )
}

function TurnTimer({ startedAt, limit }) {
  const [remaining, setRemaining] = useState(limit)
  const intervalRef = useRef(null)

  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - startedAt) / 1000
      const left = Math.max(0, Math.ceil(limit - elapsed))
      setRemaining(left)
    }
    tick()
    intervalRef.current = setInterval(tick, 250)
    return () => clearInterval(intervalRef.current)
  }, [startedAt, limit])

  const urgent = remaining <= 10

  return (
    <div className={`${styles.timerBar} ${urgent ? styles.timerBarUrgent : ''}`}>
      <span className={styles.timerValue}>{remaining}s</span>
    </div>
  )
}
