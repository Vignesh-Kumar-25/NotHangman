import { Player } from './Player'
import { PowerUpManager } from './PowerUpManager'
import { checkWallCollision, checkTrailCollision, checkHeadOnCollision } from './TrailCollision'
import {
  PHYSICS_DT,
  TRAIL_POINT_INTERVAL,
  DEFAULT_TRAIL_LENGTH,
  PLAYER_SPEED,
} from '../constants/gameConfig'
import { getColorHex } from '../constants/vehicles'

export class GameEngine {
  constructor(options = {}) {
    this.trailLength = options.trailLength || DEFAULT_TRAIL_LENGTH
    this.powerUpsEnabled = options.powerUpsEnabled !== false
    this.players = new Map()
    this.powerUpManager = null
    this.running = false
    this.elapsed = 0
    this.deaths = []
    this.onDeath = null
    this.onPowerUpEvent = null
  }

  initRound(spawns, playerInfos, seed) {
    this.elapsed = 0
    this.deaths = []
    this.running = true

    this.players.clear()
    for (const [uid, spawn] of Object.entries(spawns)) {
      const info = playerInfos[uid] || {}
      const color = getColorHex(info.vehicleColor ?? 0)
      const style = info.vehicleStyle ?? 0
      const player = new Player(uid, spawn.x, spawn.y, spawn.angle, color, style)
      player.addTrailPoint()
      this.players.set(uid, player)
    }

    this.powerUpManager = new PowerUpManager(seed, this.powerUpsEnabled)
  }

  // Called by host at fixed timestep
  tick() {
    if (!this.running) return null

    const dt = PHYSICS_DT
    this.elapsed += dt * 1000
    const newDeaths = []

    const alivePlayers = []
    for (const p of this.players.values()) {
      if (p.alive) alivePlayers.push(p)
    }

    // Update positions
    for (const player of alivePlayers) {
      player.update(dt)
    }

    // Add trail points periodically
    for (const player of alivePlayers) {
      if (player.frameCount % TRAIL_POINT_INTERVAL === 0) {
        player.addTrailPoint()
        player.trimTrail(this.trailLength)
      }
    }

    // Check wall collisions
    for (const player of alivePlayers) {
      const wall = checkWallCollision(player)
      if (wall.hit) {
        player.die('wall')
        const ev = { uid: player.uid, killedBy: 'wall', x: player.x, y: player.y }
        newDeaths.push(ev)
        if (this.onDeath) this.onDeath(ev)
      }
    }

    // Check trail collisions
    for (const player of alivePlayers) {
      if (!player.alive) continue
      const trail = checkTrailCollision(player, Array.from(this.players.values()))
      if (trail.hit) {
        player.die(trail.killedBy)
        const ev = { uid: player.uid, killedBy: trail.killedBy, x: player.x, y: player.y }
        newDeaths.push(ev)
        if (this.onDeath) this.onDeath(ev)
      }
    }

    // Check phase wall collisions
    if (this.powerUpManager) {
      for (const player of alivePlayers) {
        if (!player.alive || player.ghost) continue
        for (const pw of this.powerUpManager.phaseWalls) {
          for (const seg of pw.segments) {
            const dx = seg.x2 - seg.x1
            const dy = seg.y2 - seg.y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len === 0) continue
            const nx = -dy / len
            const ny = dx / len
            const dist = Math.abs((player.x - seg.x1) * nx + (player.y - seg.y1) * ny)
            // Check if player is within segment bounds
            const t = ((player.x - seg.x1) * dx + (player.y - seg.y1) * dy) / (len * len)
            if (t >= 0 && t <= 1 && dist < 10) {
              player.die(pw.placedBy)
              const ev = { uid: player.uid, killedBy: pw.placedBy, x: player.x, y: player.y }
              newDeaths.push(ev)
              if (this.onDeath) this.onDeath(ev)
            }
          }
        }
      }
    }

