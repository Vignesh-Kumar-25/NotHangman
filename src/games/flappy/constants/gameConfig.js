export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 6

export const DEFAULT_PIPE_GAP = 150
export const DEFAULT_GAME_SPEED = 1
export const COUNTDOWN_MS = 3000

export const PIPE_GAP_OPTIONS = [
  { label: 'Tight', value: 130 },
  { label: 'Classic', value: 150 },
  { label: 'Wide', value: 170 },
]

export const SPEED_OPTIONS = [
  { label: 'Cruise', value: 0.9 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 1.5 },
]

export const GAME_STATES = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  FINISHED: 'finished',
}

export const WORLD = {
  width: 420,
  height: 520,
  birdX: 92,
  birdSize: 28,
  gravity: 1350,
  flapVelocity: -430,
  pipeWidth: 64,
  pipeSpacing: 220,
  baseSpeed: 150,
  groundHeight: 54,
}

export const PIPE_MOVEMENT = {
  startsAtScore: 35,
  amplitude: 18,
  periodMs: 4800,
}
