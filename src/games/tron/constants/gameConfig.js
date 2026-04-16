// Arena
export const ARENA_WIDTH = 1000
export const ARENA_HEIGHT = 700

// Movement (continuous, angle-based)
export const PLAYER_SPEED = 150        // pixels per second
export const TURN_RATE = 3.2           // radians per second
export const BOOST_SPEED = 280         // speed during speed boost
export const TRAIL_WIDTH = 4           // pixels
export const TRAIL_GLOW_WIDTH = 12     // glow around trail

// Tick / sync
export const PHYSICS_FPS = 60
export const PHYSICS_DT = 1 / PHYSICS_FPS
export const SNAPSHOT_RATE = 100       // ms between host snapshots to Firebase
export const TRAIL_POINT_INTERVAL = 3  // add trail point every N physics frames

// Players
export const MAX_PLAYERS = 4
export const MIN_PLAYERS = 2

// Timing
export const COUNTDOWN_DURATION = 3    // seconds
export const ROUND_END_DELAY = 4000    // ms before next round
export const DEFAULT_ROUND_DURATION = 90
export const ROUND_DURATIONS = [60, 90, 120, 180]

// Rounds
export const DEFAULT_NUM_ROUNDS = 2
export const MAX_NUM_ROUNDS = 5

// Trail length (number of trail points kept)
export const TRAIL_LENGTHS = {
  SHORT: 120,
  MEDIUM: 250,
  LONG: 500,
  INFINITE: 0,
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

// Power-ups
export const POWERUP_SPAWN_INTERVAL = 5000   // ms between spawns
export const MAX_ACTIVE_POWERUPS = 3
export const POWERUP_RADIUS = 16             // pickup radius in pixels

// Collision
export const PLAYER_RADIUS = 8              // collision radius
export const WALL_MARGIN = 2
export const SELF_TRAIL_SKIP = 15           // skip last N trail points for self-collision