    // Head-on collisions
    for (let i = 0; i < alivePlayers.length; i++) {
      for (let j = i + 1; j < alivePlayers.length; j++) {
        const a = alivePlayers[i]
        const b = alivePlayers[j]
        if (a.alive && b.alive && checkHeadOnCollision(a, b)) {
          a.die(b.uid)
          b.die(a.uid)
          const evA = { uid: a.uid, killedBy: b.uid, x: a.x, y: a.y }
          const evB = { uid: b.uid, killedBy: a.uid, x: b.x, y: b.y }
          newDeaths.push(evA, evB)
          if (this.onDeath) { this.onDeath(evA); this.onDeath(evB) }
        }
      }
    }

    // Power-ups
    if (this.powerUpManager) {
      const puEvents = this.powerUpManager.update(this.elapsed, Array.from(this.players.values()))
      if (this.onPowerUpEvent) {
        puEvents.forEach((e) => this.onPowerUpEvent(e))
      }
    }

    this.deaths.push(...newDeaths)

    const stillAlive = Array.from(this.players.values()).filter((p) => p.alive)
    if (stillAlive.length <= 1) {
      this.running = false
    }

    return {
      deaths: newDeaths,
      aliveCount: stillAlive.length,
      winner: stillAlive.length === 1 ? stillAlive[0].uid : null,
    }
  }

  // Get snapshot for broadcasting (host only)
  getSnapshot() {
    const playersData = {}
    for (const [uid, p] of this.players) {
      playersData[uid] = {
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        angle: Math.round(p.angle * 1000) / 1000,
        speed: p.speed,
        alive: p.alive,
        ghost: p.ghost,
        trailLen: p.trail.length,
        activePowerUp: p.activePowerUp || null,
      }
    }
    // Send recent trail points (last few per player)
    const trails = {}
    for (const [uid, p] of this.players) {
      const recentCount = TRAIL_POINT_INTERVAL + 1
      trails[uid] = p.trail.slice(-recentCount).map(pt => ({
        x: Math.round(pt.x * 10) / 10,
        y: Math.round(pt.y * 10) / 10,
      }))
    }
    return {
      elapsed: this.elapsed,
      players: playersData,
      trails,
      powerUps: this.powerUpManager?.activePowerUps || [],
      phaseWalls: this.powerUpManager?.phaseWalls?.map(pw => ({
        id: pw.id,
        segments: pw.segments,
        placedBy: pw.placedBy,
      })) || [],
    }
  }

  // Apply snapshot from host (client only)
  applySnapshot(snapshot) {
    if (!snapshot?.players) return

    for (const [uid, data] of Object.entries(snapshot.players)) {
      const player = this.players.get(uid)
      if (!player) continue

      player.x = data.x
      player.y = data.y
      player.angle = data.angle
      player.speed = data.speed
      player.alive = data.alive
      player.ghost = data.ghost || false
      player.activePowerUp = data.activePowerUp || null
    }

    // Append trail points from snapshot
    if (snapshot.trails) {
      for (const [uid, points] of Object.entries(snapshot.trails)) {
        const player = this.players.get(uid)
        if (!player || !points?.length) continue
        for (const pt of points) {
          const last = player.trail[player.trail.length - 1]
          if (!last || Math.abs(last.x - pt.x) > 0.5 || Math.abs(last.y - pt.y) > 0.5) {
            player.trail.push(pt)
          }
        }
        player.trimTrail(this.trailLength)
      }
    }

    // Sync power-ups
    if (this.powerUpManager && snapshot.powerUps) {
      this.powerUpManager.activePowerUps = snapshot.powerUps
    }
  }

  setTurnInput(uid, turnInput) {
    const player = this.players.get(uid)
    if (player && player.alive) {
      player.turnInput = turnInput
    }
  }

  getAliveCount() {
    let c = 0
    for (const p of this.players.values()) if (p.alive) c++
    return c
  }

  getWinner() {
    const alive = Array.from(this.players.values()).filter((p) => p.alive)
    return alive.length === 1 ? alive[0].uid : null
  }

  destroy() {
    this.running = false
    this.players.clear()
    this.onDeath = null
    this.onPowerUpEvent = null
  }
}
