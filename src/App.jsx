import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import HomeScreen from './components/screens/HomeScreen'
import HangmanEntry from './games/hangman/components/screens/HangmanEntry'
import RoomRoute from './games/hangman/components/screens/RoomRoute'
import LoadingSpinner from './components/shared/LoadingSpinner'

const MinesEntry = lazy(() => import('./games/mines/components/screens/MinesEntry'))
const MinesRoomRoute = lazy(() => import('./games/mines/components/screens/MinesRoomRoute'))
const SpellcastEntry = lazy(() => import('./games/spellcast/components/screens/SpellcastEntry'))
const SpellcastRoomRoute = lazy(() => import('./games/spellcast/components/screens/SpellcastRoomRoute'))


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
        <Route path="/mines" element={<MinesEntry />} />
        <Route path="/mines/room/:roomCode" element={<MinesRoomRoute uid={uid} />} />
        <Route path="/spellcast" element={<SpellcastEntry />} />
        <Route path="/spellcast/room/:roomCode" element={<SpellcastRoomRoute uid={uid} />} />
        <Route path="/tron" element={<Navigate to="/" replace />} />
        <Route path="/tron/room/:roomCode" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
