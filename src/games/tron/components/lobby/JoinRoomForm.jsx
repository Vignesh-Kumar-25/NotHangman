import { useState } from 'react'
import { joinRoom } from '../../db'
import AvatarPicker from '@/components/shared/AvatarPicker'
import { DEFAULT_AVATAR_ID } from '@/constants/avatars'
import VehiclePicker from './VehiclePicker'
import { DEFAULT_VEHICLE_COLOR, DEFAULT_VEHICLE_STYLE } from '../../constants/vehicles'
import { normalizeRoomCode } from '@/utils/roomCode'
import styles from './RoomForm.module.css'

export default function JoinRoomForm({ uid, onBack, onJoined }) {
  const [roomCode, setRoomCode] = useState('')
  const [username, setUsername] = useState('')
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID)
  const [vehicleColor, setVehicleColor] = useState(DEFAULT_VEHICLE_COLOR)
  const [vehicleStyle, setVehicleStyle] = useState(DEFAULT_VEHICLE_STYLE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const name = username.trim()
    const code = normalizeRoomCode(roomCode)
    if (!code || code.length !== 6) { setError('Enter a 6-character room code'); return }
    if (!name) { setError('Enter a username'); return }
    if (name.length > 20) { setError('Username too long (max 20 chars)'); return }

    setLoading(true)
    setError('')
    try {
      await joinRoom(code, uid, name, avatarId, vehicleColor, vehicleStyle)
      onJoined(code)
    } catch (err) {
      setError(err.message || 'Could not join room')
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <button className={styles.backBtn} onClick={onBack} type="button">&larr; Back</button>
      <h2 className={styles.heading}>Join a Room</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="roomCode">Room code</label>
          <input
            id="roomCode"
            type="text"
            placeholder="XXXXXX"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoComplete="off"
            autoFocus
            className={styles.codeInput}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="username">Your name</label>
          <input
            id="username"
            type="text"
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label>Pick an avatar</label>
          <AvatarPicker selected={avatarId} onChange={setAvatarId} />
        </div>

        <VehiclePicker
          selectedColor={vehicleColor}
          selectedStyle={vehicleStyle}
          onColorChange={setVehicleColor}
          onStyleChange={setVehicleStyle}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}
