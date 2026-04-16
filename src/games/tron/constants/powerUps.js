export const POWERUP_TYPES = {
  SPEED_BOOST: 'speed_boost',
  GHOST_MODE: 'ghost_mode',
  TRAIL_BOMB: 'trail_bomb',
  SHORT_CIRCUIT: 'short_circuit',
  PHASE_WALL: 'phase_wall',
}

export const POWERUP_DEFS = {
  [POWERUP_TYPES.SPEED_BOOST]: {
    type: POWERUP_TYPES.SPEED_BOOST,
    name: 'Speed Boost',
    color: '#ffd700',
    symbol: '\u26A1', // lightning
    durationTicks: 30,  // 3 seconds at 10 ticks/sec
    description: 'Move 2 cells per tick',
  },
  [POWERUP_TYPES.GHOST_MODE]: {
    type: POWERUP_TYPES.GHOST_MODE,
    name: 'Ghost Mode',
    color: '#ffffff',
    symbol: '\u{1F47B}', // ghost
    durationTicks: 20,  // 2 seconds
    description: 'Pass through trails',
  },
  [POWERUP_TYPES.TRAIL_BOMB]: {
    type: POWERUP_TYPES.TRAIL_BOMB,
    name: 'Trail Bomb',
    color: '#ff6600',
    symbol: '\u{1F4A5}', // explosion
    durationTicks: 0,  // instant
    description: 'Erases 5x5 area of trails',
  },
  [POWERUP_TYPES.SHORT_CIRCUIT]: {
    type: POWERUP_TYPES.SHORT_CIRCUIT,
    name: 'Short Circuit',
    color: '#ff0033',
    symbol: '\u26A1',
    durationTicks: 0,  // instant
    description: 'Cuts nearest opponent trail by 50%',
  },
  [POWERUP_TYPES.PHASE_WALL]: {
    type: POWERUP_TYPES.PHASE_WALL,
    name: 'Phase Wall',
    color: '#00ffff',
    symbol: '\u{1F6E1}', // shield
    durationTicks: 50,  // 5 seconds
    description: 'Places a temp wall ahead of you',
  },
}

export const POWERUP_TYPE_LIST = Object.keys(POWERUP_TYPES).map(
  (k) => POWERUP_TYPES[k]
)
