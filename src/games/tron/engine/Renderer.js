import { hexToRgb, rgbString, trailColor, glowColor } from '../utils/colorUtils'
import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT, DIR_VECTORS } from '../constants/gameConfig'
import { POWERUP_DEFS } from '../constants/powerUps'

export class Renderer {
  constructor(ctx, cellSize = CELL_SIZE) {
    this.ctx = ctx
    this.cellSize = cellSize
  }

  get canvasWidth() { return GRID_WIDTH * this.cellSize }
  get canvasHeight() { return GRID_HEIGHT * this.cellSize }

  clear() {
    this.ctx.fillStyle = '#0a0a1a'
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  drawGrid() {
    this.ctx.strokeStyle = '#1a1a3e'
    this.ctx.lineWidth = 0.5
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.ctx.beginPath()
      this.ctx.moveTo(x * this.cellSize, 0)
      this.ctx.lineTo(x * this.cellSize, this.canvasHeight)
      this.ctx.stroke()
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y * this.cellSize)
      this.ctx.lineTo(this.canvasWidth, y * this.cellSize)
      this.ctx.stroke()
    }
  }

  drawBorder() {
    this.ctx.strokeStyle = '#3a3a6e'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  drawTrails(players) {
    for (const player of players) {
      const maxAge = player.trail.length
      player.trail.forEach((pos, i) => {
        const age = maxAge - i
        const color = trailColor(player.color, age, maxAge)
        this.ctx.fillStyle = color
        this.ctx.fillRect(
          pos.x * this.cellSize + 1,
          pos.y * this.cellSize + 1,
          this.cellSize - 2,
          this.cellSize - 2
        )
      })

      // Trail glow effect (draw a slightly transparent larger rect under recent trail)
      if (player.alive && player.trail.length > 0) {
        const recentCount = Math.min(10, player.trail.length)
        this.ctx.fillStyle = glowColor(player.color, 0.15)
        for (let i = player.trail.length - recentCount; i < player.trail.length; i++) {
          const pos = player.trail[i]
          this.ctx.fillRect(
            pos.x * this.cellSize - 1,
            pos.y * this.cellSize - 1,
            this.cellSize + 2,
            this.cellSize + 2
          )
        }
      }
    }
  }

  drawPlayers(players, interpolation) {
    for (const player of players) {
      if (!player.alive) continue

      const cs = this.cellSize
      const vec = DIR_VECTORS[player.direction]
      const drawX = (player.x + vec.dx * interpolation) * cs
      const drawY = (player.y + vec.dy * interpolation) * cs

      // Glow behind player head
      this.ctx.fillStyle = glowColor(player.color, 0.3)
      this.ctx.fillRect(drawX - 2, drawY - 2, cs + 4, cs + 4)

      // Player head (brighter)
      const { r, g, b } = hexToRgb(player.color)
      this.ctx.fillStyle = rgbString(
        Math.min(255, r + 60),
        Math.min(255, g + 60),
        Math.min(255, b + 60)
      )

      this._drawShape(player.style, drawX, drawY, cs, player.direction)

      // Ghost mode indicator
      if (player.ghost) {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        this.ctx.lineWidth = 1
        this.ctx.setLineDash([2, 2])
        this.ctx.strokeRect(drawX - 3, drawY - 3, cs + 6, cs + 6)
        this.ctx.setLineDash([])
      }
    }
  }

  _drawShape(style, x, y, size, direction) {
    const cx = x + size / 2
    const cy = y + size / 2
    const half = size / 2

    switch (style) {
      case 1: // Diamond
        this.ctx.beginPath()
        this.ctx.moveTo(cx, y)
        this.ctx.lineTo(x + size, cy)
        this.ctx.lineTo(cx, y + size)
        this.ctx.lineTo(x, cy)
        this.ctx.closePath()
        this.ctx.fill()
        break

      case 2: // Circle
        this.ctx.beginPath()
        this.ctx.arc(cx, cy, half - 1, 0, Math.PI * 2)
        this.ctx.fill()
        break

      case 3: // Square
        this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2)
        break

      default: { // Arrow/chevron (default, style 0)
        this.ctx.beginPath()
        const angle = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[direction] || 0
        this.ctx.save()
        this.ctx.translate(cx, cy)
        this.ctx.rotate(angle)
        this.ctx.moveTo(half, 0)
        this.ctx.lineTo(-half, -half)
        this.ctx.lineTo(-half * 0.3, 0)
        this.ctx.lineTo(-half, half)
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.restore()
        break
      }
    }
  }

  drawPowerUps(powerUps) {
    for (const pu of powerUps) {
      const def = POWERUP_DEFS[pu.type]
      if (!def) continue

      const x = pu.x * this.cellSize
      const y = pu.y * this.cellSize
      const cs = this.cellSize

      // Glow
      this.ctx.fillStyle = glowColor(def.color, 0.3)
      this.ctx.fillRect(x - 2, y - 2, cs + 4, cs + 4)

      // Background
      this.ctx.fillStyle = def.color
      this.ctx.fillRect(x, y, cs, cs)

      // Symbol (if cell size big enough)
      if (cs >= 10) {
        this.ctx.fillStyle = '#000'
        this.ctx.font = `${Math.floor(cs * 0.6)}px sans-serif`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(def.symbol, x + cs / 2, y + cs / 2)
      }
    }
  }

  drawPhaseWalls(phaseWalls) {
    this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'
    for (const pw of phaseWalls) {
      for (const { x, y } of pw.cells) {
        this.ctx.fillRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        )
      }
    }
  }

  drawDeathMarker(player) {
    if (player.alive) return
    const cs = this.cellSize
    const x = player.x * cs
    const y = player.y * cs

    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
    this.ctx.fillRect(x - cs, y - cs, cs * 3, cs * 3)

    this.ctx.strokeStyle = '#ff0000'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(x - cs / 2, y - cs / 2)
    this.ctx.lineTo(x + cs * 1.5, y + cs * 1.5)
    this.ctx.moveTo(x + cs * 1.5, y - cs / 2)
    this.ctx.lineTo(x - cs / 2, y + cs * 1.5)
    this.ctx.stroke()
  }

  render(players, powerUpManager, interpolation) {
    this.clear()
    this.drawGrid()
    this.drawBorder()
    this.drawTrails(Array.from(players.values()))
    if (powerUpManager) {
      this.drawPowerUps(powerUpManager.activePowerUps)
      this.drawPhaseWalls(powerUpManager.phaseWalls)
    }
    this.drawPlayers(Array.from(players.values()), interpolation)
    // Draw death markers
    for (const player of players.values()) {
      this.drawDeathMarker(player)
    }
  }
}
