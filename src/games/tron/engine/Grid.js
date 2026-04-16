export class Grid {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.cells = new Array(width * height).fill(null)
  }

  _idx(x, y) {
    return y * this.width + x
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return null
    return this.cells[this._idx(x, y)]
  }

  set(x, y, value) {
    if (!this.inBounds(x, y)) return
    this.cells[this._idx(x, y)] = value
  }

  clear(x, y) {
    if (!this.inBounds(x, y)) return
    this.cells[this._idx(x, y)] = null
  }

  clearAll() {
    this.cells.fill(null)
  }

  // Clear a rectangular area
  clearArea(cx, cy, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.clear(cx + dx, cy + dy)
      }
    }
  }

  // Clear all trail cells belonging to a specific player
  clearPlayerTrail(uid) {
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i]
      if (cell && cell.type === 'trail' && cell.uid === uid) {
        this.cells[i] = null
      }
    }
  }
}
