import styles from './LoadingSpinner.module.css'

export default function LoadingSpinner({ size = 48 }) {
  return (
    <div className={styles.spinner} style={{ width: size, height: size }}>
      <svg viewBox="0 0 50 50" fill="none">
        <circle
          cx="25" cy="25" r="20"
          stroke="var(--accent-primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="90 60"
        />
      </svg>
    </div>
  )
}
