import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import CreateRoomForm from '../lobby/CreateRoomForm'
import JoinRoomForm from '../lobby/JoinRoomForm'
import styles from './MinesEntry.module.css'

export default function MinesEntry() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home')

  function handleRoomReady(roomCode) {
    navigate(`/mines/room/${roomCode}`)
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
          <span className={styles.icon}>&#128163;</span>
        </div>
        <h1 className={styles.title}>Mines</h1>
        <p className={styles.subtitle}>
          Take turns revealing tiles. Hit a bomb and you&rsquo;re out. Last player standing wins!
        </p>
      </div>

      <div className={styles.rules}>
        <h2>How to play</h2>
        <ul>
          <li>Players take turns clicking one tile each</li>
          <li>Safe tiles show the number of adjacent bombs</li>
          <li>Hit a bomb and you&rsquo;re eliminated</li>
          <li>Last surviving player wins the match</li>
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
