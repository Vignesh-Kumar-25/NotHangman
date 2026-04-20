import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import {
  DEFAULT_NUM_ROUNDS,
  DEFAULT_TURN_TIMER_SECONDS,
  MAX_PLAYERS,
  MAX_TURN_TIMER_SECONDS,
  MIN_TURN_TIMER_POWER_UP_SECONDS,
  MIN_TURN_TIMER_SECONDS,
  ROUND_OPTIONS,
  TURN_TIMER_STEP_SECONDS,
} from '../../constants/gameConfig'
import { leaveRoom, setRoomNumRounds, setRoomTurnTimer, setTurnTimerPowerUpEnabled, startGame } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { players, playerOrder, meta, isHost, me, connectedPlayers } = useGameState(room, uid)
  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS
  const turnTimerSeconds = meta?.turnTimerSeconds ?? DEFAULT_TURN_TIMER_SECONDS
  const turnTimerPowerUpEnabled = Boolean(meta?.turnTimerPowerUpEnabled)
  const canEnableTurnTimerPowerUp = turnTimerSeconds >= MIN_TURN_TIMER_POWER_UP_SECONDS

  async function handleStart() {
    setStarting(true)
    setError('')
    try {
      await startGame(roomCode)
    } catch (err) {
      setError(err.message || 'Could not start game')
      setStarting(false)
    }
  }

  async function handleLeave() {
    await leaveRoom(roomCode, uid)
    navigate('/spellcast')
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore clipboard failures
    }
  }

  async function handleRoundsChange(next) {
    if (next !== numRounds) {
      await setRoomNumRounds(roomCode, next)
    }
  }

  async function handleTurnTimerChange(delta) {
    const next = Math.max(
      MIN_TURN_TIMER_SECONDS,
      Math.min(MAX_TURN_TIMER_SECONDS, turnTimerSeconds + delta)
    )
    if (next !== turnTimerSeconds) {
      await setRoomTurnTimer(roomCode, next)
      if (next < MIN_TURN_TIMER_POWER_UP_SECONDS && turnTimerPowerUpEnabled) {
        await setTurnTimerPowerUpEnabled(roomCode, false)
      }
    }
  }

  async function handleTurnTimerPowerUpToggle(next) {
    if (!canEnableTurnTimerPowerUp) return
    await setTurnTimerPowerUpEnabled(roomCode, next)
  }

  function formatTurnTime(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds % 60 === 0) return `${seconds / 60}m`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Not Spellcast Lobby</h1>

      <div className={styles.roomCodeSection}>
        <span className={styles.roomCodeLabel}>Room Code</span>
        <div className={styles.roomCodeRow}>
          <span className={styles.roomCode}>{roomCode}</span>
          <button className={styles.copyBtn} onClick={handleCopyCode}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className={styles.playerSection}>
        <span className={styles.playerCount}>{connectedPlayers.length} / {MAX_PLAYERS} mages</span>
        <div className={styles.playerList}>
          {playerOrder.map((playerId) => {
            const player = players[playerId]
            if (!player || player.connected === false) return null

            return (
              <div key={playerId} className={styles.playerRow}>
                <Avatar avatarId={player.avatarId} size={36} />
                <span className={styles.playerName}>
                  {player.username}
                  {meta.hostUid === playerId && <span className={styles.hostBadge}>Host</span>}
                  {uid === playerId && <span className={styles.youBadge}>You</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.roundsSection}>
        <p className={styles.roundsLabel}>Rounds</p>
        <div className={styles.roundsPicker}>
          {isHost ? (
            ROUND_OPTIONS.map((roundOption) => (
              <button
                key={roundOption}
                className={`${styles.optionBox} ${roundOption === numRounds ? styles.optionBoxActive : ''}`}
                onClick={() => handleRoundsChange(roundOption)}
                type="button"
              >
                {roundOption}
              </button>
            ))
          ) : (
            <span className={styles.roundsValue}>{numRounds}</span>
          )}
        </div>
        <p className={styles.roundsHint}>
          1 round = every connected player gets one cast turn
        </p>
      </div>

      <div className={styles.roundsSection}>
        <p className={styles.roundsLabel}>Turn Timer</p>
        <div className={styles.roundsPicker}>
          {isHost ? (
            <>
              <button
                className={styles.stepBtn}
                onClick={() => handleTurnTimerChange(-TURN_TIMER_STEP_SECONDS)}
                disabled={turnTimerSeconds <= MIN_TURN_TIMER_SECONDS}
                type="button"
              >
                -
              </button>
              <span className={styles.roundsValue}>{formatTurnTime(turnTimerSeconds)}</span>
              <button
                className={styles.stepBtn}
                onClick={() => handleTurnTimerChange(TURN_TIMER_STEP_SECONDS)}
                disabled={turnTimerSeconds >= MAX_TURN_TIMER_SECONDS}
                type="button"
              >
                +
              </button>
            </>
          ) : (
            <span className={styles.roundsValue}>{formatTurnTime(turnTimerSeconds)}</span>
          )}
        </div>
        <p className={styles.roundsHint}>
          Timer power-up duration. Changes in 5-second steps.
        </p>
      </div>

      <div className={styles.roundsSection}>
        <p className={styles.roundsLabel}>Timer Power-Up</p>
        <div className={styles.roundsPicker}>
          {isHost ? (
            <>
              <button
                className={`${styles.optionBox} ${turnTimerPowerUpEnabled ? styles.optionBoxActive : ''}`}
                onClick={() => handleTurnTimerPowerUpToggle(true)}
                disabled={!canEnableTurnTimerPowerUp}
                type="button"
              >
                Enabled
              </button>
              <button
                className={`${styles.optionBox} ${!turnTimerPowerUpEnabled ? styles.optionBoxActive : ''}`}
                onClick={() => handleTurnTimerPowerUpToggle(false)}
                disabled={!canEnableTurnTimerPowerUp}
                type="button"
              >
                Disabled
              </button>
            </>
          ) : (
            <span className={styles.roundsValue}>
              {turnTimerPowerUpEnabled && canEnableTurnTimerPowerUp ? 'On' : 'Off'}
            </span>
          )}
        </div>
        <p className={styles.roundsHint}>
          Disabled by default. Unavailable when the timer is below {MIN_TURN_TIMER_POWER_UP_SECONDS} seconds.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {isHost ? (
          <button className={styles.startBtn} onClick={handleStart} disabled={starting}>
            {starting ? 'Starting...' : 'Start Match'}
          </button>
        ) : (
          <p className={styles.waitMsg}>Waiting for the host to begin the match...</p>
        )}
        <button className={styles.leaveBtn} onClick={handleLeave} type="button">Leave Room</button>
      </div>

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}
