import { useCallback, useRef } from 'react'
import { guessLetter, guessWord } from '../../firebase/db'
import { useGameState } from '../../hooks/useGameState'
import { useTimer } from '../../hooks/useTimer'
import { useServerTimeOffset } from '../../hooks/useServerTimeOffset'
import { useHostArbiter } from '../../hooks/useHostArbiter'
import { GAME_STATES } from '../../constants/gameStates'
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
import ChatPanel from '../chat/ChatPanel'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const {
    game, players, playerOrder, isHost, isMyTurn, me, maskedWord,
  } = useGameState(room, uid)

  const serverTimeOffset = useServerTimeOffset()
  const timeLeft = useTimer(game?.turnStartTime, serverTimeOffset)

  useHostArbiter({ isHost, room, roomCode, timeLeft, uid })

  const submittingRef = useRef(false)

  const handleLetterGuess = useCallback(async (letter) => {
    if (!isMyTurn || submittingRef.current) return
    submittingRef.current = true
    try {
      await guessLetter(roomCode, uid, letter, game, playerOrder, players)
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

  if (!game || game.state === GAME_STATES.ROUND_START) {
    return (
      <div className={styles.countdown}>
        <h2>Round {game?.round}</h2>
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
      </aside>

      {/* Main game area */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <RoundBadge round={game.round} totalRounds={game.totalRounds} />
          <CategoryBadge category={game.category} />
        </div>

        <div className={styles.turnRow}>
          <TurnIndicator currentPlayer={currentPlayer} isMyTurn={isMyTurn} />
          <TurnTimer timeLeft={timeLeft} />
        </div>

        <HangmanCanvas wrongGuessCount={game.wrongGuessCount ?? 0} />

        <WordDisplay maskedWord={maskedWord} />

        <div className={styles.inputArea}>
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
