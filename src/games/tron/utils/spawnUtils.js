import { getSpawnPositions } from '../constants/spawnPositions'

export function assignSpawns(playerOrder) {
  const positions = getSpawnPositions(playerOrder.length)
  const spawns = {}
  playerOrder.forEach((uid, i) => {
    const pos = positions[i % positions.length]
    spawns[uid] = { x: pos.x, y: pos.y, direction: pos.direction }
  })
  return spawns
}
