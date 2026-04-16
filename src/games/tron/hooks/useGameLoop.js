import { useEffect, useRef, useCallback } from 'react'
import { GameEngine } from '../engine/GameEngine'
import { InputManager, resolveRelativeTurn } from '../engine/InputManager'
import { TICK_INTERVAL, CELL_SIZE } from '../constants/gameConfig'

export function useGameLoop(canvasRef, game, players, uid, onLocalDeath) {
  const engineRef = useRef(null)
  const inputManagerRef = useRef(null)
  const rafRef = useRef(null)
  const lastTickTimeRef = useRef(0)
  const accumulatorRef = useRef(0)

  // Initialize engine once
  useEffect(() => {
    const meta = game?._meta || {}
    engineRef.current = new GameEngine({
      cellSize: CELL_SIZE,
      trailLength: meta.trailLength || 60,
      powerUpsEnabled: meta.powerUpsEnabled !== false,
    })

    inputManagerRef.current = new InputManager()

    return () => {
      if (engineRef.current) engineRef.current.destroy()
      if (inputManagerRef.current) inputManagerRef.current.destroy()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Set up input handling
  const setupInput = useCallback((handleDirection) => {
    const im = inputManagerRef.current
    if (!im) return

    im.onDirection((dir) => {
      const engine = engineRef.current
      if (!engine || !engine.running) return

      const player = engine.players.get(uid)
      if (!player || !player.alive) return

      const resolvedDir = resolveRelativeTurn(player.direction, dir)
      handleDirection(resolvedDir)
    })

    im.bindKeyboard()

    // Bind touch if canvas available
    if (canvasRef.current) {
      im.bindTouch(canvasRef.current)
    }
  }, [uid, canvasRef])

  // Start round
  const startRound = useCallback((spawns, playerInfos, seed) => {
    const engine = engineRef.current
    if (!engine) return

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      engine.initRenderer(ctx)
    }

    engine.initRound(spawns, playerInfos, seed)

    // Set death callback
    engine.onDeath = (deathEvent) => {
      if (deathEvent.uid === uid && onLocalDeath) {
        onLocalDeath(deathEvent)
      }
    }

    // Start game loop
    lastTickTimeRef.current = performance.now()
    accumulatorRef.current = 0

    const loop = (timestamp) => {
      const delta = timestamp - lastTickTimeRef.current
      lastTickTimeRef.current = timestamp
      accumulatorRef.current += delta

      // Fixed timestep ticks
      while (accumulatorRef.current >= TICK_INTERVAL) {
        engine.tick()
        accumulatorRef.current -= TICK_INTERVAL
      }

      // Render with interpolation
      const interpolation = accumulatorRef.current / TICK_INTERVAL
      engine.render(interpolation)

      if (engine.running) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        // Final render
        engine.render(0)
      }
    }

    rafRef.current = requestAnimationFrame(loop)
  }, [canvasRef, uid, onLocalDeath])

  // Stop loop
  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (engineRef.current) {
      engineRef.current.running = false
    }
  }, [])

  return { engineRef, inputManagerRef, setupInput, startRound, stopLoop }
}
