import * as PIXI from 'pixi.js'
import { TileSprite } from './TileSprite'
import { TILE_SIZE, TILE_GAP, BOARD_PADDING, BOARD_SIZE, COLORS } from './constants'

export class SpellcastRenderer {
  constructor(stage) {
    this.stage = stage
    this.tiles = []
    this.trailGraphics = new PIXI.Graphics()
    this.gridContainer = new PIXI.Container()

    this._createGrid()
    this.gridContainer.addChild(this.trailGraphics)
    this.stage.addChild(this.gridContainer)
  }

  _createGrid() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const row = []
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = new TileSprite(r, c)
        tile.x = BOARD_PADDING + c * (TILE_SIZE + TILE_GAP)
        tile.y = BOARD_PADDING + r * (TILE_SIZE + TILE_GAP)
        this.gridContainer.addChild(tile)
        row.push(tile)
      }
      this.tiles.push(row)
    }
  }

  updateBoard(boardData) {
    if (!boardData) return
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const data = boardData[r]?.[c]
        if (data) {
          this.tiles[r][c].updateTile(data)
        }
      }
    }
  }

  highlightPath(path, valid = false) {
    this.clearHighlight()
    if (!path || path.length === 0) return

    for (const { row, col } of path) {
      this.tiles[row][col].setSelected(true, valid)
    }

    const glowColor = valid ? COLORS.trailGlowValid : COLORS.trailGlow
    const lineColor = valid ? COLORS.trailLineValid : COLORS.trailLine

    this.trailGraphics.clear()
    if (path.length > 1) {
      this.trailGraphics.lineStyle(6, glowColor, 0.3)
      const first = this.tiles[path[0].row][path[0].col]
      this.trailGraphics.moveTo(first.getCenterX(), first.getCenterY())
      for (let i = 1; i < path.length; i++) {
        const t = this.tiles[path[i].row][path[i].col]
        this.trailGraphics.lineTo(t.getCenterX(), t.getCenterY())
      }

      this.trailGraphics.lineStyle(3, lineColor, 0.8)
      this.trailGraphics.moveTo(first.getCenterX(), first.getCenterY())
      for (let i = 1; i < path.length; i++) {
        const t = this.tiles[path[i].row][path[i].col]
        this.trailGraphics.lineTo(t.getCenterX(), t.getCenterY())
      }
    }
  }

  clearHighlight() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        this.tiles[r][c].setSelected(false)
        this.tiles[r][c].setHinted(false)
      }
    }
    this.trailGraphics.clear()
  }

  showHint(hintPath) {
    if (!hintPath || hintPath.length === 0) return
    for (const { row, col } of hintPath) {
      this.tiles[row][col].setHinted(true)
    }
  }

  getTileAtPoint(globalX, globalY, loose = false) {
    const localPos = this.gridContainer.toLocal(new PIXI.Point(globalX, globalY))
    const x = localPos.x - BOARD_PADDING
    const y = localPos.y - BOARD_PADDING

    const step = TILE_SIZE + TILE_GAP
    const col = Math.floor(x / step)
    const row = Math.floor(y / step)

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      const tileX = col * step
      const tileY = row * step
      if (x - tileX <= TILE_SIZE && y - tileY <= TILE_SIZE) {
        return { row, col }
      }
    }

    if (!loose) return null

    const halfTile = TILE_SIZE / 2
    const nearCol = Math.max(0, Math.min(BOARD_SIZE - 1, Math.round((x - halfTile) / step)))
    const nearRow = Math.max(0, Math.min(BOARD_SIZE - 1, Math.round((y - halfTile) / step)))
    return { row: nearRow, col: nearCol }
  }

  destroy() {
    this.stage.removeChild(this.gridContainer)
    this.gridContainer.destroy({ children: true })
  }
}
