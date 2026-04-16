import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import CreateRoomForm from '../lobby/CreateRoomForm'
import JoinRoomForm from '../lobby/JoinRoomForm'
import styles from './TronEntry.module.css'

export default function TronEntry() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home')

  function handleRoomReady(roomCode) {
    navigate(`/tron/room/${roomCode}`)
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
          <span className={styles.icon}>&#127939;</span>
        </div>
        <h1 className={styles.title}>Tron</h1>
        <p className={styles.subtitle}>
          Drive your light cycle and trap opponents in your trail
        </p>
      </div>

      <div className={styles.rules}>
        <h2>How to play</h2>
        <ul>
          <li>Drive your vehicle &mdash; it leaves a trail behind</li>
          <li>Use <kbd>A</kbd> / <kbd>D</kbd> to turn left and right</li>
          <li>Make opponents crash into your trail</li>
          <li>Last player standing wins the round!</li>
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
