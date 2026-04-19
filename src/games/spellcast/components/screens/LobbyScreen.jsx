import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import { DEFAULT_NUM_ROUNDS, MAX_NUM_ROUNDS, MAX_PLAYERS, MIN_NUM_ROUNDS } from '../../constants/gameConfig'
import { leaveRoom, setRoomNumRounds, startGame } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { players, playerOrder, meta, isHost, me, connectedPlayers } = useGameState(room, uid)
  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS

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

  async function handleRoundsChange(delta) {
    const next = Math.min(MAX_NUM_ROUNDS, Math.max(MIN_NUM_ROUNDS, numRounds + delta))
    if (next !== numRounds) {
      await setRoomNumRounds(roomCode, next)
    }
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
            <>
              <button
                className={styles.roundsBtn}
                onClick={() => handleRoundsChange(-1)}
                disabled={numRounds <= MIN_NUM_ROUNDS}
                type="button"
              >
                -
              </button>
              <span className={styles.roundsValue}>{numRounds}</span>
              <button
                className={styles.roundsBtn}
                onClick={() => handleRoundsChange(1)}
                disabled={numRounds >= MAX_NUM_ROUNDS}
                type="button"
              >
                +
              </button>
            </>
          ) : (
            <span className={styles.roundsValue}>{numRounds}</span>
          )}
        </div>
        <p className={styles.roundsHint}>
          1 round = every connected player gets one cast turn
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
