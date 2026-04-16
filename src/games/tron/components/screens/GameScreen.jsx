import { useRef, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { leaveRoom } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useHostArbiter } from '../../hooks/useHostArbiter'
import { GAME_STATES } from '../../constants/gameStates'
import HUD from '../game/HUD'
import ScorePanel from '../game/ScorePanel'
import CountdownOverlay from '../game/CountdownOverlay'
import RoundResultOverlay from '../game/RoundResultOverlay'
import TouchControls from '../game/TouchControls'
import ChatPanel from '@/components/chat/ChatPanel'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const { game, players, playerOrder, isHost, me, meta } = useGameState(room, uid)
  const [aliveCount, setAliveCount] = useState(playerOrder.length)
  const roundInitRef = useRef(null)

  const isPlaying = game?.state === GAME_STATES.PLAYING
  const isCountdown = game?.state === GAME_STATES.COUNTDOWN
  const isRoundEnd = game?.state === GAME_STATES.ROUND_END

  const { engineRef, inputManagerRef, initPhaser, startRound, stopLoop } = useGameLoop(
    containerRef, room, roomCode, uid, isHost
  )

  useHostArbiter({ isHost, room, roomCode, uid, engineRef })

  // Init Phaser when container mounts
  useEffect(() => {
    initPhaser()
  }, [initPhaser])

  // Start round when game transitions to PLAYING
  useEffect(() => {
    if (!isPlaying || !game?.spawns) return
    if (roundInitRef.current === game.round) return
    roundInitRef.current = game.round

    startRound(game.spawns, players, game.seed || 42)
  }, [isPlaying, game?.round, game?.spawns, game?.seed, players, startRound])

  // Stop loop on round end / game over
  useEffect(() => {
    if (isRoundEnd || game?.state === GAME_STATES.GAME_OVER) {
      stopLoop()
    }
  }, [game?.state, isRoundEnd, stopLoop])

  // Track alive count
  useEffect(() => {
    if (!isPlaying) { setAliveCount(playerOrder.length); return }
    const interval = setInterval(() => {
      const engine = engineRef.current
      if (engine) setAliveCount(engine.getAliveCount())
    }, 200)
    return () => clearInterval(interval)
  }, [isPlaying, playerOrder.length, engineRef])

  async function handleLeave() {
    stopLoop()
    await leaveRoom(roomCode, uid)
    navigate('/tron')
  }

  // Touch controls
  function handleTouchLeft(active) {
    inputManagerRef.current?.setTouchLeft(active)
  }
  function handleTouchRight(active) {
    inputManagerRef.current?.setTouchRight(active)
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <ScorePanel players={players} playerOrder={playerOrder} uid={uid} engineRef={engineRef} />
        <div className={styles.sidebarActions}>
          <button className={styles.leaveBtn} onClick={handleLeave}>Leave</button>
        </div>
      </aside>

      <main className={styles.main}>
        <HUD
          game={game}
          meta={meta}
          aliveCount={aliveCount}
          totalPlayers={playerOrder.length}
          engineRef={engineRef}
          uid={uid}
        />
        <div ref={containerRef} className={styles.gameContainer} />
      </main>

      {isCountdown && <CountdownOverlay isActive={true} round={game?.round || 1} />}
      {isRoundEnd && <RoundResultOverlay game={game} players={players} />}

      <TouchControls onLeft={handleTouchLeft} onRight={handleTouchRight} />

      {me && (
        <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />
      )}
    </div>
  )
}
