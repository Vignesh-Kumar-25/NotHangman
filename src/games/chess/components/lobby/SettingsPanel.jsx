import { updateSettings } from '../../db'
import { TURN_TIME_OPTIONS } from '../../constants/gameConfig'
import styles from './SettingsPanel.module.css'

export default function SettingsPanel({ roomCode, meta, isHost }) {
  const turnTimeLimit = meta.turnTimeLimit ?? 0

  async function handleTimeChange(value) {
    if (!isHost) return
    await updateSettings(roomCode, { turnTimeLimit: value })
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Settings</h3>
      <div className={styles.row}>
        <span className={styles.label}>Turn Timer</span>
        <div className={styles.options}>
          {TURN_TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.option} ${turnTimeLimit === opt.value ? styles.optionActive : ''}`}
              onClick={() => handleTimeChange(opt.value)}
              disabled={!isHost}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
