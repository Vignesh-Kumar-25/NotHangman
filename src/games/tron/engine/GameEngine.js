import { Grid } from './Grid'
import { Player } from './Player'
import { CollisionDetector } from './CollisionDetector'
import { PowerUpManager } from './PowerUpManager'
import { Renderer } from './Renderer'
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE, DEFAULT_TRAIL_LENGTH } from '../constants/gameConfig'
import { getColorHex } from '../constants/vehicles'

export class GameEngine {
  constructor(options = {}) {
    this.cellSize = options.cellSize || CELL_SIZE
    this.trailLength = options.trailLength || DEFAULT_TRAIL_LENGTH
    this.powerUpsEnabled = options.powerUpsEnabled !== false

    this.grid = new Grid(GRID_WIDTH, GRID_HEIGHT)
    this.collisionDetector = new CollisionDetector(this.grid)
    this.players = new Map()  // uid -> Player
    this.renderer = null
    this.powerUpManager = null
    this.tickNumber = 0
    this.running = false
    this.deaths = []  // collected each tick: { uid, killedBy, tick, x, y }
    this.onDeath = null  // callback: (deathEvent) => void
    this.onPowerUpEvent = null  // callback: (event) => void
  }

  initRenderer(ctx) {
    this.renderer = new Renderer(ctx, this.cellSize)
  }

  initRound(spawns, playerInfos, seed) {
    this.grid.clearAll()
    this.tickNumber = 0
    this.deaths = []
    this.running = true

    // Initialize players
    this.players.clear()
    for (const [uid, spawn] of Object.entries(spawns)) {
      const info = playerInfos[uid] || {}
      const color = getColorHex(info.vehicleColor ?? 0)
      const style = info.vehicleStyle ?? 0
      const player = new Player(uid, spawn.x, spawn.y, spawn.direction, color, style)
      this.players.set(uid, player)
      // Place initial position on grid
      this.grid.set(spawn.x, spawn.y, { type: 'trail', uid })
    }

    // Initialize power-up manager
    this.powerUpManager = new PowerUpManager(this.grid, seed, this.powerUpsEnabled)
  }

  tick() {
    if (!this.running) return

    this.tickNumber++
    const newDeaths = []
    const alivePlayers = []

    for (const player of this.players.values()) {
      if (player.alive) alivePlayers.push(player)
    }

    // Apply queued inputs
    for (const player of alivePlayers) {
      player.applyNextInput()
    }

    // Calculate next positions for all alive players
    const moves = new Map()
    for (const player of alivePlayers) {
      moves.set(player.uid, player.getNextPosition())
    }

    // Check collisions and move
    for (const player of alivePlayers) {
      const next = moves.get(player.uid)
      const result = this.collisionDetector.check(player, next.x, next.y, alivePlayers)

      if (result.hit) {
        player.die(result.killedBy)
        const deathEvent = {
          uid: player.uid,
          killedBy: result.killedBy,
          tick: this.tickNumber,
          x: player.x,
          y: player.y,
        }
        newDeaths.push(deathEvent)
        if (this.onDeath) this.onDeath(deathEvent)
      } else {
        player.moveTo(next.x, next.y)
        this.grid.set(next.x, next.y, { type: 'trail', uid: player.uid })
        player.trimTrail(this.trailLength, this.grid)
      }
    }

    // Handle mutual head-on collisions
    // (if two players moved to each other's previous positions)
    for (let i = 0; i < alivePlayers.length; i++) {
      for (let j = i + 1; j < alivePlayers.length; j++) {
        const a = alivePlayers[i]
        const b = alivePlayers[j]
        if (a.alive && b.alive && a.x === b.x && a.y === b.y) {
          a.die(b.uid)
          b.die(a.uid)
          const deathA = { uid: a.uid, killedBy: b.uid, tick: this.tickNumber, x: a.x, y: a.y }
          const deathB = { uid: b.uid, killedBy: a.uid, tick: this.tickNumber, x: b.x, y: b.y }
          newDeaths.push(deathA, deathB)
          if (this.onDeath) {
            this.onDeath(deathA)
            this.onDeath(deathB)
          }
        }
      }
    }

    // Tick power-ups
    for (const player of this.players.values()) {
      if (player.alive) player.tickPowerUp()
    }

    // Power-up manager tick
    if (this.powerUpManager) {
      const puEvents = this.powerUpManager.tick(this.tickNumber, Array.from(this.players.values()))
      if (this.onPowerUpEvent) {
        puEvents.forEach((e) => this.onPowerUpEvent(e))
      }
    }

    this.deaths.push(...newDeaths)

    // Check if round should end (0 or 1 alive)
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

  queueInput(uid, direction) {
    const player = this.players.get(uid)
    if (player && player.alive) {
      player.queueDirection(direction)
    }
  }

  applyRemoteInput(uid, direction, reportedX, reportedY) {
    const player = this.players.get(uid)
    if (!player || !player.alive) return

    // Snap correction if position mismatch
    const dx = Math.abs(player.x - reportedX)
    const dy = Math.abs(player.y - reportedY)
    if (dx > 0 || dy > 0) {
      // Clear trail at old positions and re-place at new
      if (dx <= 3 && dy <= 3) {
        player.x = reportedX
        player.y = reportedY
      }
    }

    player.queueDirection(direction)
  }

  getAliveCount() {
    let count = 0
    for (const player of this.players.values()) {
      if (player.alive) count++
    }
    return count
  }

  getWinner() {
    const alive = Array.from(this.players.values()).filter((p) => p.alive)
    return alive.length === 1 ? alive[0].uid : null
  }

  render(interpolation) {
    if (!this.renderer) return
    this.renderer.render(this.players, this.powerUpManager, interpolation)
  }

  destroy() {
    this.running = false
    this.players.clear()
    this.grid.clearAll()
    this.onDeath = null
    this.onPowerUpEvent = null
  }
}
