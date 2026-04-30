import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import CreateRoomForm from '../lobby/CreateRoomForm'
import JoinRoomForm from '../lobby/JoinRoomForm'
import styles from './FlappyEntry.module.css'

export default function FlappyEntry() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home')

  function handleRoomReady(roomCode) {
    navigate(`/flappy/room/${roomCode}`)
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
          <span className={styles.icon}>&#128038;</span>
        </div>
        <h1 className={styles.title}>Not Flappy Bird</h1>
        <p className={styles.subtitle}>
          Fly an endless pipe course side by side. Push for the highest score.
        </p>
      </div>

      <div className={styles.rules}>
        <h2>How to play <span className={styles.playerInfo}>(1-6 players)</span></h2>
        <ul>
          <li>Everyone flies through the same endless pipe layout at the same time</li>
          <li>Press space, click, or tap your panel to flap</li>
          <li>Your score is the number of pipes passed</li>
          <li>If scores tie, the player who survived longer ranks higher</li>
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
