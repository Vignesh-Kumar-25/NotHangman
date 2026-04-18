import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { revealTile, skipTurn, leaveRoom, startNextRound } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { GAME_STATES } from '../../constants/gameConfig'
import { startBgMusic, stopBgMusic, playTileReveal, playExplosion, playButtonClick, playRoundWin, isMuted, setMuted } from '../../utils/minesSounds'
import Board from '../game/Board'
import PlayerPanel from '../game/PlayerPanel'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const { game, players, playerOrder, meta, isHost, me, isMyTurn, amEliminated, currentPlayerUid, eliminated } = useGameState(room, uid)
  const [actionMsg, setActionMsg] = useState(null)
  const [clicking, setClicking] = useState(false)
  const [explosionPopup, setExplosionPopup] = useState(null)
  const [soundMuted, setSoundMuted] = useState(isMuted())
  const skipTimerRef = useRef(null)
  const nextRoundTimerRef = useRef(null)
  const lastActionRef = useRef(null)
  const containerRef = useRef(null)

  const revealed = game.revealed || {}
  const rows = meta.boardRows || 10
  const cols = meta.boardCols || 10
  const turnTimeLimit = meta.turnTimeLimit || 0
  const currentRound = game.currentRound || 1
  const totalRounds = game.totalRounds || 1
  const roundWins = game.roundWins || {}
  const isRoundOver = game.state === GAME_STATES.ROUND_OVER
  const roundWinner = game.roundWinner
  const roundWinnerPlayer = roundWinner ? players[roundWinner] : null

  // Background music
  useEffect(() => {
    startBgMusic()
    return () => stopBgMusic()
  }, [])

  // Button click sounds for all buttons in the game container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handleClick(e) {
      if (e.target.closest('button')) playButtonClick()
    }
    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [])

  // React to game actions
  useEffect(() => {
    const action = game.lastAction
    if (!action || action.timestamp === lastActionRef.current) return
    lastActionRef.current = action.timestamp

    const playerName = players[action.uid]?.username || 'Someone'
    if (action.type === 'explode') {
      playExplosion()
      setExplosionPopup({ playerName })
      setActionMsg(null)
      const timeout = setTimeout(() => setExplosionPopup(null), 3500)
      return () => clearTimeout(timeout)
    } else if (action.type === 'reveal') {
      playTileReveal()
      setActionMsg({ text: `${playerName} revealed a safe tile`, type: 'safe' })
    } else if (action.type === 'skip') {
      setActionMsg({ text: `${playerName}'s turn was skipped`, type: 'warn' })
    }
    const timeout = setTimeout(() => setActionMsg(null), 3000)
    return () => clearTimeout(timeout)
  }, [game.lastAction, players])

  // Round win sound
  useEffect(() => {
    if (isRoundOver && roundWinner) playRoundWin()
  }, [isRoundOver, roundWinner])

  // Host auto-skip on turn timeout
  useEffect(() => {
    if (!isHost || turnTimeLimit <= 0 || !game.turnStartedAt || game.state !== GAME_STATES.PLAYING) return
    clearTimeout(skipTimerRef.current)
    const elapsed = Date.now() - game.turnStartedAt
    const remaining = turnTimeLimit * 1000 - elapsed
    if (remaining <= 0) {
      skipTurn(roomCode)
      return
    }
    skipTimerRef.current = setTimeout(() => skipTurn(roomCode), remaining)
    return () => clearTimeout(skipTimerRef.current)
  }, [isHost, turnTimeLimit, game.turnStartedAt, game.currentTurnIndex, roomCode, game.state])

  // Host auto-advance to next round after delay
  useEffect(() => {
    if (!isHost || !isRoundOver) return
    clearTimeout(nextRoundTimerRef.current)
    nextRoundTimerRef.current = setTimeout(() => {
      startNextRound(roomCode, meta)
    }, 5000)
    return () => clearTimeout(nextRoundTimerRef.current)
  }, [isHost, isRoundOver, roomCode, meta])

  const handleTileClick = useCallback(async (index) => {
    if (!isMyTurn || clicking || amEliminated) return
    setClicking(true)
    try {
      await revealTile(roomCode, uid, index)
    } finally {
      setClicking(false)
    }
  }, [isMyTurn, clicking, amEliminated, roomCode, uid])

  async function handleLeave() {
    stopBgMusic()
    await leaveRoom(roomCode, uid)
    navigate('/mines')
  }

  function handleToggleMute() {
    const newVal = !soundMuted
    setSoundMuted(newVal)
    setMuted(newVal)
  }

  async function handleNextRound() {
    clearTimeout(nextRoundTimerRef.current)
    await startNextRound(roomCode, meta)
  }

  const currentPlayer = players[currentPlayerUid]
  const turnLabel = isRoundOver
    ? `Round ${currentRound} complete!`
    : isMyTurn
    ? 'Your turn! Click a tile'
    : amEliminated
    ? 'You were eliminated'
    : `${currentPlayer?.username || '...'}'s turn`

  const bombCount = (game.bombs || []).length
  const safeTiles = rows * cols - bombCount
  const safeRevealed = Object.values(revealed).filter((v) => v !== -1).length

  return (
    <div className={styles.page} ref={containerRef}>
      <div className={styles.topBar}>
        <div className={styles.roomInfo}>
          <span className={styles.roomLabel}>Room</span>
          <span className={styles.roomCodeSmall}>{roomCode}</span>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>Round {currentRound}/{totalRounds}</span>
          <span className={styles.stat}>{safeRevealed}/{safeTiles} tiles</span>
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

      <div className={styles.turnBanner}>
        <span className={[
          styles.turnText,
          isMyTurn && !isRoundOver ? styles.turnTextActive : '',
          amEliminated && !isRoundOver ? styles.turnTextElim : '',
          isRoundOver ? styles.turnTextRound : '',
        ].join(' ')}>
          {turnLabel}
        </span>
      </div>

      {actionMsg && !explosionPopup && (
        <div className={`${styles.actionMsg} ${styles[actionMsg.type]}`}>
          {actionMsg.text}
        </div>
      )}

      <div className={styles.gameArea}>
        <div className={styles.boardCol}>
          <Board
            rows={rows}
            cols={cols}
            revealed={revealed}
            canClick={isMyTurn && !clicking && !amEliminated && !isRoundOver}
            onTileClick={handleTileClick}
          />
        </div>
        <div className={styles.sideCol}>
          <PlayerPanel
            players={players}
            playerOrder={playerOrder}
            currentPlayerUid={currentPlayerUid}
            eliminated={eliminated}
            uid={uid}
            turnStartedAt={game.turnStartedAt}
            turnTimeLimit={game.state === GAME_STATES.PLAYING ? turnTimeLimit : 0}
            roundWins={roundWins}
          />
        </div>
      </div>

      {/* Explosion popup */}
      {explosionPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.explosionCard}>
            <span className={styles.explosionEmoji}>&#128163;</span>
            <p className={styles.explosionText}>
              {explosionPopup.playerName} has stepped on a mine
            </p>
            <p className={styles.kaboomText}>KABOOM!</p>
          </div>
        </div>
      )}

      {/* Round over overlay */}
      {isRoundOver && !explosionPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.roundOverCard}>
            <h2 className={styles.roundOverTitle}>Round {currentRound} Complete!</h2>
            {roundWinnerPlayer && (
              <div className={styles.roundWinnerSection}>
                <Avatar avatarId={roundWinnerPlayer.avatarId} size={56} />
                <p className={styles.roundWinnerName}>{roundWinnerPlayer.username} wins this round!</p>
              </div>
            )}
            <div className={styles.roundScores}>
              {playerOrder.map((id) => {
                const p = players[id]
                if (!p) return null
                return (
                  <div key={id} className={styles.roundScoreRow}>
                    <span className={styles.roundScoreName}>{p.username}</span>
                    <span className={styles.roundScoreVal}>{roundWins[id] || 0} wins</span>
                  </div>
                )
              })}
            </div>
            {isHost ? (
              <button className={styles.nextRoundBtn} onClick={handleNextRound}>
                Next Round
              </button>
            ) : (
              <p className={styles.roundWaitMsg}>Next round starting soon...</p>
            )}
          </div>
        </div>
      )}

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}
