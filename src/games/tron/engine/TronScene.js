import Phaser from 'phaser'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TRAIL_WIDTH,
  TRAIL_GLOW_WIDTH,
  PLAYER_RADIUS,
  POWERUP_RADIUS,
} from '../constants/gameConfig'
import { POWERUP_DEFS } from '../constants/powerUps'
import { hexToRgb } from '../utils/colorUtils'

function hexToNum(hex) {
  return parseInt(hex.replace('#', ''), 16)
}

export class TronScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TronScene' })
    this.vehicleSprites = new Map()   // uid -> { body, glow, sparks }
    this.trailGraphics = new Map()    // uid -> Phaser.Graphics
    this.trailGlowGraphics = new Map()
    this.powerUpSprites = new Map()   // id -> sprite group
    this.phaseWallGraphics = null
    this.deathEmitters = []
    this.arenaGlow = null
    this.gridGraphics = null
  }

  create() {
    this.cameras.main.setBackgroundColor('#060612')

    // Grid lines
    this.gridGraphics = this.add.graphics()
    this._drawGrid()

    // Arena border with glow
    this._drawArenaBorder()

    // Arena pulse effect
    this.arenaGlow = this.add.graphics()
    this.tweens.add({
      targets: { alpha: 0.03 },
      alpha: 0.08,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween, target) => {
        this.arenaGlow.clear()
        this.arenaGlow.lineStyle(2, 0x00ffff, target.alpha)
        this.arenaGlow.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
      },
    })

    // Phase wall layer
    this.phaseWallGraphics = this.add.graphics()
  }

  _drawGrid() {
    this.gridGraphics.clear()
    const spacing = 40
    this.gridGraphics.lineStyle(1, 0x1a1a3e, 0.3)
    for (let x = 0; x <= ARENA_WIDTH; x += spacing) {
      this.gridGraphics.moveTo(x, 0)
      this.gridGraphics.lineTo(x, ARENA_HEIGHT)
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += spacing) {
      this.gridGraphics.moveTo(0, y)
      this.gridGraphics.lineTo(ARENA_WIDTH, y)
    }
    this.gridGraphics.strokePath()
  }

  _drawArenaBorder() {
    const border = this.add.graphics()
    border.lineStyle(3, 0x3a3a6e, 1)
    border.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    // Corner accents
    const cornerLen = 30
    const corners = [
      [0, 0, cornerLen, 0, 0, cornerLen],
      [ARENA_WIDTH, 0, -cornerLen, 0, 0, cornerLen],
      [0, ARENA_HEIGHT, cornerLen, 0, 0, -cornerLen],
      [ARENA_WIDTH, ARENA_HEIGHT, -cornerLen, 0, 0, -cornerLen],
    ]
    const accent = this.add.graphics()
    accent.lineStyle(2, 0x00ffff, 0.6)
    for (const [cx, cy, dx1, dy1, dx2, dy2] of corners) {
      accent.moveTo(cx + dx1, cy + dy1)
      accent.lineTo(cx, cy)
      accent.lineTo(cx + dx2, cy + dy2)
    }
    accent.strokePath()
  }

  initPlayers(playerInfos) {
    // Clear previous
    this.vehicleSprites.forEach((sprites) => {
      sprites.body.destroy()
      sprites.glow.destroy()
      if (sprites.nameText) sprites.nameText.destroy()
    })
    this.vehicleSprites.clear()
    this.trailGraphics.forEach((g) => g.destroy())
    this.trailGraphics.clear()
    this.trailGlowGraphics.forEach((g) => g.destroy())
    this.trailGlowGraphics.clear()

    for (const [uid, info] of Object.entries(playerInfos)) {
      const color = hexToNum(info.color)
      const { r, g, b } = hexToRgb(info.color)

      // Trail glow (drawn behind)
      const trailGlow = this.add.graphics()
      this.trailGlowGraphics.set(uid, trailGlow)

      // Trail line
      const trailGfx = this.add.graphics()
      this.trailGraphics.set(uid, trailGfx)

      // Vehicle glow (larger, transparent)
      const glow = this.add.graphics()
      glow.fillStyle(color, 0.25)
      glow.fillCircle(0, 0, PLAYER_RADIUS * 3)
      glow.setPosition(info.x || 0, info.y || 0)

      // Vehicle body - neon bike shape
      const body = this.add.graphics()
      this._drawVehicle(body, info.style || 0, color)
      body.setPosition(info.x || 0, info.y || 0)

      // Player name
      const nameText = this.add.text(0, -20, info.username || '', {
        fontSize: '11px',
        fontFamily: 'Nunito, sans-serif',
        color: info.color,
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5)
      nameText.setPosition(info.x || 0, (info.y || 0) - 20)

      this.vehicleSprites.set(uid, { body, glow, nameText, color, hexColor: info.color })
    }
  }

  _drawVehicle(graphics, style, color) {
    graphics.clear()
    const r = PLAYER_RADIUS

    switch (style) {
      case 1: // Diamond
        graphics.fillStyle(color, 1)
        graphics.fillTriangle(r, 0, 0, -r * 0.7, 0, r * 0.7)
        graphics.fillTriangle(-r * 0.5, 0, 0, -r * 0.5, 0, r * 0.5)
        graphics.lineStyle(1, 0xffffff, 0.5)
        graphics.strokeTriangle(r, 0, 0, -r * 0.7, 0, r * 0.7)
        break

      case 2: // Circle
        graphics.fillStyle(color, 1)
        graphics.fillCircle(0, 0, r * 0.8)
        graphics.lineStyle(1.5, 0xffffff, 0.4)
        graphics.strokeCircle(0, 0, r * 0.8)
        break

      case 3: // Square
        graphics.fillStyle(color, 1)
        graphics.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2)
        graphics.lineStyle(1, 0xffffff, 0.4)
        graphics.strokeRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2)
        break

      default: // Arrow / bike (style 0)
        graphics.fillStyle(color, 1)
        graphics.beginPath()
        graphics.moveTo(r * 1.2, 0)
        graphics.lineTo(-r * 0.6, -r * 0.7)
        graphics.lineTo(-r * 0.2, 0)
        graphics.lineTo(-r * 0.6, r * 0.7)
        graphics.closePath()
        graphics.fillPath()
        // Windshield highlight
        graphics.lineStyle(1, 0xffffff, 0.6)
        graphics.beginPath()
        graphics.moveTo(r * 0.4, -r * 0.2)
        graphics.lineTo(r * 0.8, 0)
        graphics.lineTo(r * 0.4, r * 0.2)
        graphics.strokePath()
        break
    }
  }

  updatePlayer(uid, x, y, angle, alive, ghost) {
    const sprites = this.vehicleSprites.get(uid)
    if (!sprites) return

    if (!alive) {
      sprites.body.setVisible(false)
      sprites.glow.setVisible(false)
      sprites.nameText.setVisible(false)
      return
    }

    sprites.body.setPosition(x, y)
    sprites.body.setRotation(angle)
    sprites.body.setAlpha(ghost ? 0.4 : 1)
    sprites.glow.setPosition(x, y)
    sprites.glow.setAlpha(ghost ? 0.1 : 0.25)
    sprites.nameText.setPosition(x, y - 20)
  }

  updateTrail(uid, trail, color, maxLen) {
    const gfx = this.trailGraphics.get(uid)
    const glowGfx = this.trailGlowGraphics.get(uid)
    if (!gfx || !trail || trail.length < 2) return

    const colorNum = hexToNum(color)

    // Main trail
    gfx.clear()
    gfx.lineStyle(TRAIL_WIDTH, colorNum, 0.9)
    gfx.beginPath()
    gfx.moveTo(trail[0].x, trail[0].y)
    for (let i = 1; i < trail.length; i++) {
      gfx.lineTo(trail[i].x, trail[i].y)
    }
    gfx.strokePath()

    // Glow trail (wider, transparent)
    glowGfx.clear()
    glowGfx.lineStyle(TRAIL_GLOW_WIDTH, colorNum, 0.15)
    glowGfx.beginPath()
    glowGfx.moveTo(trail[0].x, trail[0].y)
    for (let i = 1; i < trail.length; i++) {
      glowGfx.lineTo(trail[i].x, trail[i].y)
    }
    glowGfx.strokePath()

    // Bright head section (last few points)
    const headCount = Math.min(8, trail.length)
    const headStart = trail.length - headCount
    gfx.lineStyle(TRAIL_WIDTH + 2, colorNum, 1)
    gfx.beginPath()
    gfx.moveTo(trail[headStart].x, trail[headStart].y)
    for (let i = headStart + 1; i < trail.length; i++) {
      gfx.lineTo(trail[i].x, trail[i].y)
    }
    gfx.strokePath()
  }

  updatePowerUps(powerUps) {
    // Remove old sprites
    this.powerUpSprites.forEach((sprite, id) => {
      if (!powerUps.find((p) => p.id === id)) {
        sprite.destroy()
        this.powerUpSprites.delete(id)
      }
    })

    // Add/update
    for (const pu of powerUps) {
      if (this.powerUpSprites.has(pu.id)) continue
      const def = POWERUP_DEFS[pu.type]
      if (!def) continue

      const color = hexToNum(def.color)
      const container = this.add.container(pu.x, pu.y)

      // Pulsing glow
      const glow = this.add.graphics()
      glow.fillStyle(color, 0.2)
      glow.fillCircle(0, 0, POWERUP_RADIUS * 1.5)
      container.add(glow)

      // Core
      const core = this.add.graphics()
      core.fillStyle(color, 0.8)
      core.fillCircle(0, 0, POWERUP_RADIUS * 0.7)
      core.lineStyle(2, color, 1)
      core.strokeCircle(0, 0, POWERUP_RADIUS)
      container.add(core)

      // Label
      const label = this.add.text(0, 0, def.symbol, {
        fontSize: '14px',
      }).setOrigin(0.5)
      container.add(label)

      // Pulse animation
      this.tweens.add({
        targets: glow,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
      })

      this.powerUpSprites.set(pu.id, container)
    }
  }

  updatePhaseWalls(phaseWalls) {
    this.phaseWallGraphics.clear()
    for (const pw of phaseWalls) {
      this.phaseWallGraphics.lineStyle(6, 0x00ffff, 0.6)
      for (const seg of pw.segments) {
        this.phaseWallGraphics.beginPath()
        this.phaseWallGraphics.moveTo(seg.x1, seg.y1)
        this.phaseWallGraphics.lineTo(seg.x2, seg.y2)
        this.phaseWallGraphics.strokePath()
      }
      // Glow
      this.phaseWallGraphics.lineStyle(14, 0x00ffff, 0.15)
      for (const seg of pw.segments) {
        this.phaseWallGraphics.beginPath()
        this.phaseWallGraphics.moveTo(seg.x1, seg.y1)
        this.phaseWallGraphics.lineTo(seg.x2, seg.y2)
        this.phaseWallGraphics.strokePath()
      }
    }
  }

  playDeathExplosion(x, y, color) {
    const colorNum = hexToNum(color)

    // Flash circle
    const flash = this.add.graphics()
    flash.fillStyle(colorNum, 0.8)
    flash.fillCircle(0, 0, 5)
    flash.setPosition(x, y)
    this.tweens.add({
      targets: flash,
      scaleX: 8,
      scaleY: 8,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    })

    // Scatter particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3
      const speed = 80 + Math.random() * 120
      const particle = this.add.graphics()
      particle.fillStyle(colorNum, 1)
      particle.fillRect(-2, -2, 4, 4)
      particle.setPosition(x, y)

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      })
    }

    // X mark
    const xMark = this.add.graphics()
    xMark.lineStyle(2, 0xff0000, 0.7)
    xMark.moveTo(-8, -8)
    xMark.lineTo(8, 8)
    xMark.moveTo(8, -8)
    xMark.lineTo(-8, 8)
    xMark.strokePath()
    xMark.setPosition(x, y)
    this.tweens.add({
      targets: xMark,
      alpha: 0,
      duration: 2000,
      delay: 500,
      onComplete: () => xMark.destroy(),
    })
  }

  playSparkEffect(x, y, angle, color) {
    const colorNum = hexToNum(color)
    for (let i = 0; i < 4; i++) {
      const sparkAngle = angle + Math.PI + (Math.random() - 0.5) * 1.5
      const speed = 30 + Math.random() * 60
      const spark = this.add.graphics()
      spark.fillStyle(colorNum, 0.9)
      spark.fillRect(-1, -1, 2, 2)
      spark.setPosition(x, y)

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(sparkAngle) * speed,
        y: y + Math.sin(sparkAngle) * speed,
        alpha: 0,
        duration: 200 + Math.random() * 200,
        onComplete: () => spark.destroy(),
      })
    }
  }

  clearRound() {
    this.trailGraphics.forEach((g) => g.clear())
    this.trailGlowGraphics.forEach((g) => g.clear())
    this.powerUpSprites.forEach((s) => s.destroy())
    this.powerUpSprites.clear()
    this.phaseWallGraphics.clear()
  }
}
