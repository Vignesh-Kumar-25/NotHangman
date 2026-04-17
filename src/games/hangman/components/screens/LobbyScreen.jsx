import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '@/hooks/useChat'
import { startGame, leaveRoom, setRoomNumRounds, setRoomTurnDuration, setRoomCategories, voteToKick } from '../../db'
import { getCategories } from '../../utils/wordUtils'
import { useGameState } from '../../hooks/useGameState'
import RoomCodeDisplay from '../lobby/RoomCodeDisplay'
import PlayerSlot from '../lobby/PlayerSlot'
import { MIN_PLAYERS, MAX_PLAYERS, DEFAULT_NUM_ROUNDS, MAX_NUM_ROUNDS, TURN_DURATION, TURN_DURATION_OPTIONS } from '../../constants/gameConfig'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const { players, playerOrder, meta, isHost } = useGameState(room, uid)
  const kickVotes = room?.kickVotes || {}

  const connectedCount = playerOrder.filter((id) => players[id]?.connected !== false).length
  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS
  const turnDuration = meta?.turnDuration ?? TURN_DURATION
  const allCategories = getCategories()
  const selectedCategories = meta?.categories || allCategories // null means all

  // Chat bubble tracking for lobby
  const chatMessages = useChat(roomCode)
  const [chatBubbles, setChatBubbles] = useState({})
  const prevMsgCountRef = useRef(null)

  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return
    if (prevMsgCountRef.current === null) {
      prevMsgCountRef.current = chatMessages.length
      return
    }
    if (chatMessages.length <= prevMsgCountRef.current) {
      prevMsgCountRef.current = chatMessages.length
      return
    }
    const newMsgs = chatMessages.slice(prevMsgCountRef.current)
    prevMsgCountRef.current = chatMessages.length

    for (const msg of newMsgs) {
      setChatBubbles((prev) => ({ ...prev, [msg.uid]: msg.text }))
      const msgUid = msg.uid
      setTimeout(() => {
        setChatBubbles((prev) => {
          const next = { ...prev }
          delete next[msgUid]
          return next
        })
      }, 3000)
    }
  }, [chatMessages?.length])

  async function handleStart() {
    if (connectedCount < MIN_PLAYERS) {
      setError(`Need at least ${MIN_PLAYERS} players to start`)
      return
    }
    setStarting(true)
    setError('')
    try {
      await startGame(roomCode, playerOrder, numRounds)
    } catch (err) {
      setError(err.message || 'Could not start game')
      setStarting(false)
    }
  }

  async function handleLeave() {
    await leaveRoom(roomCode, uid)
    navigate('/')
  }

  async function handleRoundsChange(delta) {
    const next = Math.min(MAX_NUM_ROUNDS, Math.max(1, numRounds + delta))
    if (next !== numRounds) await setRoomNumRounds(roomCode, next)
  }

  async function handleCategoryToggle(cat) {
    const current = meta?.categories || allCategories
    const isSelected = current.includes(cat)
    let next
    if (isSelected) {
      next = current.filter((c) => c !== cat)
      if (next.length === 0) return // must have at least one
    } else {
      next = [...current, cat]
    }
    // If all selected, store null (means "all")
    const toStore = next.length === allCategories.length ? null : next
    await setRoomCategories(roomCode, toStore)
  }

  async function handleTurnDurationChange(delta) {
    const idx = TURN_DURATION_OPTIONS.indexOf(turnDuration)
    const nextIdx = Math.min(TURN_DURATION_OPTIONS.length - 1, Math.max(0, (idx === -1 ? 2 : idx) + delta))
    const next = TURN_DURATION_OPTIONS[nextIdx]
    if (next !== turnDuration) await setRoomTurnDuration(roomCode, next)
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Lobby</h1>

      <RoomCodeDisplay roomCode={roomCode} />

      <div className={styles.playerSection}>
        <p className={styles.playerCount}>
          {connectedCount} / {MAX_PLAYERS} players
        </p>
        <div className={styles.playerList}>
          {playerOrder.map((id) => (
            <PlayerSlot
              key={id}
              player={players[id]}
              isHost={meta.hostUid === id}
              isMe={id === uid}
              canKick={connectedCount > 2}
              kickVotes={kickVotes[id] ? Object.keys(kickVotes[id]).length : 0}
              onKick={(targetUid) => voteToKick(roomCode, uid, targetUid)}
              chatBubble={chatBubbles[id] || null}
            />
          ))}
        </div>
      </div>

      {/* Rounds picker — host only */}
      <div className={styles.roundsSection}>
        <p className={styles.roundsLabel}>Rounds</p>
        <div className={styles.roundsPicker}>
          {isHost ? (
            <>
              <button
                className={styles.roundsBtn}
                onClick={() => handleRoundsChange(-1)}
                disabled={numRounds <= 1}
              >−</button>
              <span className={styles.roundsValue}>{numRounds}</span>
              <button
                className={styles.roundsBtn}
                onClick={() => handleRoundsChange(1)}
                disabled={numRounds >= MAX_NUM_ROUNDS}
              >+</button>
            </>
          ) : (
            <span className={styles.roundsValue}>{numRounds}</span>
          )}
        </div>
        <p className={styles.roundsHint}>
          1 round = every player guesses once ({connectedCount * numRounds} turns total)
        </p>
      </div>

      {/* Turn duration picker — host only */}
      <div className={styles.roundsSection}>
        <p className={styles.roundsLabel}>Turn Timer</p>
        <div className={styles.roundsPicker}>
          {isHost ? (
            <>
              <button
                className={styles.roundsBtn}
                onClick={() => handleTurnDurationChange(-1)}
                disabled={turnDuration <= TURN_DURATION_OPTIONS[0]}
              >−</button>
              <span className={styles.roundsValue}>{turnDuration}s</span>
              <button
                className={styles.roundsBtn}
                onClick={() => handleTurnDurationChange(1)}
                disabled={turnDuration >= TURN_DURATION_OPTIONS[TURN_DURATION_OPTIONS.length - 1]}
              >+</button>
            </>
          ) : (
            <span className={styles.roundsValue}>{turnDuration}s</span>
          )}
        </div>
        <p className={styles.roundsHint}>
          Seconds per turn
        </p>
      </div>

      {/* Category picker — host only */}
      <div className={styles.roundsSection}>
        <p className={styles.roundsLabel}>Categories</p>
        <div className={styles.categoryPicker}>
          {allCategories.map((cat) => {
            const active = selectedCategories.includes(cat)
            const ICONS = { movies: '🎬', animals: '🐾', countries: '🌍', anime: '⚔️', catchphrases: '💬', pokemon: '⚡', bangalore: '🏙️' }
            const icon = ICONS[cat] || '❓'
            return (
              <button
                key={cat}
                className={[styles.categoryBtn, active ? styles.categoryActive : ''].join(' ')}
                onClick={() => isHost && handleCategoryToggle(cat)}
                disabled={!isHost || (active && selectedCategories.length <= 1)}
                title={cat}
              >
                {icon} {cat}
              </button>
            )
          })}
        </div>
        <p className={styles.roundsHint}>
          {selectedCategories.length === allCategories.length ? 'Random (all categories)' : selectedCategories.join(', ')}
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {isHost && (
          <button
            className={styles.startBtn}
            onClick={handleStart}
            disabled={starting || connectedCount < MIN_PLAYERS}
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        )}
        {!isHost && (
          <p className={styles.waitMsg}>Waiting for host to start…</p>
        )}
        <button className={styles.leaveBtn} onClick={handleLeave} type="button">
          Leave Room
        </button>
      </div>
    </div>
  )
}
