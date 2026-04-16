import { SeededRandom } from '../utils/deterministicRandom'
import { POWERUP_TYPE_LIST, POWERUP_DEFS } from '../constants/powerUps'
import {
  POWERUP_SPAWN_INTERVAL,
  MAX_ACTIVE_POWERUPS,
  POWERUP_RADIUS,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_SPEED,
  BOOST_SPEED,
} from '../constants/gameConfig'
import { checkProximity } from './TrailCollision'

export class PowerUpManager {
  constructor(seed, enabled) {
    this.rng = new SeededRandom(seed)
    this.enabled = enabled
    this.activePowerUps = []   // { id, type, x, y }
    this.nextId = 0
    this.lastSpawnTime = 0
    this.phaseWalls = []       // { id, segments: [{x1,y1,x2,y2}], expiresAt }
  }

  update(elapsed, players) {
    if (!this.enabled) return []

    const events = []

    // Spawn
    if (elapsed - this.lastSpawnTime >= POWERUP_SPAWN_INTERVAL) {
      if (this.activePowerUps.length < MAX_ACTIVE_POWERUPS) {
        const spawned = this._spawn()
        if (spawned) events.push({ type: 'spawn', powerUp: spawned })
      }
      this.lastSpawnTime = elapsed
    }

    // Check pickups
    for (const player of players) {
      if (!player.alive) continue
      for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
        const pu = this.activePowerUps[i]
        if (checkProximity(player.x, player.y, pu.x, pu.y, POWERUP_RADIUS + 8)) {
          this._apply(player, pu, players)
          this.activePowerUps.splice(i, 1)
          events.push({ type: 'pickup', uid: player.uid, powerUpType: pu.type, id: pu.id })
        }
      }
    }

    // Expire phase walls
    this.phaseWalls = this.phaseWalls.filter((pw) => {
      if (elapsed >= pw.expiresAt) {
        events.push({ type: 'wall_expire', id: pw.id })
        return false
      }
      return true
    })

    return events
  }

  _spawn() {
    const type = this.rng.pick(POWERUP_TYPE_LIST)
    const margin = 60
    const x = this.rng.nextInt(margin, ARENA_WIDTH - margin)
    const y = this.rng.nextInt(margin, ARENA_HEIGHT - margin)
    const id = `pu_${this.nextId++}`
    const pu = { id, type, x, y }
    this.activePowerUps.push(pu)
    return pu
  }

  _apply(player, powerUp, allPlayers) {
    const def = POWERUP_DEFS[powerUp.type]
    if (!def) return

    player.clearPowerUp()

    switch (powerUp.type) {
      case 'speed_boost':
        player.speed = BOOST_SPEED
        player.activePowerUp = 'speed_boost'
        player.powerUpTimeLeft = 3
        break

      case 'ghost_mode':
        player.ghost = true
        player.activePowerUp = 'ghost_mode'
        player.powerUpTimeLeft = 2
        break

      case 'trail_bomb': {
        const bombRadius = 80
        for (const p of allPlayers) {
          p.trail = p.trail.filter(({ x, y }) => {
            const dx = x - player.x
            const dy = y - player.y
            return (dx * dx + dy * dy) > bombRadius * bombRadius
          })
        }
        break
      }

      case 'short_circuit': {
        let nearest = null
        let nearestDist = Infinity
        for (const p of allPlayers) {
          if (p.uid === player.uid || !p.alive) continue
          const dx = p.x - player.x
          const dy = p.y - player.y
          const dist = dx * dx + dy * dy
          if (dist < nearestDist) {
            nearestDist = dist
            nearest = p
          }
        }
        if (nearest && nearest.trail.length > 4) {
          const cut = Math.floor(nearest.trail.length / 2)
          nearest.trail.splice(0, cut)
        }
        break
      }

      case 'phase_wall': {
        const perpAngle = player.angle + Math.PI / 2
        const aheadX = player.x + Math.cos(player.angle) * 60
        const aheadY = player.y + Math.sin(player.angle) * 60
        const wallLen = 80
        const segments = [{
          x1: aheadX + Math.cos(perpAngle) * wallLen / 2,
          y1: aheadY + Math.sin(perpAngle) * wallLen / 2,
          x2: aheadX - Math.cos(perpAngle) * wallLen / 2,
          y2: aheadY - Math.sin(perpAngle) * wallLen / 2,
        }]
        const wallId = `wall_${this.nextId++}`
        this.phaseWalls.push({
          id: wallId,
          segments,
          expiresAt: Date.now() + 5000,
          placedBy: player.uid,
        })
        break
      }
    }
  }

  clearAll() {
    this.activePowerUps = []
    this.phaseWalls = []
  }
}
