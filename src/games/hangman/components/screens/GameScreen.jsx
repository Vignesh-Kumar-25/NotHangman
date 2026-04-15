import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { guessLetter, guessWord, leaveRoom } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { useTimer } from '../../hooks/useTimer'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'
import { useHostArbiter } from '../../hooks/useHostArbiter'
import { GAME_STATES } from '../../constants/gameStates'
import { playCorrect, playWrong, startBgMusic, stopBgMusic, isBgMusicPlaying } from '@/utils/soundManager'
import HangmanCanvas from '../game/HangmanCanvas'
import WordDisplay from '../game/WordDisplay'
import LetterGrid from '../game/LetterGrid'
import WordGuessInput from '../game/WordGuessInput'
import TurnTimer from '../game/TurnTimer'
import TurnIndicator from '../game/TurnIndicator'
import CategoryBadge from '../game/CategoryBadge'
import RoundBadge from '../game/RoundBadge'
import ScorePanel from '../game/ScorePanel'
import RoundResultOverlay from '../game/RoundResultOverlay'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const {
    game, players, playerOrder, isHost, isMyTurn, me, maskedWord, meta,
  } = useGameState(room, uid)

  const serverTimeOffset = useServerTimeOffset()
  const timeLeft = useTimer(game?.turnStartTime, serverTimeOffset)

  useHostArbiter({ isHost, room, roomCode, timeLeft, uid })

  const submittingRef = useRef(false)
  const [musicOn, setMusicOn] = useState(false)

  // ── Background music toggle ────────────────────────────
  function toggleMusic() {
    if (isBgMusicPlaying()) {
      stopBgMusic()
      setMusicOn(false)
    } else {
      startBgMusic()
      setMusicOn(true)
    }
  }

  // Stop music when unmounting
  useEffect(() => {
    return () => stopBgMusic()
  }, [])

  // ── Letter guess ───────────────────────────────────────
  const handleLetterGuess = useCallback(async (letter) => {
    if (!isMyTurn || submittingRef.current) return
    const normalized = letter.toUpperCase()
    if (!/^[A-Z]$/.test(normalized)) return
    if (game.guessedLetters?.[normalized] !== undefined) return

    const inWord = game.word.includes(normalized)
    if (inWord) playCorrect()
    else playWrong()

    submittingRef.current = true
    try {
      await guessLetter(roomCode, uid, normalized, game, playerOrder, players)
    } finally {
      submittingRef.current = false
    }
  }, [isMyTurn, roomCode, uid, game, playerOrder, players])

  const handleWordGuess = useCallback(async (word) => {
    if (!isMyTurn || submittingRef.current) return
    submittingRef.current = true
    try {
      await guessWord(roomCode, uid, word, game, playerOrder, players)
    } finally {
      submittingRef.current = false
    }
  }, [isMyTurn, roomCode, uid, game, playerOrder, players])

  // ── Keyboard input ─────────────────────────────────────
  useEffect(() => {
    if (!isMyTurn) return
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toUpperCase()
      if (/^[A-Z]$/.test(key)) {
        e.preventDefault()
        handleLetterGuess(key)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMyTurn, handleLetterGuess])

  // ── Leave room ─────────────────────────────────────────
  async function handleLeave() {
    stopBgMusic()
    await leaveRoom(roomCode, uid)
    navigate('/')
  }

  if (!game || game.state === GAME_STATES.ROUND_START) {
    return (
      <div className={styles.countdown}>
        <h2>Round {Math.ceil((game?.round ?? 1) / Math.max(1, playerOrder.length))}</h2>
        <p>Category: <strong>{game?.category}</strong></p>
        <p>Starting soon…</p>
      </div>
    )
  }

  const currentPlayer = game.currentTurnUid ? players[game.currentTurnUid] : null
  const inputsDisabled = !isMyTurn || game.state !== GAME_STATES.PLAYING

  return (
    <div className={styles.layout}>
      {/* Left sidebar — scores */}
      <aside className={styles.sidebar}>
        <ScorePanel
          players={players}
          playerOrder={playerOrder}
          currentTurnUid={game.currentTurnUid}
          uid={uid}
        />
        <div className={styles.sidebarActions}>
          <button
            className={styles.musicBtn}
            onClick={toggleMusic}
            title={musicOn ? 'Mute music' : 'Play music'}
          >
            {musicOn ? '🔊' : '🔇'}
          </button>
          <button className={styles.leaveBtn} onClick={handleLeave}>
            Leave
          </button>
        </div>
      </aside>

      {/* Main game area */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <RoundBadge
            round={game.round}
            numRounds={game.numRounds ?? meta?.numRounds ?? 2}
            playerCount={playerOrder.length}
          />
          <CategoryBadge category={game.category} />
        </div>

        <div className={styles.turnRow}>
          <TurnIndicator currentPlayer={currentPlayer} isMyTurn={isMyTurn} />
          <TurnTimer timeLeft={timeLeft} />
        </div>

        <HangmanCanvas wrongGuessCount={game.wrongGuessCount ?? 0} />

        <WordDisplay maskedWord={maskedWord} />

        <div className={styles.inputArea}>
          {isMyTurn && game.state === GAME_STATES.PLAYING && (
            <p className={styles.keyboardHint}>Press a letter key or click below</p>
          )}
          <LetterGrid
            guessedLetters={game.guessedLetters || {}}
            onGuess={handleLetterGuess}
            disabled={inputsDisabled}
          />
          <WordGuessInput onGuess={handleWordGuess} disabled={inputsDisabled} />
        </div>
      </main>

      {/* Round result overlay */}
      {game.state === GAME_STATES.ROUND_END && (
        <RoundResultOverlay game={game} players={players} />
      )}

      {/* Chat (floating button + panel) */}
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
