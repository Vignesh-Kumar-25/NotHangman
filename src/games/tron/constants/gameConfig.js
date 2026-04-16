export const GRID_WIDTH = 80
export const GRID_HEIGHT = 80
export const CELL_SIZE = 8

export const TICK_RATE = 10           // ticks per second
export const TICK_INTERVAL = 1000 / TICK_RATE  // ms per tick

export const MAX_PLAYERS = 4
export const MIN_PLAYERS = 2

export const COUNTDOWN_DURATION = 3   // seconds
export const ROUND_END_DELAY = 4000   // ms before next round
export const DEFAULT_ROUND_DURATION = 90  // seconds per round
export const ROUND_DURATIONS = [60, 90, 120, 180]

export const DEFAULT_NUM_ROUNDS = 2
export const MAX_NUM_ROUNDS = 5

// Trail length options
export const TRAIL_LENGTHS = {
  SHORT: 30,
  MEDIUM: 60,
  LONG: 100,
  INFINITE: 0,  // 0 means infinite
}
export const DEFAULT_TRAIL_LENGTH = TRAIL_LENGTHS.MEDIUM
export const TRAIL_LENGTH_OPTIONS = [
  { label: 'Short', value: TRAIL_LENGTHS.SHORT },
  { label: 'Medium', value: TRAIL_LENGTHS.MEDIUM },
  { label: 'Long', value: TRAIL_LENGTHS.LONG },
  { label: 'Infinite', value: TRAIL_LENGTHS.INFINITE },
]

// Scoring
export const POINTS_ROUND_WIN = 100
export const POINTS_KILL = 50

// Power-up spawn interval (in ticks)
export const POWERUP_SPAWN_INTERVAL = 50  // every 5 seconds at 10 ticks/sec
export const MAX_ACTIVE_POWERUPS = 3

// Directions
export const DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
}

// Direction vectors
export const DIR_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

// Opposite directions (to prevent 180-degree turns)
export const OPPOSITE_DIR = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}
