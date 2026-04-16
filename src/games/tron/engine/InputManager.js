export class InputManager {
  constructor() {
    this.turnInput = 0   // -1 left, 0 straight, 1 right
    this._keysDown = new Set()
    this._boundKeyDown = this._handleKeyDown.bind(this)
    this._boundKeyUp = this._handleKeyUp.bind(this)
    this._touchLeftActive = false
    this._touchRightActive = false
  }

  bindKeyboard() {
    window.addEventListener('keydown', this._boundKeyDown)
    window.addEventListener('keyup', this._boundKeyUp)
  }

  _handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if (e.code === 'KeyA' || e.code === 'ArrowLeft' ||
        e.code === 'KeyD' || e.code === 'ArrowRight') {
      e.preventDefault()
      this._keysDown.add(e.code)
      this._updateTurn()
    }
  }

  _handleKeyUp(e) {
    this._keysDown.delete(e.code)
    this._updateTurn()
  }

  _updateTurn() {
    const left = this._keysDown.has('KeyA') || this._keysDown.has('ArrowLeft') || this._touchLeftActive
    const right = this._keysDown.has('KeyD') || this._keysDown.has('ArrowRight') || this._touchRightActive
    if (left && !right) this.turnInput = -1
    else if (right && !left) this.turnInput = 1
    else this.turnInput = 0
  }

  setTouchLeft(active) {
    this._touchLeftActive = active
    this._updateTurn()
  }

  setTouchRight(active) {
    this._touchRightActive = active
    this._updateTurn()
  }

  destroy() {
    window.removeEventListener('keydown', this._boundKeyDown)
    window.removeEventListener('keyup', this._boundKeyUp)
    this._keysDown.clear()
    this.turnInput = 0
  }
}
