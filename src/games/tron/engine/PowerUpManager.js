import { SeededRandom } from '../utils/deterministicRandom'
import { POWERUP_TYPE_LIST, POWERUP_DEFS } from '../constants/powerUps'
import { POWERUP_SPAWN_INTERVAL, MAX_ACTIVE_POWERUPS, DIR_VECTORS } from '../constants/gameConfig'

export class PowerUpManager {
  constructor(grid, seed, enabled) {
    this.grid = grid
    this.rng = new SeededRandom(seed)
    this.enabled = enabled
    this.activePowerUps = []  // { id, type, x, y, spawnedAtTick }
    this.nextId = 0
    this.phaseWalls = []  // { cells: [{x,y}], expiresAtTick, placedBy }
  }

  tick(tickNumber, players) {
    if (!this.enabled) return []

    const events = []

    // Spawn power-up at interval
    if (tickNumber > 0 && tickNumber % POWERUP_SPAWN_INTERVAL === 0) {
      if (this.activePowerUps.length < MAX_ACTIVE_POWERUPS) {
        const spawned = this._spawn(tickNumber)
        if (spawned) events.push({ type: 'spawn', powerUp: spawned })
      }
    }

    // Check pickups
    for (const player of players) {
      if (!player.alive) continue
      const cell = this.grid.get(player.x, player.y)
      if (cell && cell.type === 'powerup') {
        const pu = this.activePowerUps.find((p) => p.id === cell.id)
        if (pu) {
          this._apply(player, pu, tickNumber, players)
          this.activePowerUps = this.activePowerUps.filter((p) => p.id !== pu.id)
          this.grid.clear(player.x, player.y)
          events.push({ type: 'pickup', uid: player.uid, powerUpType: pu.type })
        }
      }
    }

    // Expire phase walls
    this.phaseWalls = this.phaseWalls.filter((pw) => {
      if (tickNumber >= pw.expiresAtTick) {
        pw.cells.forEach(({ x, y }) => {
          const cell = this.grid.get(x, y)
          if (cell && cell.type === 'wall' && cell.wallId === pw.wallId) {
            this.grid.clear(x, y)
          }
        })
        return false
      }
      return true
    })

    return events
  }

  _spawn(tickNumber) {
    const type = this.rng.pick(POWERUP_TYPE_LIST)
    // Find empty cell
    let attempts = 0
    while (attempts < 50) {
      const x = this.rng.nextInt(5, this.grid.width - 5)
      const y = this.rng.nextInt(5, this.grid.height - 5)
      if (!this.grid.get(x, y)) {
        const id = `pu_${this.nextId++}`
        const pu = { id, type, x, y, spawnedAtTick: tickNumber }
        this.activePowerUps.push(pu)
        this.grid.set(x, y, { type: 'powerup', id, powerUpType: type })
        return pu
      }
      attempts++
    }
    return null
  }

  _apply(player, powerUp, tickNumber, allPlayers) {
    const def = POWERUP_DEFS[powerUp.type]
    if (!def) return

    // Clear any existing power-up effect
    player.clearPowerUp()

    switch (powerUp.type) {
      case 'speed_boost':
        player.speed = 2
        player.activePowerUp = 'speed_boost'
        player.powerUpTicksLeft = def.durationTicks
        break

      case 'ghost_mode':
        player.ghost = true
        player.activePowerUp = 'ghost_mode'
        player.powerUpTicksLeft = def.durationTicks
        break

      case 'trail_bomb':
        this.grid.clearArea(player.x, player.y, 2)  // 5x5 area
        // Also remove trail entries from all players in the area
        for (const p of allPlayers) {
          p.trail = p.trail.filter(({ x, y }) => {
            return Math.abs(x - player.x) > 2 || Math.abs(y - player.y) > 2
          })
        }
        break

      case 'short_circuit': {
        // Find nearest opponent
        let nearest = null
        let nearestDist = Infinity
        for (const p of allPlayers) {
          if (p.uid === player.uid || !p.alive) continue
          const dist = Math.abs(p.x - player.x) + Math.abs(p.y - player.y)
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = p
          }
        }
        if (nearest && nearest.trail.length > 0) {
          const cutCount = Math.floor(nearest.trail.length / 2)
          const removed = nearest.trail.splice(0, cutCount)
          removed.forEach(({ x, y }) => this.grid.clear(x, y))
        }
        break
      }

      case 'phase_wall': {
        const vec = DIR_VECTORS[player.direction]
        // Perpendicular direction
        const perpDx = -vec.dy
        const perpDy = vec.dx
        // Place 5 cells perpendicular, 3 ahead
        const wallCells = []
        const aheadX = player.x + vec.dx * 3
        const aheadY = player.y + vec.dy * 3
        const wallId = `wall_${this.nextId++}`
        for (let i = -2; i <= 2; i++) {
          const wx = aheadX + perpDx * i
          const wy = aheadY + perpDy * i
          if (this.grid.inBounds(wx, wy) && !this.grid.get(wx, wy)) {
            this.grid.set(wx, wy, { type: 'wall', placedBy: player.uid, wallId })
            wallCells.push({ x: wx, y: wy })
          }
        }
        this.phaseWalls.push({
          wallId,
          cells: wallCells,
          expiresAtTick: tickNumber + def.durationTicks,
          placedBy: player.uid,
        })
        break
      }
    }
  }

  clearAll() {
    this.activePowerUps.forEach((pu) => this.grid.clear(pu.x, pu.y))
    this.activePowerUps = []
    this.phaseWalls.forEach((pw) => {
      pw.cells.forEach(({ x, y }) => this.grid.clear(x, y))
    })
    this.phaseWalls = []
  }
}
