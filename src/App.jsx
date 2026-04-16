import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import HomeScreen from './components/screens/HomeScreen'
import HangmanEntry from './games/hangman/components/screens/HangmanEntry'
import RoomRoute from './games/hangman/components/screens/RoomRoute'
import TronEntry from './games/tron/components/screens/TronEntry'
import TronRoomRoute from './games/tron/components/screens/TronRoomRoute'
import LoadingSpinner from './components/shared/LoadingSpinner'

export default function App() {
  const { uid, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/hangman" element={<HangmanEntry />} />
      <Route path="/room/:roomCode" element={<RoomRoute uid={uid} />} />
      <Route path="/tron" element={<TronEntry />} />
      <Route path="/tron/room/:roomCode" element={<TronRoomRoute uid={uid} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
