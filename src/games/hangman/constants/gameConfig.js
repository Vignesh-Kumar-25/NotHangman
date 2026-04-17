export const TURN_DURATION = 30        // seconds per turn (default)
export const TURN_DURATION_OPTIONS = [15, 20, 30, 45, 60]
export const MAX_PLAYERS = 5
export const MIN_PLAYERS = 2
export const MIN_WORD_LENGTH = 6
export const MAX_WRONG_GUESSES = 6     // 6 wrong = full hangman
export const ROUND_START_DELAY = 3000  // ms before PLAYING starts after ROUND_START
export const ROUND_END_DELAY = 4000    // ms before next round begins
export const DEFAULT_NUM_ROUNDS = 2    // full rounds (each player goes once per round)
export const MAX_NUM_ROUNDS = 5

export const POINTS_CORRECT_LETTER = 10
export const POINTS_CORRECT_WORD = 50
export const POINTS_SOLVE_BONUS = 100  // bonus for whoever solves the round
