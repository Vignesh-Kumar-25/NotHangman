import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { finishRace, leaveRoom, reportRunState } from '../../db'
import { useGameState } from '../../hooks/useGameState'
import { COUNTDOWN_MS, WORLD } from '../../constants/gameConfig'
import { getEffectiveSpeedMultiplier, getScoreFromElapsed, hasCollision } from '../../utils/flappyLogic'
import { playFlap, playPipeCross, setPopMusicPace, startPopMusic, stopPopMusic } from '../../utils/flappySounds'
import Board from '../game/Board'
import PlayerPanel from '../game/PlayerPanel'
import ChatPanel from '@/components/chat/ChatPanel'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'
import styles from './GameScreen.module.css'

export default function GameScreen({ room, roomCode, uid }) {
  const navigate = useNavigate()
  const offset = useServerTimeOffset()
  const { game, players, playerOrder, meta, isHost, me, connectedPlayers, runs } = useGameState(room, uid)
  const [localRun, setLocalRun] = useState(() => runs[uid] || { alive: true, score: 0, survivalMs: 0, y: 260, velocity: 0 })
  const [now, setNow] = useState(Date.now())
  const [flapPulse, setFlapPulse] = useState(0)
  const frameRef = useRef(null)
  const lastFrameRef = useRef(null)
  const lastReportRef = useRef(0)
  const localRef = useRef(localRun)

  const startsAt = game.startsAt || Date.now()
  const speed = game.gameSpeed ?? meta.gameSpeed ?? 1
  const pipeGap = game.pipeGap ?? meta.pipeGap ?? 150
  const seed = game.seed || 1
  const correctedNow = now + offset
  const elapsedMs = Math.max(0, correctedNow - startsAt)
  const waiting = correctedNow < startsAt
  const countdown = Math.min(COUNTDOWN_MS / 1000, Math.max(1, Math.ceil((startsAt - correctedNow) / 1000)))
  const displaySpeed = getEffectiveSpeedMultiplier(elapsedMs, speed)
  const mergedRuns = useMemo(() => ({ ...runs, [uid]: localRun }), [localRun, runs, uid])
  const mergedAliveCount = connectedPlayers.filter((id) => mergedRuns[id]?.alive !== false).length

  useEffect(() => {
    const initial = runs[uid] || { alive: true, score: 0, survivalMs: 0, y: 260, velocity: 0 }
    setLocalRun(initial)
    localRef.current = initial
    lastFrameRef.current = null
    lastReportRef.current = 0
  }, [game.seed, uid])

  useEffect(() => {
    localRef.current = localRun
  }, [localRun])

  useEffect(() => {
    if (!waiting) startPopMusic()
    return () => stopPopMusic()
  }, [waiting])

  useEffect(() => {
    if (!waiting && localRun.alive !== false) {
      setPopMusicPace(displaySpeed)
    }
  }, [displaySpeed, localRun.alive, waiting])

  const flap = useCallback(() => {
    if (waiting || localRef.current.alive === false) return
    startPopMusic()
    playFlap()
    setFlapPulse((value) => value + 1)
    setLocalRun((run) => ({ ...run, velocity: WORLD.flapVelocity }))
  }, [waiting])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault()
        flap()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flap])

  useEffect(() => {
    let cancelled = false

    function tick(timestamp) {
      if (cancelled) return
      const currentNow = Date.now()
      setNow(currentNow)

      if (waiting) {
        lastFrameRef.current = timestamp
        frameRef.current = requestAnimationFrame(tick)
        return
      }

      const last = lastFrameRef.current ?? timestamp
      const delta = Math.min(0.04, (timestamp - last) / 1000)
      lastFrameRef.current = timestamp

      const run = localRef.current
      if (run.alive !== false) {
        const nextVelocity = run.velocity + WORLD.gravity * delta
        const nextY = run.y + nextVelocity * delta
        const nextElapsed = Math.max(0, currentNow + offset - startsAt)
        const nextScore = getScoreFromElapsed(seed, nextElapsed, speed)
        const crashed = hasCollision(nextY, seed, nextElapsed, pipeGap, speed, nextScore)
        const nextRun = {
          ...run,
          y: nextY,
          velocity: nextVelocity,
          score: nextScore,
          survivalMs: nextElapsed,
          alive: !crashed,
          crashedAt: crashed ? currentNow + offset : run.crashedAt,
        }
        setLocalRun(nextRun)
        if (nextScore > (run.score || 0)) playPipeCross(getEffectiveSpeedMultiplier(nextElapsed, speed))

        const shouldReport = crashed || nextScore !== run.score || currentNow - lastReportRef.current > 140
        if (shouldReport) {
          lastReportRef.current = currentNow
          reportRunState(roomCode, uid, nextRun)
        }
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [offset, pipeGap, roomCode, seed, speed, startsAt, uid, waiting])

  useEffect(() => {
    if (!isHost || waiting) return
    if (connectedPlayers.length > 0 && mergedAliveCount === 0) {
      stopPopMusic()
      finishRace(roomCode)
    }
  }, [connectedPlayers.length, isHost, mergedAliveCount, roomCode, waiting])

  async function handleLeave() {
    stopPopMusic()
    await leaveRoom(roomCode, uid)
    navigate('/flappy')
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.roomInfo}>
          <span className={styles.roomLabel}>Room</span>
          <span className={styles.roomCodeSmall}>{roomCode}</span>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>{mergedAliveCount}/{connectedPlayers.length} flying</span>
          <span className={styles.stat}>Speed {displaySpeed.toFixed(1)}x</span>
          <span className={styles.stat}>Score {localRun.score || 0}</span>
        </div>
        <button className={styles.leaveBtn} onClick={handleLeave}>Leave</button>
      </div>

      <div className={styles.turnBanner}>
        <span className={`${styles.turnText} ${waiting ? styles.turnTextActive : ''}`}>
          {waiting ? 'Get ready' : localRun.alive === false ? 'You crashed. Watching the race.' : 'Space, click, or tap to flap'}
        </span>
      </div>

      <div className={styles.gameArea}>
        <div className={styles.boardCol}>
          <div className={styles.splitGrid}>
            {playerOrder.map((id, index) => {
              const player = players[id]
              if (!player || player.connected === false) return null
              return (
                <Board
                  key={id}
                  player={player}
                  run={mergedRuns[id]}
                  elapsedMs={elapsedMs}
                  seed={seed}
                  pipeGap={pipeGap}
                  speed={speed}
                  isMe={id === uid}
                  isWaiting={waiting}
                  countdown={countdown}
                  onFlap={id === uid ? flap : undefined}
                  colorIndex={index}
                  flapPulse={id === uid ? flapPulse : 0}
                />
              )
            })}
          </div>
        </div>
        <div className={styles.sideCol}>
          <PlayerPanel players={players} playerOrder={playerOrder} runs={mergedRuns} uid={uid} />
        </div>
      </div>

      {me && <ChatPanel roomCode={roomCode} uid={uid} username={me.username} avatarId={me.avatarId} />}
    </div>
  )
}
