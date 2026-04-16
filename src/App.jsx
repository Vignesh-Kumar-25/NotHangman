import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import HomeScreen from './components/screens/HomeScreen'
import HangmanEntry from './games/hangman/components/screens/HangmanEntry'
import RoomRoute from './games/hangman/components/screens/RoomRoute'
import LoadingSpinner from './components/shared/LoadingSpinner'

const TronEntry = lazy(() => import('./games/tron/components/screens/TronEntry'))
const TronRoomRoute = lazy(() => import('./games/tron/components/screens/TronRoomRoute'))

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <LoadingSpinner />
    </div>
  )
}

export default function App() {
  const { uid, loading } = useAuth()

  if (loading) return <Loading />

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/hangman" element={<HangmanEntry />} />
        <Route path="/room/:roomCode" element={<RoomRoute uid={uid} />} />
        <Route path="/tron" element={<TronEntry />} />
        <Route path="/tron/room/:roomCode" element={<TronRoomRoute uid={uid} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
