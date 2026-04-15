import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startGame, leaveRoom, setRoomNumRounds } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import RoomCodeDisplay from '../lobby/RoomCodeDisplay'
import PlayerSlot from '../lobby/PlayerSlot'
import { MIN_PLAYERS, MAX_PLAYERS, DEFAULT_NUM_ROUNDS, MAX_NUM_ROUNDS } from '../../constants/gameConfig'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const { players, playerOrder, meta, isHost } = useGameState(room, uid)

  const connectedCount = playerOrder.filter((id) => players[id]?.connected !== false).length
  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS

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
