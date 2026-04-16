import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startGame, leaveRoom, updateVehicle } from '../../db'
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

  async function handleVehicleChange(colorId, styleId) {
    await updateVehicle(roomCode, uid, colorId, styleId)
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tron Lobby</h1>

      <RoomCodeDisplay roomCode={roomCode} />

      <div className={styles.playerSection}>
        <p className={styles.playerCount}>
          {connectedCount} / {MAX_PLAYERS} players
        </p>
        <div className={styles.playerList}>
          {playerOrder.map((id) => {
            const player = players[id]
            const color = getColorHex(player?.vehicleColor)
            return (
              <div key={id} className={styles.playerRow}>
                <span className={styles.colorDot} style={{ backgroundColor: color }} />
                <PlayerSlot
                  player={player}
                  isHost={meta.hostUid === id}
                  isMe={id === uid}
                />
              </div>
            )
          })}
        </div>
      </div>

      {me && (
        <div className={styles.customizeSection}>
          <h3 className={styles.sectionLabel}>Your Vehicle</h3>
          <VehiclePicker
            selectedColor={me.vehicleColor ?? 0}
            selectedStyle={me.vehicleStyle ?? 0}
            onColorChange={(c) => handleVehicleChange(c, me.vehicleStyle ?? 0)}
            onStyleChange={(s) => handleVehicleChange(me.vehicleColor ?? 0, s)}
          />
        </div>
      )}

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
        {!isHost && (
          <p className={styles.waitMsg}>Waiting for host to start...</p>
        )}
        <button className={styles.leaveBtn} onClick={handleLeave} type="button">
          Leave Room
        </button>
      </div>

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
