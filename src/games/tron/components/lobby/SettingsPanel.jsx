import { updateSettings } from '../../db'
import { MAX_NUM_ROUNDS, ROUND_DURATIONS, TRAIL_LENGTH_OPTIONS } from '../../constants/gameConfig'
import styles from './SettingsPanel.module.css'

export default function SettingsPanel({ roomCode, meta, isHost }) {
  const numRounds = meta?.numRounds ?? 2
  const roundDuration = meta?.roundDuration ?? 90
  const trailLength = meta?.trailLength ?? 60
  const powerUpsEnabled = meta?.powerUpsEnabled !== false

  async function handleChange(key, value) {
    if (!isHost) return
    await updateSettings(roomCode, { [key]: value })
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Game Settings</h3>

      {/* Rounds */}
      <div className={styles.setting}>
        <span className={styles.label}>Rounds</span>
        <div className={styles.picker}>
          {isHost ? (
            <>
              <button
                className={styles.btn}
                onClick={() => handleChange('numRounds', Math.max(1, numRounds - 1))}
                disabled={numRounds <= 1}
              >&minus;</button>
              <span className={styles.value}>{numRounds}</span>
              <button
                className={styles.btn}
                onClick={() => handleChange('numRounds', Math.min(MAX_NUM_ROUNDS, numRounds + 1))}
                disabled={numRounds >= MAX_NUM_ROUNDS}
              >+</button>
            </>
          ) : (
            <span className={styles.value}>{numRounds}</span>
          )}
        </div>
      </div>

      {/* Round Duration */}
      <div className={styles.setting}>
        <span className={styles.label}>Round Time</span>
        <div className={styles.optionGroup}>
          {ROUND_DURATIONS.map((d) => (
            <button
              key={d}
              className={[styles.optionBtn, roundDuration === d ? styles.active : ''].join(' ')}
              onClick={() => handleChange('roundDuration', d)}
              disabled={!isHost}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* Trail Length */}
      <div className={styles.setting}>
        <span className={styles.label}>Trail Length</span>
        <div className={styles.optionGroup}>
          {TRAIL_LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={[styles.optionBtn, trailLength === opt.value ? styles.active : ''].join(' ')}
              onClick={() => handleChange('trailLength', opt.value)}
              disabled={!isHost}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Power-ups toggle */}
      <div className={styles.setting}>
        <span className={styles.label}>Power-ups</span>
        <button
          className={[styles.toggleBtn, powerUpsEnabled ? styles.toggleOn : ''].join(' ')}
          onClick={() => handleChange('powerUpsEnabled', !powerUpsEnabled)}
          disabled={!isHost}
        >
          {powerUpsEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  )
}
