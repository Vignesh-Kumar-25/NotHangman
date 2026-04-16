import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startGame, leaveRoom, updateVehicle, getUsedColors } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import RoomCodeDisplay from '@/games/hangman/components/lobby/RoomCodeDisplay'
import PlayerSlot from '@/games/hangman/components/lobby/PlayerSlot'
import SettingsPanel from '../lobby/SettingsPanel'
import VehiclePicker from '../lobby/VehiclePicker'
import ChatPanel from '@/components/chat/ChatPanel'
import { MIN_PLAYERS, MAX_PLAYERS } from '../../constants/gameConfig'
import { getColorHex } from '../../constants/vehicles'
import styles from './LobbyScreen.module.css'

export default function LobbyScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const { players, playerOrder, meta, isHost, me } = useGameState(room, uid)

  const connectedCount = playerOrder.filter((id) => players[id]?.connected !== false).length
  const usedColors = getUsedColors(players)
  const myColor = me?.vehicleColor ?? 0

  async function handleStart() {
    if (connectedCount < MIN_PLAYERS) {
      setError(`Need at least ${MIN_PLAYERS} players to start`)
      return
    }
    setStarting(true)
    setError('')
    try {
      await startGame(roomCode, playerOrder, meta)
    } catch (err) {
      setError(err.message || 'Could not start game')
      setStarting(false)
    }
  }

  async function handleLeave() {
    await leaveRoom(roomCode, uid)
    navigate('/tron')
  }

  async function handleColorChange(colorId) {
    // Block if color is taken by another player
    const othersColors = Object.entries(players)
      .filter(([id, p]) => id !== uid && p.connected !== false)
      .map(([, p]) => p.vehicleColor)
    if (othersColors.includes(colorId)) return
    await updateVehicle(roomCode, uid, colorId, me?.vehicleStyle ?? 0)
  }

  async function handleStyleChange(styleId) {
    await updateVehicle(roomCode, uid, me?.vehicleColor ?? 0, styleId)
  }

  // Build set of disabled colors (taken by other players)
  const disabledColors = new Set()
  Object.entries(players).forEach(([id, p]) => {
    if (id !== uid && p.connected !== false) {
      disabledColors.add(p.vehicleColor)
    }
  })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tron Lobby</h1>
      <RoomCodeDisplay roomCode={roomCode} />

      <div className={styles.playerSection}>
        <p className={styles.playerCount}>{connectedCount} / {MAX_PLAYERS} players</p>
        <div className={styles.playerList}>
          {playerOrder.map((id) => {
            const player = players[id]
            const color = getColorHex(player?.vehicleColor)
            return (
              <div key={id} className={styles.playerRow}>
                <span className={styles.colorDot} style={{ backgroundColor: color }} />
                <PlayerSlot player={player} isHost={meta.hostUid === id} isMe={id === uid} />
              </div>
            )
          })}
        </div>
      </div>

      {me && (
        <div className={styles.customizeSection}>
          <h3 className={styles.sectionLabel}>Your Vehicle</h3>
          <VehiclePicker
            selectedColor={myColor}
            selectedStyle={me.vehicleStyle ?? 0}
            onColorChange={handleColorChange}
            onStyleChange={handleStyleChange}
            disabledColors={disabledColors}
          />
        </div>
      )}

      <SettingsPanel roomCode={roomCode} meta={meta} isHost={isHost} />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {isHost && (
          <button className={styles.startBtn} onClick={handleStart}
            disabled={starting || connectedCount < MIN_PLAYERS}>
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
