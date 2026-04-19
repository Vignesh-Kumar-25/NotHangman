import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatPanel from '@/components/chat/ChatPanel'
import Board from '../game/Board'
import ScorePanel from '../game/ScorePanel'
import WordFeed from '../game/WordFeed'
import { finishMatch, leaveRoom, reshuffleBoard, submitWord, swapLetter, useHint } from '../../db'
import { useBoardSelection } from '../../hooks/useBoardSelection'
import { useGameState } from '../../hooks/useGameState'
import {
  isMuted,
  playInvalidWord,
  playLetterSelect,
  playWordComplete,
  setMuted,
  startBgMusic,
  stopBgMusic,
} from '../../utils/spellcastSounds'
import { findHintWord, scoreWord } from '../../utils/boardUtils'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [invalidPath, setInvalidPath] = useState([])
  const [swapOverlayOpen, setSwapOverlayOpen] = useState(false)
  const [soundMuted, setSoundMuted] = useState(isMuted())
  const [hintBoardVersion, setHintBoardVersion] = useState(null)
  const [hideLastMovePath, setHideLastMovePath] = useState(false)
  const invalidTimerRef = useRef(null)
  const prevPathLengthRef = useRef(0)
  const {
    boardState,
    me,
    players,
    leaderboard,
    foundWords,
    isHost,
    game,
    currentRound,
    totalRounds,
    currentPlayer,
    isMyTurn,
    turnUtilityUsage,
  } = useGameState(room, uid)
  const rows = boardState?.rows || []
  const {
    path,
    currentWord,
    handlePointerDown,
    handlePointerEnter,
    handleTileClick,
    clearSelection,
  } = useBoardSelection(rows)

  const lastMoveAction = game?.lastMove?.action || 'cast'
  const lastMoveTiles = useMemo(() => {
    if (!game?.lastMove || hideLastMovePath) return []
    if (game.lastMove.action === 'shuffle') {
      return rows.flat().map((_, index) => index)
    }
    if (game.lastMove.action === 'swap') {
      return Number.isInteger(game.lastMove.tileIndex) ? [game.lastMove.tileIndex] : []
    }
    return game.lastMove.path || []
  }, [game?.lastMove, hideLastMovePath, rows])
  const metrics = boardState?.metrics
  const selectedScore = scoreWord(currentWord)
  const selectedLength = currentWord.length
  const lastMoveText = useMemo(() => {
    if (!game?.lastMove) return ''
    const playerName = players[game.lastMove.uid]?.username || 'A mage'
    if (game.lastMove.action === 'shuffle') {
      return `${playerName} shuffled the rune field.`
    }
    if (game.lastMove.action === 'swap') {
      return `${playerName} swapped a tile to ${game.lastMove.nextLetter?.toUpperCase()}.`
    }
    if (game.lastMove.action === 'hint') {
      return `${playerName} used a hint.`
    }
    return `${playerName} cast ${game.lastMove.word.toUpperCase()} for +${game.lastMove.score}.`
  }, [game?.lastMove, players])
  const turnLabel = currentWord
    ? `Tracing ${currentWord} (${selectedLength} letters)`
    : isMyTurn
      ? 'Your turn. Drag across adjacent runes to build a word'
      : `${currentPlayer?.username || 'Another mage'}'s turn`
  const hintUsedThisTurn = Boolean(turnUtilityUsage?.hint)
  const shuffleUsedThisTurn = Boolean(turnUtilityUsage?.shuffle)
  const swapUsedThisTurn = Boolean(turnUtilityUsage?.swap)

  useEffect(() => {
    return () => clearTimeout(invalidTimerRef.current)
  }, [])

  useEffect(() => {
    startBgMusic()
    return () => stopBgMusic()
  }, [])

  useEffect(() => {
    const prevLength = prevPathLengthRef.current
    if (path.length > prevLength) {
      playLetterSelect(path.length)
    }
    prevPathLengthRef.current = path.length
  }, [path])

  useEffect(() => {
    if (!status.startsWith('Hint:') && !status.startsWith('No unused 4-letter hint')) return
    if (boardState?.version !== hintBoardVersion) {
      setStatus('')
      setHintBoardVersion(null)
    }
  }, [boardState?.version, hintBoardVersion, status])

  useEffect(() => {
    setHideLastMovePath(false)
  }, [boardState?.version])

  function handleBoardPointerDown(index) {
    if (!isMyTurn) return
    setHideLastMovePath(true)
    handlePointerDown(index)
  }

  function handleBoardTileClick(index) {
    if (!isMyTurn) return
    setHideLastMovePath(true)
    handleTileClick(index)
  }

  async function handleSubmit() {
    if (!isMyTurn) return
    if (!boardState || path.length < 3 || submitting) return
    const completedLength = path.length
    setSubmitting(true)
    setError('')
    setStatus('')

    try {
      await submitWord(roomCode, uid, path, boardState.version)
      playWordComplete(completedLength)
      setInvalidPath([])
      clearSelection()
    } catch (err) {
      playInvalidWord()
      setError(err.message || 'Spell failed')
      setInvalidPath([...path])
      clearTimeout(invalidTimerRef.current)
      invalidTimerRef.current = setTimeout(() => setInvalidPath([]), 500)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleShuffle() {
    if (!isMyTurn) return
    if (!boardState || submitting || shuffleUsedThisTurn) return
    setSubmitting(true)
    setError('')
    setStatus('')

    try {
      await reshuffleBoard(roomCode, uid, boardState.version)
      setInvalidPath([])
      clearSelection()
    } catch (err) {
      playInvalidWord()
      setError(err.message || 'Shuffle failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSwap() {
    if (!isMyTurn) return
    if (!boardState || submitting || swapUsedThisTurn) return
    if (path.length !== 1) {
      setError('Select exactly one tile before using swap')
      setInvalidPath([...path])
      clearTimeout(invalidTimerRef.current)
      invalidTimerRef.current = setTimeout(() => setInvalidPath([]), 500)
      playInvalidWord()
      return
    }

    setSwapOverlayOpen(true)
  }

  async function handleHint() {
    if (!isMyTurn) return
    if (!boardState || hintUsedThisTurn) return

    setError('')
    const hintedWord = findHintWord(rows, foundWords, 4)

    if (hintedWord) {
      await useHint(roomCode, uid)
      setStatus(`Hint: ${hintedWord.toUpperCase()}`)
      setHintBoardVersion(boardState.version)
      return
    }

    setStatus('No unused 4-letter hint is available on this board')
    setHintBoardVersion(boardState.version)
  }

  async function handleSwapLetterPick(nextLetter) {
    if (!isMyTurn) return
    if (!boardState || path.length !== 1 || submitting || swapUsedThisTurn) return
    setSubmitting(true)
    setError('')
    setSwapOverlayOpen(false)

    try {
      await swapLetter(roomCode, uid, path[0], nextLetter, boardState.version)
      setInvalidPath([])
      clearSelection()
    } catch (err) {
      playInvalidWord()
      setError(err.message || 'Swap failed')
      setInvalidPath([...path])
      clearTimeout(invalidTimerRef.current)
      invalidTimerRef.current = setTimeout(() => setInvalidPath([]), 500)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLeave() {
    stopBgMusic()
    await leaveRoom(roomCode, uid)
    navigate('/spellcast')
  }

  async function handleFinish() {
    stopBgMusic()
    await finishMatch(roomCode)
  }

  function handleToggleMute() {
    const nextValue = !soundMuted
    setSoundMuted(nextValue)
    setMuted(nextValue)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.roomInfo}>
          <span className={styles.roomLabel}>Room</span>
          <span className={styles.roomCodeSmall}>{roomCode}</span>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>Round {currentRound}/{totalRounds}</span>
        </div>
        <div className={styles.topActions}>
          <button
            className={`${styles.muteBtn} ${soundMuted ? styles.muteBtnActive : ''}`}
            onClick={handleToggleMute}
            title={soundMuted ? 'Unmute' : 'Mute'}
            type="button"
          >
            {soundMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
          </button>
          {isHost && (
            <button className={styles.finishBtn} onClick={handleFinish} type="button">
              End Match
            </button>
          )}
          <button className={styles.leaveBtn} onClick={handleLeave} type="button">Leave</button>
        </div>
      </div>

      <div className={styles.turnBanner}>
        <span className={[styles.turnText, currentWord ? styles.turnTextActive : ''].join(' ')}>
          {turnLabel}
        </span>
      </div>

      <div className={styles.actionMsgSlot}>
        {(status || error || lastMoveText) && (
          <div className={`${styles.actionMsg} ${error ? styles.danger : status ? styles.safe : styles.warn}`}>
            {error || status || lastMoveText}
          </div>
        )}
      </div>

      <div className={styles.gameArea}>
        <div className={styles.boardCol}>
          <Board
            rows={rows}
            path={path}
            invalidPath={invalidPath}
            lastMoveTiles={lastMoveTiles}
            lastMoveAction={lastMoveAction}
            animationCycle={`${boardState?.version || 0}-${lastMoveAction}`}
            onTilePointerDown={handleBoardPointerDown}
            onTilePointerEnter={handlePointerEnter}
            onTileClick={handleBoardTileClick}
          />

          <div className={styles.boardActions}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!isMyTurn || path.length < 3 || submitting}
              type="button"
            >
              {submitting ? 'Casting...' : `Cast for +${selectedScore}`}
            </button>
            <button className={styles.clearBtn} onClick={clearSelection} disabled={!isMyTurn} type="button">
              Clear Path
            </button>
          </div>

          <div className={styles.utilityActions}>
            <button
              className={styles.utilityBtn}
              onClick={handleHint}
              disabled={!isMyTurn || !boardState || submitting || hintUsedThisTurn}
              aria-label="Hint"
              title="Hint"
              type="button"
            >
              💡
            </button>
            <button
              className={styles.utilityBtn}
              onClick={handleShuffle}
              disabled={!isMyTurn || !boardState || submitting || shuffleUsedThisTurn}
              aria-label="Shuffle"
              title="Shuffle"
              type="button"
            >
              🔀
            </button>
            <button
              className={styles.utilityBtn}
              onClick={handleSwap}
              disabled={!isMyTurn || !boardState || submitting || swapUsedThisTurn}
              aria-label="Swap"
              title="Swap"
              type="button"
            >
              🔄
            </button>
          </div>
        </div>

        <div className={styles.sideCol}>
          <ScorePanel leaderboard={leaderboard} currentUid={uid} />
          <WordFeed foundWords={foundWords} players={players} />
        </div>

        <div className={styles.metricsCard}>
          <div className={styles.metricsTitle}>Rune Field</div>
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{metrics?.totalWords || 0}</div>
              <div className={styles.metricLabel}>Words on board</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{metrics?.longestWord || 0}</div>
              <div className={styles.metricLabel}>Longest word</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{metrics?.startCellCoverage || 0}</div>
              <div className={styles.metricLabel}>Start cell coverage</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{Math.round((metrics?.vowelRatio || 0) * 100)}%</div>
              <div className={styles.metricLabel}>Vowel ratio</div>
            </div>
          </div>
        </div>
      </div>

      {swapOverlayOpen && (
        <div className={styles.overlay} onClick={() => setSwapOverlayOpen(false)}>
          <div className={styles.swapCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.swapHeader}>
              <div>
                <div className={styles.swapLabel}>Swap Tile</div>
                <div className={styles.swapTitle}>Choose a replacement letter</div>
              </div>
              <button className={styles.swapClose} onClick={() => setSwapOverlayOpen(false)} type="button">
                ×
              </button>
            </div>

            <div className={styles.swapPreviewRow}>
              <div className={styles.swapPreviewTile}>{rows.flat()[path[0]]?.toUpperCase()}</div>
              <div className={styles.swapPreviewText}>Selected rune</div>
            </div>

            <div className={styles.swapGrid}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
                const lower = letter.toLowerCase()
                const disabled = rows.flat()[path[0]] === lower
                return (
                  <button
                    key={letter}
                    className={styles.swapLetterBtn}
                    onClick={() => handleSwapLetterPick(lower)}
                    disabled={disabled || submitting}
                    type="button"
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}
