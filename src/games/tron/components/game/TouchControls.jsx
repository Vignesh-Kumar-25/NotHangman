import styles from './TouchControls.module.css'

export default function TouchControls({ onLeft, onRight }) {
  // Only show on touch devices
  const hasTouch = 'ontouchstart' in window

  if (!hasTouch) return null

  return (
    <div className={styles.container}>
      <button
        className={styles.zone}
        onTouchStart={(e) => {
          e.preventDefault()
          onLeft()
        }}
      >
        <span className={styles.arrow}>&larr;</span>
      </button>
      <button
        className={styles.zone}
        onTouchStart={(e) => {
          e.preventDefault()
          onRight()
        }}
      >
        <span className={styles.arrow}>&rarr;</span>
      </button>
    </div>
  )
}
