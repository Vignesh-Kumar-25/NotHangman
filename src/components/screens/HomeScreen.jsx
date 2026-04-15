import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import CreateRoomForm from '../lobby/CreateRoomForm'
import JoinRoomForm from '../lobby/JoinRoomForm'
import styles from './HomeScreen.module.css'

export default function HomeScreen() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home') // 'home' | 'create' | 'join'

  function handleRoomReady(roomCode) {
    navigate(`/room/${roomCode}`)
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
      <div className={styles.hero}>
        <h1 className={styles.title}>wannaBE<br />hangman</h1>
        <p className={styles.subtitle}>
          The hangman game where your teammates choose your fate
        </p>
        <div className={styles.actions}>
          <button className={styles.btnCreate} onClick={() => setView('create')}>
            Create Room
          </button>
          <button className={styles.btnJoin} onClick={() => setView('join')}>
            Join Room
          </button>
        </div>
      </div>

      <div className={styles.rules}>
        <h2>How to play</h2>
        <ul>
          <li>Guess a letter correctly → keep your turn</li>
          <li>Guess wrong → pass to the next player</li>
          <li>Guess the full word to score big</li>
          <li>Solve a round to claim the bonus!</li>
        </ul>
      </div>
    </div>
  )
}
