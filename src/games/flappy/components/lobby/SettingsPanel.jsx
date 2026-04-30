import { updateSettings } from '../../db'
import { PIPE_GAP_OPTIONS, SPEED_OPTIONS } from '../../constants/gameConfig'
import styles from './SettingsPanel.module.css'

export default function SettingsPanel({ roomCode, meta, isHost }) {
  const pipeGap = meta.pipeGap ?? 150
  const gameSpeed = meta.gameSpeed ?? 1

  async function handleUpdate(settings) {
    if (!isHost) return
    await updateSettings(roomCode, settings)
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Game Settings</h3>

      <div className={styles.setting}>
        <span className={styles.label}>Pipe Gap</span>
        <div className={styles.options}>
          {PIPE_GAP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.optBtn} ${pipeGap === opt.value ? styles.active : ''}`}
              onClick={() => handleUpdate({ pipeGap: opt.value })}
              disabled={!isHost}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.setting}>
        <span className={styles.label}>Speed</span>
        <div className={styles.options}>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.optBtn} ${gameSpeed === opt.value ? styles.active : ''}`}
              onClick={() => handleUpdate({ gameSpeed: opt.value })}
              disabled={!isHost}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!isHost && <p className={styles.hint}>Only the host can change settings</p>}
    </div>
  )
}
