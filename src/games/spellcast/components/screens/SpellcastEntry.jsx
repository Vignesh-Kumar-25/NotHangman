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
      <button className={styles.backBtn} onClick={() => navigate('/')}>&#8592; Back</button>

      <div className={styles.hero}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>&#10024;</span>
        </div>
        <h1 className={styles.title}>Not Spellcast</h1>
        <p className={styles.subtitle}>
          Take turns tracing words on one shared rune field across 5 rounds. Casts rewrite only the path you used, so the board keeps evolving for the whole match.
        </p>
      </div>

      <div className={styles.rules}>
        <h2>How to play</h2>
        <ul>
          <li>On your turn, drag across touching tiles to cast a word</li>
          <li>Diagonal links are allowed, but you cannot reuse a tile in one cast</li>
          <li>Only a successful cast ends your turn; hint, shuffle, and swap can each be used once per turn</li>
          <li>Valid casts score points and refill only the consumed path, while the same board carries through all 5 rounds</li>
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
