import { DIRECTIONS, OPPOSITE_DIR } from '../constants/gameConfig'

const KEY_MAP = {
  KeyA: DIRECTIONS.LEFT,
  KeyD: DIRECTIONS.RIGHT,
  ArrowLeft: DIRECTIONS.LEFT,
  ArrowRight: DIRECTIONS.RIGHT,
  ArrowUp: DIRECTIONS.UP,
  ArrowDown: DIRECTIONS.DOWN,
}

export class InputManager {
  constructor() {
    this._onDirection = null
    this._boundKeyDown = this._handleKeyDown.bind(this)
    this._boundTouchStart = this._handleTouchStart.bind(this)
    this._touchElement = null
  }

  onDirection(callback) {
    this._onDirection = callback
  }

  bindKeyboard() {
    window.addEventListener('keydown', this._boundKeyDown)
  }

  bindTouch(element) {
    this._touchElement = element
    element.addEventListener('touchstart', this._boundTouchStart, { passive: false })
  }

  _handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const dir = KEY_MAP[e.code]
    if (dir && this._onDirection) {
      e.preventDefault()
      this._onDirection(dir)
    }
  }

  _handleTouchStart(e) {
    if (!this._onDirection || !this._touchElement) return
    e.preventDefault()

    const touch = e.touches[0]
    const rect = this._touchElement.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const midX = rect.width / 2

    // Left half = turn left, right half = turn right
    // But "left" and "right" are relative to the player's current direction
    // We'll just emit LEFT/RIGHT and let the player's queueDirection handle it
    if (x < midX) {
      this._onDirection('turn_left')
    } else {
      this._onDirection('turn_right')
    }
  }

  destroy() {
    window.removeEventListener('keydown', this._boundKeyDown)
    if (this._touchElement) {
      this._touchElement.removeEventListener('touchstart', this._boundTouchStart)
      this._touchElement = null
    }
    this._onDirection = null
  }
}

// Convert relative turn (left/right) to absolute direction based on current heading
export function resolveRelativeTurn(currentDirection, turn) {
  if (turn !== 'turn_left' && turn !== 'turn_right') return turn  // already absolute

  const clockwise = [DIRECTIONS.UP, DIRECTIONS.RIGHT, DIRECTIONS.DOWN, DIRECTIONS.LEFT]
  const idx = clockwise.indexOf(currentDirection)

  if (turn === 'turn_right') {
    return clockwise[(idx + 1) % 4]
  } else {
    return clockwise[(idx + 3) % 4]
  }
}
