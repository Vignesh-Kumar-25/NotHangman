import { useState } from 'react'
import { createRoom } from '../../db'
import AvatarPicker from '@/components/shared/AvatarPicker'
import { DEFAULT_AVATAR_ID } from '@/constants/avatars'
import styles from './RoomForm.module.css'

export default function CreateRoomForm({ uid, onBack, onCreated }) {
  const [username, setUsername] = useState('')
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const name = username.trim()
    if (!name) { setError('Enter a username'); return }
    if (name.length > 20) { setError('Username too long (max 20 chars)'); return }

    setLoading(true)
    setError('')
    try {
      const roomCode = await createRoom(uid, name, avatarId)
      onCreated(roomCode)
    } catch (err) {
      setError(err.message || 'Failed to create room')
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <button className={styles.backBtn} onClick={onBack} type="button">← Back</button>
      <h2 className={styles.heading}>Create a Room</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="username">Your name</label>
          <input
            id="username"
            type="text"
            placeholder="Enter username…"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label>Pick an avatar</label>
          <AvatarPicker selected={avatarId} onChange={setAvatarId} />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Creating…' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}
