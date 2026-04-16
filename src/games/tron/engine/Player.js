import {
  PLAYER_SPEED,
  TURN_RATE,
  PLAYER_RADIUS,
} from '../constants/gameConfig'

export class Player {
  constructor(uid, x, y, angle, color, style) {
    this.uid = uid
    this.x = x
    this.y = y
    this.angle = angle          // radians, 0 = right, PI/2 = down
    this.color = color
    this.style = style
    this.speed = PLAYER_SPEED
    this.turnRate = TURN_RATE
    this.turnInput = 0          // -1 = left, 0 = straight, 1 = right
    this.alive = true
    this.ghost = false
    this.trail = []             // array of {x, y}
    this.radius = PLAYER_RADIUS
    this.activePowerUp = null
    this.powerUpTimeLeft = 0
    this.killedBy = null
    this.frameCount = 0
  }

  update(dt) {
    if (!this.alive) return

    this.frameCount++

    // Steer
    this.angle += this.turnInput * this.turnRate * dt

    // Move forward
    this.x += Math.cos(this.angle) * this.speed * dt
    this.y += Math.sin(this.angle) * this.speed * dt

    // Power-up timer
    if (this.powerUpTimeLeft > 0) {
      this.powerUpTimeLeft -= dt
      if (this.powerUpTimeLeft <= 0) {
        this.clearPowerUp()
      }
    }
  }

  addTrailPoint() {
    this.trail.push({ x: this.x, y: this.y })
  }

  trimTrail(maxLength) {
    if (maxLength <= 0) return  // infinite
    while (this.trail.length > maxLength) {
      this.trail.shift()
    }
  }

  die(killedBy) {
    this.alive = false
    this.killedBy = killedBy
  }

  clearPowerUp() {
    if (this.activePowerUp === 'speed_boost') {
      this.speed = PLAYER_SPEED
    } else if (this.activePowerUp === 'ghost_mode') {
      this.ghost = false
    }
    this.activePowerUp = null
    this.powerUpTimeLeft = 0
  }

  reset(x, y, angle) {
    this.x = x
    this.y = y
    this.angle = angle
    this.speed = PLAYER_SPEED
    this.turnInput = 0
    this.alive = true
    this.ghost = false
    this.trail = []
    this.activePowerUp = null
    this.powerUpTimeLeft = 0
    this.killedBy = null
    this.frameCount = 0
  }
}
