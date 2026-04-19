import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startGame, leaveRoom } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { MIN_PLAYERS, MAX_PLAYERS } from '../../constants/gameConfig'
import SettingsPanel from '../lobby/SettingsPanel'
import Avatar from '@/components/shared/Avatar'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const { players, playerOrder, meta, isHost, me, connectedPlayers } = useGameState(room, uid)

  const connectedCount = connectedPlayers.length

  async function handleStart() {
    if (connectedCount < MIN_PLAYERS) {
      setError(`Need exactly ${MIN_PLAYERS} players to start`)
      return
    }
    setStarting(true)
    setError('')
    try {
      await startGame(roomCode, connectedPlayers)
    } catch (err) {
      setError(err.message || 'Could not start game')
      setStarting(false)
    }
  }

  async function handleLeave() {
    await leaveRoom(roomCode, uid)
    navigate('/chess')
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Not Chess Lobby</h1>

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
        <p className={styles.playerCount}>{connectedCount} / {MAX_PLAYERS} players</p>
        <div className={styles.playerList}>
          {playerOrder.map((id) => {
            const player = players[id]
            if (!player || player.connected === false) return null
            return (
              <div key={id} className={styles.playerRow}>
                <Avatar avatarId={player.avatarId} size={36} />
                <span className={styles.playerName}>
                  {player.username}
                  {meta.hostUid === id && <span className={styles.hostBadge}>Host</span>}
                  {id === uid && <span className={styles.youBadge}>You</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <SettingsPanel roomCode={roomCode} meta={meta} isHost={isHost} />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {isHost && (
          <button
            className={styles.startBtn}
            onClick={handleStart}
            disabled={starting || connectedCount < MIN_PLAYERS}
          >
            {starting ? 'Starting...' : 'Start Game'}
          </button>
        )}
        {!isHost && <p className={styles.waitMsg}>Waiting for host to start...</p>}
        <button className={styles.leaveBtn} onClick={handleLeave} type="button">Leave Room</button>
      </div>

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}
