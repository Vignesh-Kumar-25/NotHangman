import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_RADIUS,
  WALL_MARGIN,
  SELF_TRAIL_SKIP,
  TRAIL_WIDTH,
} from '../constants/gameConfig'

// Point-to-segment distance (squared)
function pointToSegmentDistSq(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay)

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const projX = ax + t * dx
  const projY = ay + t * dy
  return (px - projX) * (px - projX) + (py - projY) * (py - projY)
}

export function checkWallCollision(player) {
  const m = WALL_MARGIN + PLAYER_RADIUS
  if (player.x < m || player.x > ARENA_WIDTH - m ||
      player.y < m || player.y > ARENA_HEIGHT - m) {
    return { hit: true, killedBy: 'wall' }
  }
  return { hit: false }
}

export function checkTrailCollision(player, allPlayers) {
  const hitDist = PLAYER_RADIUS + TRAIL_WIDTH / 2
  const hitDistSq = hitDist * hitDist

  for (const other of allPlayers) {
    const trail = other.trail
    if (trail.length < 2) continue

    const isSelf = other.uid === player.uid
    const skipCount = isSelf ? SELF_TRAIL_SKIP : 0
    const endIdx = trail.length - 1 - skipCount

    // For ghost mode, skip other players' trails
    if (player.ghost && !isSelf) continue

    for (let i = 0; i < endIdx; i++) {
      const a = trail[i]
      const b = trail[i + 1]
      const distSq = pointToSegmentDistSq(player.x, player.y, a.x, a.y, b.x, b.y)
      if (distSq < hitDistSq) {
        return { hit: true, killedBy: other.uid }
      }
    }
  }

  return { hit: false }
}

// Check if two players collided head-on
export function checkHeadOnCollision(playerA, playerB) {
  const dx = playerA.x - playerB.x
  const dy = playerA.y - playerB.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  return dist < PLAYER_RADIUS * 2
}

// Check if a point is near a position (for power-up pickup)
export function checkProximity(x1, y1, x2, y2, radius) {
  const dx = x1 - x2
  const dy = y1 - y2
  return (dx * dx + dy * dy) < radius * radius
}
