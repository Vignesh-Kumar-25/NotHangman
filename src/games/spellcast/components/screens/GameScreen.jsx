import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitWord, leaveRoom, useAbilityShuffle, useAbilitySwap, useAbilityHint } from '../../db'
import { useChat } from '@/hooks/useChat'
import { useGameState } from '../../hooks/useGameState'
import { useTimer } from '../../hooks/useTimer'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'
import { useHostArbiter } from '../../hooks/useHostArbiter'
import { useDictionary } from '../../hooks/useDictionary'
import { useGameRenderer } from '../../hooks/useGameRenderer'
import { useDragSelection } from '../../hooks/useDragSelection'
import { scoreWord } from '../../utils/scoringUtils'
import { countGemsEarned } from '../../utils/gemUtils'
import { isValidWord } from '../../utils/dictionaryUtils'
import { findBestWord } from '../../utils/hintUtils'
import { GAME_STATES } from '../../constants/gameStates'
import { MIN_WORD_LENGTH } from '../../constants/gameConfig'
import { playCorrect, playWrong, playRoundWin, startBgMusic, stopBgMusic } from '@/utils/soundManager'
import ScorePanel from '../game/ScorePanel'
import TurnTimer from '../game/TurnTimer'
import TurnIndicator from '../game/TurnIndicator'
import RoundBadge from '../game/RoundBadge'
import GemPanel from '../game/GemPanel'
import LastWordDisplay from '../game/LastWordDisplay'
import SwapModal from '../game/SwapModal'
import RoundResultOverlay from '../game/RoundResultOverlay'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const {
    game, players, playerOrder, isHost, isMyTurn, me, myGems, meta,
  } = useGameState(room, uid)

  const serverTimeOffset = useServerTimeOffset()
  const turnDuration = game?.turnDuration ?? meta?.turnDuration ?? 60
  const timeLeft = useTimer(game?.turnStartTime, serverTimeOffset, turnDuration)

  useHostArbiter({ isHost, room, roomCode, timeLeft, uid })

  const { dictionary, trie, loading: dictLoading } = useDictionary()
  const { appRef, rendererRef, containerCallbackRef } = useGameRenderer()

  const board = game?.board
  const enabled = isMyTurn && game?.state === GAME_STATES.PLAYING && !dictLoading
  const { selectedPath, selectedWord, isDragging, clearSelection } = useDragSelection(
    rendererRef, appRef, board, enabled
  )

  const submittingRef = useRef(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [musicMuted, setMusicMuted] = useState(false)
  const musicStartedRef = useRef(false)

  // Update board when it changes
  useEffect(() => {
    if (board && rendererRef.current) {
      rendererRef.current.updateBoard(board)
    }
  }, [board, rendererRef])

  // Show hint on board when hintWord is set
  useEffect(() => {
    if (game?.hintWord && rendererRef.current) {
      rendererRef.current.showHint(game.hintWord)
    }
  }, [game?.hintWord, rendererRef])

  // Auto-start music
  useEffect(() => {
    if (game?.state === GAME_STATES.PLAYING && !musicStartedRef.current && !musicMuted) {
      startBgMusic()
      musicStartedRef.current = true
    }
  }, [game?.state, musicMuted])

  // Round win sound
  const prevStateRef = useRef(null)
  useEffect(() => {
    if (game?.state === GAME_STATES.ROUND_END && prevStateRef.current === GAME_STATES.PLAYING) {
      playRoundWin()
    }
    prevStateRef.current = game?.state ?? null
  }, [game?.state])

  useEffect(() => {
    return () => stopBgMusic()
  }, [])

  // Word submission on drag end
  useEffect(() => {
    if (isDragging || selectedPath.length === 0 || !enabled || !dictionary) return
    if (submittingRef.current) return

    if (selectedWord.length < MIN_WORD_LENGTH || !isValidWord(selectedWord, dictionary)) {
      playWrong()
      clearSelection()
      return
    }

    playCorrect()
    const score = scoreWord(selectedPath, board)
    const gemsEarned = countGemsEarned(selectedPath, board)

    submittingRef.current = true
    submitWord(roomCode, uid, selectedPath, selectedWord, score, gemsEarned, game, playerOrder, players)
      .then(() => clearSelection())
      .catch(console.error)
      .finally(() => { submittingRef.current = false })
  }, [isDragging])

  function toggleMusic() {
    if (musicMuted) {
      startBgMusic()
      setMusicMuted(false)
    } else {
      stopBgMusic()
      setMusicMuted(true)
    }
  }

  async function handleLeave() {
    stopBgMusic()
    await leaveRoom(roomCode, uid)
    navigate('/')
  }

  async function handleShuffle() {
    await useAbilityShuffle(roomCode, uid, game, players)
  }

  async function handleSwap(row, col, letter) {
    await useAbilitySwap(roomCode, uid, row, col, letter, game, players)
    setShowSwapModal(false)
  }

  async function handleHint() {
    if (!dictionary || !trie || !board) return
    const result = findBestWord(board, dictionary, trie)
    if (result) {
      await useAbilityHint(roomCode, uid, result.path, game, players)
    }
  }

  // Determine word preview style
  let wordPreviewClass = styles.wordPreview
  if (selectedWord.length > 0 && dictionary) {
    if (selectedWord.length >= MIN_WORD_LENGTH && isValidWord(selectedWord, dictionary)) {
      wordPreviewClass += ' ' + styles.wordPreviewValid
    } else {
      wordPreviewClass += ' ' + styles.wordPreviewInvalid
    }
  }

  const isRoundStart = !game || game.state === GAME_STATES.ROUND_START
  const currentPlayer = game?.currentTurnUid ? players[game.currentTurnUid] : null

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <ScorePanel
          players={players}
          playerOrder={playerOrder}
          currentTurnUid={game?.currentTurnUid}
          uid={uid}
        />
        <div className={styles.sidebarActions}>
          <button
            className={styles.musicBtn}
            onClick={toggleMusic}
            title={musicMuted ? 'Unmute music' : 'Mute music'}
          >
            {musicMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
          </button>
          <button className={styles.leaveBtn} onClick={handleLeave}>
            Leave
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <RoundBadge round={game?.round ?? 1} numRounds={game?.numRounds ?? meta?.numRounds ?? 5} />
        </div>

        <div className={styles.turnRow}>
          <TurnIndicator currentPlayer={currentPlayer} isMyTurn={isMyTurn} />
          <TurnTimer timeLeft={timeLeft} turnDuration={turnDuration} />
        </div>

        <div className={wordPreviewClass}>
          {selectedWord || '\u00A0'}
        </div>

        <div className={styles.boardContainer} ref={containerCallbackRef} />

        <GemPanel
          gems={myGems}
          isMyTurn={isMyTurn && game?.state === GAME_STATES.PLAYING}
          usedAbility={game?.usedAbility}
          onShuffle={handleShuffle}
          onSwap={() => setShowSwapModal(true)}
          onHint={handleHint}
        />

        <LastWordDisplay lastWord={game?.lastWord} players={players} />
      </main>

      {isRoundStart && (
        <div className={styles.countdownOverlay}>
          <div className={styles.countdownCard}>
            <h2>Round {game?.round ?? 1}</h2>
            <p>Get ready to build words!</p>
          </div>
        </div>
      )}

      {game?.state === GAME_STATES.ROUND_END && (
        <RoundResultOverlay game={game} players={players} playerOrder={playerOrder} />
      )}

      {showSwapModal && (
        <SwapModal
          board={board}
          onSwap={handleSwap}
          onCancel={() => setShowSwapModal(false)}
        />
      )}

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
