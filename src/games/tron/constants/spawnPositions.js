import { ARENA_WIDTH, ARENA_HEIGHT } from './gameConfig'

const MARGIN = 80

const SPAWN_CONFIGS = {
  2: [
    { x: MARGIN, y: ARENA_HEIGHT / 2, angle: 0 },                             // facing right
    { x: ARENA_WIDTH - MARGIN, y: ARENA_HEIGHT / 2, angle: Math.PI },          // facing left
  ],
  3: [
    { x: MARGIN, y: MARGIN, angle: Math.PI / 4 },                              // top-left, facing down-right
    { x: ARENA_WIDTH - MARGIN, y: MARGIN, angle: (3 * Math.PI) / 4 },          // top-right, facing down-left
    { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - MARGIN, angle: -Math.PI / 2 },     // bottom-center, facing up
  ],
  4: [
    { x: MARGIN, y: MARGIN, angle: 0 },                                        // top-left, facing right
    { x: ARENA_WIDTH - MARGIN, y: MARGIN, angle: Math.PI / 2 },                // top-right, facing down
    { x: ARENA_WIDTH - MARGIN, y: ARENA_HEIGHT - MARGIN, angle: Math.PI },      // bottom-right, facing left
    { x: MARGIN, y: ARENA_HEIGHT - MARGIN, angle: -Math.PI / 2 },              // bottom-left, facing up
  ],
}

export function getSpawnPositions(playerCount) {
  return SPAWN_CONFIGS[playerCount] || SPAWN_CONFIGS[2]
}
