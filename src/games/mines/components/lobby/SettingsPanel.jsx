import { updateSettings } from '../../db'
import { BOARD_SIZE_OPTIONS, BOMB_PRESETS, TURN_TIME_OPTIONS } from '../../constants/gameConfig'
import styles from './SettingsPanel.module.css'

export default function SettingsPanel({ roomCode, meta, isHost }) {
  const currentRows = meta.boardRows ?? 10
  const currentCols = meta.boardCols ?? 10
  const currentBombs = meta.bombCount ?? 15
  const currentTimeLimit = meta.turnTimeLimit ?? 30
  const currentRounds = meta.numRounds ?? 3

  async function handleRoundsChange(delta) {
    if (!isHost) return
    const next = Math.min(10, Math.max(1, currentRounds + delta))
    if (next !== currentRounds) await updateSettings(roomCode, { numRounds: next })
  }

  async function handleBoardSize(rows, cols) {
    if (!isHost) return
    const maxBombs = rows * cols - 1
    const updates = { boardRows: rows, boardCols: cols }
    if (currentBombs > maxBombs) updates.bombCount = Math.min(currentBombs, maxBombs)
    await updateSettings(roomCode, updates)
  }

  async function handleBombCount(count) {
    if (!isHost) return
    const maxBombs = currentRows * currentCols - 1
    await updateSettings(roomCode, { bombCount: Math.min(count, maxBombs) })
  }

  async function handleTimeLimit(value) {
    if (!isHost) return
    await updateSettings(roomCode, { turnTimeLimit: value })
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Game Settings</h3>

      <div className={styles.setting}>
        <span className={styles.label}>Board Size</span>
        <div className={styles.options}>
          {BOARD_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`${styles.optBtn} ${currentRows === opt.rows && currentCols === opt.cols ? styles.active : ''}`}
              onClick={() => handleBoardSize(opt.rows, opt.cols)}
              disabled={!isHost}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.setting}>
        <span className={styles.label}>Bombs</span>
        <div className={styles.options}>
          {BOMB_PRESETS.map((count) => {
            const maxBombs = currentRows * currentCols - 1
            const disabled = !isHost || count > maxBombs
            return (
              <button
                key={count}
                className={`${styles.optBtn} ${currentBombs === count ? styles.active : ''}`}
                onClick={() => handleBombCount(count)}
                disabled={disabled}
              >
                {count}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.setting}>
        <span className={styles.label}>Turn Timer</span>
        <div className={styles.options}>
          {TURN_TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.optBtn} ${currentTimeLimit === opt.value ? styles.active : ''}`}
              onClick={() => handleTimeLimit(opt.value)}
              disabled={!isHost}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.setting}>
        <span className={styles.label}>Rounds</span>
        <div className={styles.stepper}>
          {isHost ? (
            <>
              <button
                className={styles.stepBtn}
                onClick={() => handleRoundsChange(-1)}
                disabled={currentRounds <= 1}
              >−</button>
              <span className={styles.stepValue}>{currentRounds}</span>
              <button
                className={styles.stepBtn}
                onClick={() => handleRoundsChange(1)}
                disabled={currentRounds >= 10}
              >+</button>
            </>
          ) : (
            <span className={styles.stepValue}>{currentRounds}</span>
          )}
        </div>
      </div>

      {!isHost && <p className={styles.hint}>Only the host can change settings</p>}
    </div>
  )
}
