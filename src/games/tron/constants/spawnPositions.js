import { GRID_WIDTH, GRID_HEIGHT, DIRECTIONS } from './gameConfig'

const MARGIN = 10

const SPAWN_CONFIGS = {
  2: [
    { x: MARGIN, y: Math.floor(GRID_HEIGHT / 2), direction: DIRECTIONS.RIGHT },
    { x: GRID_WIDTH - MARGIN - 1, y: Math.floor(GRID_HEIGHT / 2), direction: DIRECTIONS.LEFT },
  ],
  3: [
    { x: MARGIN, y: MARGIN, direction: DIRECTIONS.RIGHT },
    { x: GRID_WIDTH - MARGIN - 1, y: MARGIN, direction: DIRECTIONS.DOWN },
    { x: Math.floor(GRID_WIDTH / 2), y: GRID_HEIGHT - MARGIN - 1, direction: DIRECTIONS.UP },
  ],
  4: [
    { x: MARGIN, y: MARGIN, direction: DIRECTIONS.RIGHT },
    { x: GRID_WIDTH - MARGIN - 1, y: MARGIN, direction: DIRECTIONS.DOWN },
    { x: GRID_WIDTH - MARGIN - 1, y: GRID_HEIGHT - MARGIN - 1, direction: DIRECTIONS.LEFT },
    { x: MARGIN, y: GRID_HEIGHT - MARGIN - 1, direction: DIRECTIONS.UP },
  ],
}

export function getSpawnPositions(playerCount) {
  return SPAWN_CONFIGS[playerCount] || SPAWN_CONFIGS[2]
}
