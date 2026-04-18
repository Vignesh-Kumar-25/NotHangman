import * as PIXI from 'pixi.js'
import { TILE_SIZE, TILE_RADIUS, COLORS, FONTS } from './constants'

export class TileSprite extends PIXI.Container {
  constructor(row, col) {
    super()
    this.row = row
    this.col = col
    this._selected = false
    this._selectedValid = false
    this._hinted = false

    this.bg = new PIXI.Graphics()
    this._drawBg(COLORS.tileBg)
    this.addChild(this.bg)

    this.letterText = new PIXI.Text('', { ...FONTS.letter })
    this.letterText.anchor.set(0.5)
    this.letterText.x = TILE_SIZE / 2
    this.letterText.y = TILE_SIZE / 2
    this.addChild(this.letterText)

    this.valueText = new PIXI.Text('', { ...FONTS.value })
    this.valueText.anchor.set(1, 1)
    this.valueText.x = TILE_SIZE - 6
    this.valueText.y = TILE_SIZE - 4
    this.addChild(this.valueText)

    this.multiplierBadge = new PIXI.Text('', { ...FONTS.multiplier, fill: 0xffffff })
    this.multiplierBadge.anchor.set(0, 0)
    this.multiplierBadge.x = 5
    this.multiplierBadge.y = 4
    this.addChild(this.multiplierBadge)

    this.gemIcon = new PIXI.Graphics()
    this.addChild(this.gemIcon)

    this.eventMode = 'static'
    this.cursor = 'pointer'
  }

  _drawBg(color) {
    this.bg.clear()
    this.bg.beginFill(color)
    this.bg.drawRoundedRect(0, 0, TILE_SIZE, TILE_SIZE, TILE_RADIUS)
    this.bg.endFill()
    this.bg.lineStyle(1, COLORS.tileBorder, 0.5)
    this.bg.drawRoundedRect(0, 0, TILE_SIZE, TILE_SIZE, TILE_RADIUS)
  }

  updateTile(data) {
    if (!data) return
    this.letterText.text = data.letter || ''
    this.valueText.text = data.value ? String(data.value) : ''

    this.multiplierBadge.text = ''
    if (data.multiplier === 'DL') {
      this.multiplierBadge.text = 'DL'
      this.multiplierBadge.style.fill = COLORS.multiplierDL
    } else if (data.multiplier === 'TL') {
      this.multiplierBadge.text = 'TL'
      this.multiplierBadge.style.fill = COLORS.multiplierTL
    } else if (data.multiplier === '2x') {
      this.multiplierBadge.text = '2x'
      this.multiplierBadge.style.fill = COLORS.multiplierWord2x
    }

    this.gemIcon.clear()
    if (data.gem) {
      this.gemIcon.beginFill(COLORS.gemColor, 0.9)
      const cx = TILE_SIZE - 14
      const cy = 12
      const s = 5
      this.gemIcon.moveTo(cx, cy - s)
      this.gemIcon.lineTo(cx + s, cy)
      this.gemIcon.lineTo(cx, cy + s)
      this.gemIcon.lineTo(cx - s, cy)
      this.gemIcon.closePath()
      this.gemIcon.endFill()
    }

    this._refreshBg()
  }

  setSelected(val, valid = false) {
    this._selected = val
    this._selectedValid = valid
    this._refreshBg()
  }

  setHinted(val) {
    this._hinted = val
    this._refreshBg()
  }

  _refreshBg() {
    if (this._selected) {
      this._drawBg(this._selectedValid ? COLORS.tileSelectedValid : COLORS.tileSelected)
    } else if (this._hinted) {
      this._drawBg(COLORS.tileHint)
    } else {
      this._drawBg(COLORS.tileBg)
    }
  }

  getCenterX() {
    return this.x + TILE_SIZE / 2
  }

  getCenterY() {
    return this.y + TILE_SIZE / 2
  }
}
