import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import CreateRoomForm from '../lobby/CreateRoomForm'
import JoinRoomForm from '../lobby/JoinRoomForm'
import styles from './SpellcastEntry.module.css'

export default function SpellcastEntry() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home')

  function handleRoomReady(roomCode) {
    navigate(`/spellcast/room/${roomCode}`)
  }

  if (view === 'create') {
    return (
      <div className={styles.page}>
        <CreateRoomForm uid={uid} onBack={() => setView('home')} onCreated={handleRoomReady} />
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className={styles.page}>
        <JoinRoomForm uid={uid} onBack={() => setView('home')} onJoined={handleRoomReady} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/')}>← Back</button>

      <div className={styles.hero}>
        <span className={styles.icon}>&#10024;</span>
        <h1 className={styles.title}>Spellcast</h1>
        <p className={styles.subtitle}>
          Build words on a shared grid. Use gems for powerful abilities!
        </p>
      </div>

      <div className={styles.rules}>
        <h2>How to play</h2>
        <ul>
          <li>Drag to connect adjacent letters into words</li>
          <li>Longer words and rare letters score more</li>
          <li>Collect gems from special tiles</li>
          <li>Spend gems on Shuffle, Swap, or Hint</li>
          <li>Highest score after 5 rounds wins!</li>
        </ul>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnCreate} onClick={() => setView('create')}>
          Create Room
        </button>
        <button className={styles.btnJoin} onClick={() => setView('join')}>
          Join Room
        </button>
      </div>
    </div>
  )
}
