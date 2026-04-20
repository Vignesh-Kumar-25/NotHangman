import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatPanel from '@/components/chat/ChatPanel'
import Board from '../game/Board'
import ScorePanel from '../game/ScorePanel'
import WordFeed from '../game/WordFeed'
import {
  expireTurnTimer,
  finishMatch,
  leaveRoom,
  reshuffleBoard,
  submitWord,
  swapLetter,
  triggerTurnTimer,
  updateLiveSelection,
  useHint,
} from '../../db'
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
import {
  MIN_TURN_TIMER_POWER_UP_SECONDS,
  POWER_UP_GEM_COSTS,
  SHOW_RUNE_FIELD_BOX,
  TURN_TIMER_POWER_UP_DISABLE_THRESHOLD_SECONDS,
} from '../../constants/gameConfig'
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
  const [displayRows, setDisplayRows] = useState([])
  const [castPreview, setCastPreview] = useState({ version: null, path: [], phase: null })
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const invalidTimerRef = useRef(null)
  const castTimersRef = useRef([])
  const timerExpiryRequestedRef = useRef(null)
  const prevBoardStateRef = useRef(null)
  const prevLastMoveCreatedAtRef = useRef(null)
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
    currentTurnUid,
    currentPlayer,
    isMyTurn,
    turnUtilityUsage,
    liveSelection,
    turnTimer,
    turnTimerSeconds,
    turnTimerPowerUpEnabled,
    gemBalances,
    myGemBalance,
    myUtilityStock,
  } = useGameState(room, uid)
  const rows = boardState?.rows || []
  const {
    path,
    currentWord,
    handlePointerDown,
    handlePointerEnter,
    handleTileClick,
    endSelection,
    clearSelection,
  } = useBoardSelection(rows)

  const lastMoveAction = game?.lastMove?.action || 'cast'
  const isBoardAnimating = castPreview.phase === 'preview'
  const remoteSelectionPath = useMemo(() => {
    if (!boardState || !liveSelection || liveSelection.uid === uid) return []
    if (liveSelection.uid !== currentTurnUid) return []
    if (liveSelection.boardVersion !== boardState.version) return []
    return liveSelection.path || []
  }, [boardState, currentTurnUid, liveSelection, uid])
  const lastMoveTiles = useMemo(() => {
    if (!game?.lastMove || hideLastMovePath) return []
    if (lastMoveAction === 'cast' && castPreview.path.length) {
      return castPreview.path
    }
    if (game.lastMove.action === 'shuffle') {
      return rows.flat().map((_, index) => index)
    }
    if (game.lastMove.action === 'swap') {
      return Number.isInteger(game.lastMove.tileIndex) ? [game.lastMove.tileIndex] : []
    }
    return game.lastMove.path || []
  }, [castPreview.path, game?.lastMove, hideLastMovePath, lastMoveAction, rows])
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
    if (game.lastMove.action === 'turn_timer') {
      const timedPlayerName = players[game.lastMove.turnUid]?.username || 'A mage'
      return `${playerName} triggered a 10s timer on ${timedPlayerName}.`
    }
    if (game.lastMove.action === 'turn_timeout') {
      const timedPlayerName = players[game.lastMove.turnUid]?.username || 'A mage'
      return `${timedPlayerName}'s timer expired, turn passed.`
    }
    const gemSuffix = game.lastMove.gemsCollected ? ` and +${game.lastMove.gemsCollected} gems` : ''
    return `${playerName} cast ${game.lastMove.word.toUpperCase()} for +${game.lastMove.score}${gemSuffix}.`
  }, [game?.lastMove, players])
  const turnLabel = currentWord
    ? `Tracing ${currentWord} (${selectedLength} letters)`
    : isMyTurn
      ? 'Your turn. Drag across adjacent runes to build a word'
      : `${currentPlayer?.username || 'Another mage'}'s turn`
  const hintUsedThisTurn = Boolean(turnUtilityUsage?.hint)
  const shuffleUsedThisTurn = Boolean(turnUtilityUsage?.shuffle)
  const swapUsedThisTurn = Boolean(turnUtilityUsage?.swap)
  const hasActiveTurnTimer = Boolean(turnTimer?.turnUid === currentTurnUid)
  const timerTargetName = turnTimer?.turnUid ? players[turnTimer.turnUid]?.username || 'A mage' : ''
  const timerTriggerName = turnTimer?.uid ? players[turnTimer.uid]?.username || 'A mage' : ''
  const timerRemainingMs = hasActiveTurnTimer ? Math.max(0, (turnTimer.endsAt || 0) - timerNow) : 0
  const showTurnTimer = hasActiveTurnTimer && timerRemainingMs > 0
  const hasTriggeredTurnTimer = hasActiveTurnTimer && turnTimer?.uid && turnTimer.uid !== 'system'
  const showTriggeredTurnTimer = hasTriggeredTurnTimer && timerRemainingMs > 0
  const timerProgress = hasActiveTurnTimer && turnTimer.startedAt && turnTimer.endsAt
    ? Math.max(0, Math.min(1, timerRemainingMs / Math.max(1, turnTimer.endsAt - turnTimer.startedAt)))
    : 0
  const isTurnTimerCritical = showTriggeredTurnTimer && timerRemainingMs <= 10000
  const gemCount = myGemBalance || 0
  const hintCount = myUtilityStock?.hint || 0
  const shuffleCount = myUtilityStock?.shuffle || 0
  const swapCount = myUtilityStock?.swap || 0
  const canUseTurnTimerPowerUp = turnTimerPowerUpEnabled && turnTimerSeconds >= MIN_TURN_TIMER_POWER_UP_SECONDS
  const turnTimerPowerUpBlockedByRemainingTime =
    hasActiveTurnTimer && timerRemainingMs < TURN_TIMER_POWER_UP_DISABLE_THRESHOLD_SECONDS * 1000
  const actionBannerText = error || status || lastMoveText
  const actionBannerTone = error ? styles.danger : status ? styles.safe : styles.warn

  function formatTimerCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  useEffect(() => () => clearTimeout(invalidTimerRef.current), [])

  useEffect(() => {
    return () => {
      castTimersRef.current.forEach(clearTimeout)
    }
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
    if (!hasActiveTurnTimer) return undefined
    const intervalId = window.setInterval(() => setTimerNow(Date.now()), 100)
    return () => window.clearInterval(intervalId)
  }, [hasActiveTurnTimer, turnTimer?.endsAt])

  useEffect(() => {
    if (!hasActiveTurnTimer || timerRemainingMs > 0 || !turnTimer?.turnUid) return
    const requestKey = `${turnTimer.turnUid}-${turnTimer.endsAt}`
    if (timerExpiryRequestedRef.current === requestKey) return
    timerExpiryRequestedRef.current = requestKey
    expireTurnTimer(roomCode, turnTimer.turnUid, turnTimer.endsAt).catch(() => { })
  }, [hasActiveTurnTimer, roomCode, timerRemainingMs, turnTimer?.endsAt, turnTimer?.turnUid])

  useEffect(() => {
    if (hasActiveTurnTimer && timerRemainingMs > 0) return
    timerExpiryRequestedRef.current = null
  }, [hasActiveTurnTimer, timerRemainingMs, turnTimer?.turnUid])

  useEffect(() => {
    setHideLastMovePath(false)
  }, [boardState?.version])

  useEffect(() => {
    if (!boardState) {
      setDisplayRows([])
      setCastPreview({ version: null, path: [], phase: null })
      prevBoardStateRef.current = null
      prevLastMoveCreatedAtRef.current = null
      return
    }

    castTimersRef.current.forEach(clearTimeout)
    castTimersRef.current = []

    const previousBoardState = prevBoardStateRef.current
    const previousLastMoveCreatedAt = prevLastMoveCreatedAtRef.current
    const isNewBoardVersion = previousBoardState && previousBoardState.version !== boardState.version
    const isNewCastMove =
      game?.lastMove?.action === 'cast' &&
      game?.lastMove?.createdAt &&
      game.lastMove.createdAt !== previousLastMoveCreatedAt
    const castPath = game?.lastMove?.action === 'cast' ? game?.lastMove?.path || [] : []

    if (isNewBoardVersion && isNewCastMove && castPath.length && previousBoardState?.rows) {
      setDisplayRows(previousBoardState.rows)
      setCastPreview({ version: boardState.version, path: castPath, phase: 'preview' })
      castTimersRef.current.push(setTimeout(() => {
        setDisplayRows(boardState.rows || [])
        setCastPreview({ version: boardState.version, path: castPath, phase: 'afterglow' })
      }, 700))
    } else {
      setDisplayRows(boardState.rows || [])
      setCastPreview({ version: boardState.version, path: [], phase: null })
    }

    prevBoardStateRef.current = boardState
    prevLastMoveCreatedAtRef.current = game?.lastMove?.createdAt || null
  }, [boardState?.version, game?.lastMove?.createdAt])

  useEffect(() => {
    if (!isMyTurn || !boardState) return
    updateLiveSelection(roomCode, uid, path, boardState.version).catch(() => { })
  }, [boardState?.version, isMyTurn, path, roomCode, uid])

  useEffect(() => {
    endSelection()
    clearSelection()
    setInvalidPath([])
    setSwapOverlayOpen(false)
  }, [boardState?.version, currentRound, currentTurnUid, clearSelection, endSelection])

  function handleBoardPointerDown(index, pointerId) {
    if (!isMyTurn || isBoardAnimating) return
    setHideLastMovePath(true)
    handlePointerDown(index, pointerId)
  }

  function handleBoardPointerEnter(index, pointerType) {
    if (!isMyTurn || isBoardAnimating) return
    setHideLastMovePath(true)
    handlePointerEnter(index, pointerType)
  }

  function handleBoardTileClick(index) {
    if (!isMyTurn || isBoardAnimating) return
    setHideLastMovePath(true)
    handleTileClick(index)
  }

  async function handleSubmit() {
    if (!isMyTurn || isBoardAnimating) return
    if (!boardState || path.length < 3 || submitting) return
    const completedLength = path.length
    const failedPath = [...path]
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
      setInvalidPath(failedPath)
      clearSelection()
      clearTimeout(invalidTimerRef.current)
      invalidTimerRef.current = setTimeout(() => setInvalidPath([]), 500)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleShuffle() {
    if (!isMyTurn || isBoardAnimating) return
    if (!boardState || submitting || shuffleUsedThisTurn || shuffleCount <= 0 || gemCount < POWER_UP_GEM_COSTS.shuffle) return
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
    if (!isMyTurn || isBoardAnimating) return
    if (!boardState || submitting || swapUsedThisTurn || swapCount <= 0 || gemCount < POWER_UP_GEM_COSTS.swap) return
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
    if (!isMyTurn || isBoardAnimating) return
    if (!boardState || hintUsedThisTurn || hintCount <= 0 || gemCount < POWER_UP_GEM_COSTS.hint) return

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

  async function handleTurnTimer() {
    if (isMyTurn || !currentTurnUid || hasTriggeredTurnTimer || !canUseTurnTimerPowerUp || turnTimerPowerUpBlockedByRemainingTime) return
    setError('')
    setStatus('')

    try {
      await triggerTurnTimer(roomCode, uid)
    } catch (err) {
      setError(err.message || 'Timer failed')
    }
  }

  async function handleSwapLetterPick(nextLetter) {
    if (!isMyTurn || isBoardAnimating) return
    if (!boardState || path.length !== 1 || submitting || swapUsedThisTurn || swapCount <= 0 || gemCount < POWER_UP_GEM_COSTS.swap) return
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
          <span className={`${styles.stat} ${styles.roundStat}`}>Round {currentRound}/{totalRounds}</span>
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
        {actionBannerText && (
          <div className={`${styles.actionMsg} ${actionBannerTone}`}>
            {actionBannerText}
          </div>
        )}
      </div>

      {showTriggeredTurnTimer ? (
        <div className={styles.turnTimerCard}>
          <div className={styles.turnTimerRow}>
            <span className={`${styles.turnCountdown} ${isTurnTimerCritical ? styles.turnCountdownCritical : ''}`}>
              {formatTimerCountdown(timerRemainingMs)}
            </span>
          </div>
          <div className={styles.turnTimerText}>
            {`${timerTriggerName} triggered a timer on ${timerTargetName}`}
          </div>
          <div className={styles.turnTimerTrack}>
            <div
              className={styles.turnTimerFill}
              style={{ transform: `scaleX(${timerProgress})` }}
            />
          </div>
        </div>
      ) : showTurnTimer ? (
        <div className={styles.turnTimerRow}>
          <span className={styles.turnCountdown}>
            {formatTimerCountdown(timerRemainingMs)}
          </span>
        </div>
      ) : (
        <div />
      )}

      <div className={styles.gameArea}>
        <div className={styles.boardCol}>
          <Board
            rows={displayRows}
            gemTiles={boardState?.gemTiles}
            path={path}
            remotePath={remoteSelectionPath}
            invalidPath={invalidPath}
            lastMoveTiles={lastMoveTiles}
            lastMoveAction={lastMoveAction}
            lastMovePhase={castPreview.phase}
            animationCycle={`${boardState?.version || 0}-${lastMoveAction}-${castPreview.phase || 'idle'}`}
            onTilePointerDown={handleBoardPointerDown}
            onTilePointerEnter={handleBoardPointerEnter}
            onTileClick={handleBoardTileClick}
            onSelectionEnd={endSelection}
          />

          <div className={styles.boardActions}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!isMyTurn || isBoardAnimating || path.length < 3 || submitting}
              type="button"
            >
              {submitting ? 'Casting...' : `Cast for +${selectedScore}`}
            </button>
            <button
              className={styles.clearBtn}
              onClick={clearSelection}
              disabled={!isMyTurn || isBoardAnimating}
              type="button"
            >
              Clear Path
            </button>
          </div>

          <div className={styles.utilityActions}>
            <button
              className={styles.utilityBtn}
              onClick={handleHint}
              disabled={!isMyTurn || isBoardAnimating || !boardState || submitting || hintUsedThisTurn || hintCount <= 0 || gemCount < POWER_UP_GEM_COSTS.hint}
              aria-label="Hint"
              title="Hint"
              type="button"
            >
              <span className={styles.utilityBtnIcon}>{'\uD83D\uDCA1'}</span>
              <span className={styles.utilityBtnBadge}>{hintCount}</span>
              <span className={styles.utilityBtnCost}>{'\uD83D\uDC8E'} {POWER_UP_GEM_COSTS.hint}</span>
            </button>
            <button
              className={styles.utilityBtn}
              onClick={handleShuffle}
              disabled={!isMyTurn || isBoardAnimating || !boardState || submitting || shuffleUsedThisTurn || shuffleCount <= 0 || gemCount < POWER_UP_GEM_COSTS.shuffle}
              aria-label="Shuffle"
              title="Shuffle"
              type="button"
            >
              <span className={styles.utilityBtnIcon}>{'\uD83D\uDD00'}</span>
              <span className={styles.utilityBtnBadge}>{shuffleCount}</span>
              <span className={styles.utilityBtnCost}>{'\uD83D\uDC8E'} {POWER_UP_GEM_COSTS.shuffle}</span>
            </button>
            <button
              className={styles.utilityBtn}
              onClick={handleSwap}
              disabled={!isMyTurn || isBoardAnimating || !boardState || submitting || swapUsedThisTurn || swapCount <= 0 || gemCount < POWER_UP_GEM_COSTS.swap}
              aria-label="Swap"
              title="Swap"
              type="button"
            >
              <span className={styles.utilityBtnIcon}>{'\uD83D\uDD04'}</span>
              <span className={styles.utilityBtnBadge}>{swapCount}</span>
              <span className={styles.utilityBtnCost}>{'\uD83D\uDC8E'} {POWER_UP_GEM_COSTS.swap}</span>
            </button>
            <button
              className={styles.utilityBtn}
              onClick={handleTurnTimer}
              disabled={isMyTurn || !currentTurnUid || hasTriggeredTurnTimer || !canUseTurnTimerPowerUp || turnTimerPowerUpBlockedByRemainingTime}
              aria-label="Turn Timer"
              title="Turn Timer"
              type="button"
            >
              <span className={styles.utilityBtnIcon}>{'\u23F3'}</span>
              <span className={styles.utilityBtnTimerLabel}>Free</span>
            </button>
          </div>
        </div>

        <div className={styles.sideCol}>
          <ScorePanel leaderboard={leaderboard} activeUid={currentTurnUid} gemBalances={gemBalances} />
          <WordFeed foundWords={foundWords} players={players} />
        </div>

        {SHOW_RUNE_FIELD_BOX && (
          <div className={styles.metricsCard}>
            <div className={styles.metricsTitle}>Rune Field</div>
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.metricValue}>{metrics?.totalWords || 0}</div>
                <div className={styles.metricLabel}>Words on board</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>{metrics?.longestWordText ? metrics.longestWordText.toUpperCase() : '-'}</div>
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
        )}
      </div>

      <div className={styles.powerUpGuide}>
        <div className={styles.powerUpGuideTitle}>Power-Ups</div>
        <div className={styles.powerUpGuideList}>
          <div className={styles.powerUpGuideItem}>
            <span className={styles.powerUpGuideIcon}>{'\uD83D\uDCA1'}</span>
            <span className={styles.powerUpGuideText}><strong>Hint:</strong> Reveals a word that you can find on the board.</span>
          </div>
          <div className={styles.powerUpGuideItem}>
            <span className={styles.powerUpGuideIcon}>{'\uD83D\uDD00'}</span>
            <span className={styles.powerUpGuideText}><strong>Shuffle:</strong> Mixes the current board into a new accepted layout.</span>
          </div>
          <div className={styles.powerUpGuideItem}>
            <span className={styles.powerUpGuideIcon}>{'\uD83D\uDD04'}</span>
            <span className={styles.powerUpGuideText}><strong>Swap:</strong> Replaces one selected tile with a letter of your choice.</span>
          </div>
          <div className={styles.powerUpGuideItem}>
            <span className={styles.powerUpGuideIcon}>{'\u23F3'}</span>
            <span className={styles.powerUpGuideText}><strong>Turn Timer:</strong> Puts the active player on a 10 second timer (WARNING: may rage-bait the opponent).</span>
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
                {'\u00D7'}
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
