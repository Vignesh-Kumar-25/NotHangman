import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import CreateRoomForm from '../lobby/CreateRoomForm'
import JoinRoomForm from '../lobby/JoinRoomForm'
import styles from './ChessEntry.module.css'

export default function ChessEntry() {
  const { uid } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('home')

  function handleRoomReady(roomCode) {
    navigate(`/chess/room/${roomCode}`)
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
          <span className={styles.icon}>&#9819;</span>
        </div>
        <h1 className={styles.title}>Mini Chess</h1>
        <p className={styles.subtitle}>
          Strategic chess on a compact 5&times;8 board. Outsmart your opponent in tight quarters!
        </p>
      </div>

      <div className={styles.rules}>
        <h2>How to play</h2>
        <ul>
          <li>5-file, 8-rank board with King, Queen, Rook, Bishop, Knight &amp; 5 Pawns</li>
          <li>Standard chess movement rules apply</li>
          <li>No castling, no en passant</li>
          <li>Pawns can promote at the last rank</li>
          <li>Checkmate your opponent to win</li>
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
