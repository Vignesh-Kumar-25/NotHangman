import { DIR_VECTORS, OPPOSITE_DIR } from '../constants/gameConfig'

export class Player {
  constructor(uid, x, y, direction, color, style) {
    this.uid = uid
    this.x = x
    this.y = y
    this.direction = direction
    this.color = color
    this.style = style
    this.alive = true
    this.trail = []  // array of {x, y} from oldest to newest
    this.speed = 1   // cells per tick (2 when speed boosted)
    this.ghost = false
    this.activePowerUp = null
    this.powerUpTicksLeft = 0
    this.inputQueue = []  // max 2 queued direction changes
    this.killedBy = null
  }

  queueDirection(newDir) {
    if (this.inputQueue.length >= 2) return

    // Check against the last queued direction, or current direction
    const lastDir = this.inputQueue.length > 0
      ? this.inputQueue[this.inputQueue.length - 1]
      : this.direction

    // Prevent 180-degree turns and same-direction input
    if (newDir === lastDir || newDir === OPPOSITE_DIR[lastDir]) return

    this.inputQueue.push(newDir)
  }

  applyNextInput() {
    if (this.inputQueue.length > 0) {
      this.direction = this.inputQueue.shift()
    }
  }

  getNextPosition() {
    const vec = DIR_VECTORS[this.direction]
    return { x: this.x + vec.dx * this.speed, y: this.y + vec.dy * this.speed }
  }

  moveTo(x, y) {
    this.trail.push({ x: this.x, y: this.y })
    this.x = x
    this.y = y
  }

  trimTrail(maxLength, grid) {
    if (maxLength <= 0) return  // infinite trail
    while (this.trail.length > maxLength) {
      const old = this.trail.shift()
      grid.clear(old.x, old.y)
    }
  }

  die(killedBy) {
    this.alive = false
    this.killedBy = killedBy
  }

  tickPowerUp() {
    if (this.powerUpTicksLeft > 0) {
      this.powerUpTicksLeft--
      if (this.powerUpTicksLeft <= 0) {
        this.clearPowerUp()
      }
    }
  }

  clearPowerUp() {
    if (this.activePowerUp === 'speed_boost') {
      this.speed = 1
    } else if (this.activePowerUp === 'ghost_mode') {
      this.ghost = false
    }
    this.activePowerUp = null
    this.powerUpTicksLeft = 0
  }

  reset(x, y, direction) {
    this.x = x
    this.y = y
    this.direction = direction
    this.alive = true
    this.trail = []
    this.speed = 1
    this.ghost = false
    this.activePowerUp = null
    this.powerUpTicksLeft = 0
    this.inputQueue = []
    this.killedBy = null
  }
}
