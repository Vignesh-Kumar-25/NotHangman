export class CollisionDetector {
  constructor(grid) {
    this.grid = grid
  }

  check(player, nextX, nextY, allPlayers) {
    // Wall collision
    if (!this.grid.inBounds(nextX, nextY)) {
      return { hit: true, killedBy: 'wall' }
    }

    const cell = this.grid.get(nextX, nextY)

    // Trail collision (including own trail)
    if (cell && cell.type === 'trail') {
      if (player.ghost && cell.uid !== player.uid) {
        return { hit: false }  // ghost mode: pass through other trails
      }
      return { hit: true, killedBy: cell.uid }
    }

    // Phase wall collision
    if (cell && cell.type === 'wall') {
      if (player.ghost) {
        return { hit: false }
      }
      return { hit: true, killedBy: cell.placedBy || 'wall' }
    }

    // Head-on collision: check if any other alive player is moving to the same cell
    for (const other of allPlayers) {
      if (other.uid === player.uid || !other.alive) continue
      const otherNext = other.getNextPosition()
      if (otherNext.x === nextX && otherNext.y === nextY) {
        return { hit: true, killedBy: other.uid, mutual: true }
      }
    }

    return { hit: false }
  }
}
