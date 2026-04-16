import styles from './TouchControls.module.css'

export default function TouchControls({ onLeft, onRight }) {
  const hasTouch = 'ontouchstart' in window
  if (!hasTouch) return null

  return (
    <div className={styles.container}>
      <button
        className={styles.zone}
        onTouchStart={(e) => { e.preventDefault(); onLeft(true) }}
        onTouchEnd={(e) => { e.preventDefault(); onLeft(false) }}
        onTouchCancel={(e) => { e.preventDefault(); onLeft(false) }}
      >
        <span className={styles.arrow}>&larr;</span>
        <span className={styles.label}>TURN LEFT</span>
      </button>
      <div className={styles.divider} />
      <button
        className={styles.zone}
        onTouchStart={(e) => { e.preventDefault(); onRight(true) }}
        onTouchEnd={(e) => { e.preventDefault(); onRight(false) }}
        onTouchCancel={(e) => { e.preventDefault(); onRight(false) }}
      >
        <span className={styles.arrow}>&rarr;</span>
        <span className={styles.label}>TURN RIGHT</span>
      </button>
    </div>
  )
}
