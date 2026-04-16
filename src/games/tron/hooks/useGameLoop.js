import { useEffect, useRef, useCallback } from 'react'
import Phaser from 'phaser'
import { GameEngine } from '../engine/GameEngine'
import { TronScene } from '../engine/TronScene'
import { InputManager } from '../engine/InputManager'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PHYSICS_FPS,
  PHYSICS_DT,
  SNAPSHOT_RATE,
} from '../constants/gameConfig'
import { getColorHex } from '../constants/vehicles'
import { writeSnapshot, writeTurnInput, subscribeToSnapshot, subscribeToInputs } from '../db'

export function useGameLoop(containerRef, room, roomCode, uid, isHost) {
  const engineRef = useRef(null)
  const phaserRef = useRef(null)
  const sceneRef = useRef(null)
  const inputManagerRef = useRef(null)
  const loopRef = useRef(null)
  const snapshotIntervalRef = useRef(null)
  const unsubSnapshotRef = useRef(null)
  const unsubInputsRef = useRef(null)
  const lastTurnInputRef = useRef(0)

  // Create engine + Phaser once
  useEffect(() => {
    const meta = room?.meta || {}
    engineRef.current = new GameEngine({
      trailLength: meta.trailLength || 250,
      powerUpsEnabled: meta.powerUpsEnabled !== false,
    })
    inputManagerRef.current = new InputManager()
    inputManagerRef.current.bindKeyboard()

    return () => {
      if (inputManagerRef.current) { inputManagerRef.current.destroy(); inputManagerRef.current = null }
      if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null }
      if (snapshotIntervalRef.current) { clearInterval(snapshotIntervalRef.current); snapshotIntervalRef.current = null }
      if (unsubSnapshotRef.current) { unsubSnapshotRef.current(); unsubSnapshotRef.current = null }
      if (unsubInputsRef.current) { unsubInputsRef.current(); unsubInputsRef.current = null }
      if (phaserRef.current) { phaserRef.current.destroy(true); phaserRef.current = null }
      if (engineRef.current) { engineRef.current.destroy(); engineRef.current = null }
      sceneRef.current = null
    }
  }, [])

  // Create Phaser game when container mounts
  const initPhaser = useCallback(() => {
    if (phaserRef.current || !containerRef.current) return

    const config = {
      type: Phaser.AUTO,
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      parent: containerRef.current,
      backgroundColor: '#060612',
      scene: TronScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false },
    }

    phaserRef.current = new Phaser.Game(config)

    // Wait for scene to be ready
    const checkScene = setInterval(() => {
      const scene = phaserRef.current?.scene?.getScene('TronScene')
      if (scene && scene.sys?.isActive) {
        sceneRef.current = scene
        clearInterval(checkScene)
      }
    }, 50)

    return () => clearInterval(checkScene)
  }, [containerRef])

  // Start a round
  const startRound = useCallback((spawns, playerInfos, seed) => {
    const engine = engineRef.current
    const scene = sceneRef.current
    if (!engine) return

    engine.initRound(spawns, playerInfos, seed)

    // Init Phaser scene visuals
    if (scene) {
      scene.clearRound()
      const visuals = {}
      for (const [uid, spawn] of Object.entries(spawns)) {
        const info = playerInfos[uid] || {}
        visuals[uid] = {
          x: spawn.x,
          y: spawn.y,
          color: getColorHex(info.vehicleColor ?? 0),
          style: info.vehicleStyle ?? 0,
          username: info.username || '',
        }
      }
      scene.initPlayers(visuals)
    }

    // Death callback for visual effects
    engine.onDeath = (ev) => {
      if (scene) {
        const player = engine.players.get(ev.uid)
        if (player) {
          scene.playDeathExplosion(ev.x, ev.y, player.color)
        }
      }
    }

    if (isHost) {
      // HOST: run physics loop + broadcast snapshots
      loopRef.current = setInterval(() => {
        // Read remote inputs
        const im = inputManagerRef.current
        if (im) {
          engine.setTurnInput(uid, im.turnInput)
        }
        engine.tick()
        renderScene()
      }, 1000 / PHYSICS_FPS)

      // Broadcast snapshots
      snapshotIntervalRef.current = setInterval(() => {
        if (!engine.running && !engine.deaths.length) return
        const snap = engine.getSnapshot()
        writeSnapshot(roomCode, snap).catch(console.error)
      }, SNAPSHOT_RATE)

      // Listen for remote player inputs
      unsubInputsRef.current = subscribeToInputs(roomCode, (inputs) => {
        for (const [inputUid, data] of Object.entries(inputs)) {
          if (inputUid === uid) continue // skip self
          engine.setTurnInput(inputUid, data.turnInput)
        }
      })

    } else {
      // CLIENT: send own input + render from host snapshots
      // Send input changes
      loopRef.current = setInterval(() => {
        const im = inputManagerRef.current
        if (!im) return
        if (im.turnInput !== lastTurnInputRef.current) {
          lastTurnInputRef.current = im.turnInput
          writeTurnInput(roomCode, uid, im.turnInput).catch(console.error)
        }
      }, 50)

      // Subscribe to host snapshots
      unsubSnapshotRef.current = subscribeToSnapshot(roomCode, (snapshot) => {
        engine.applySnapshot(snapshot)
        renderScene()
      })
    }
  }, [roomCode, uid, isHost])

  function renderScene() {
    const engine = engineRef.current
    const scene = sceneRef.current
    if (!engine || !scene) return

    for (const [uid, player] of engine.players) {
      scene.updatePlayer(uid, player.x, player.y, player.angle, player.alive, player.ghost)
      scene.updateTrail(uid, player.trail, player.color, engine.trailLength)

      // Spark effects when turning
      if (player.alive && player.turnInput !== 0 && player.frameCount % 4 === 0) {
        scene.playSparkEffect(player.x, player.y, player.angle, player.color)
      }
    }

    if (engine.powerUpManager) {
      scene.updatePowerUps(engine.powerUpManager.activePowerUps)
      scene.updatePhaseWalls(engine.powerUpManager.phaseWalls)
    }
  }

  const stopLoop = useCallback(() => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null }
    if (snapshotIntervalRef.current) { clearInterval(snapshotIntervalRef.current); snapshotIntervalRef.current = null }
    if (unsubSnapshotRef.current) { unsubSnapshotRef.current(); unsubSnapshotRef.current = null }
    if (unsubInputsRef.current) { unsubInputsRef.current(); unsubInputsRef.current = null }
    if (engineRef.current) engineRef.current.running = false
  }, [])

  return { engineRef, inputManagerRef, sceneRef, initPhaser, startRound, stopLoop }
}
