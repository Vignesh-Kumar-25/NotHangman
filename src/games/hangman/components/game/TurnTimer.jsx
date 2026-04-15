import { TURN_DURATION } from '../../constants/gameConfig'
import styles from './TurnTimer.module.css'

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TurnTimer({ timeLeft }) {
  const fraction = Math.max(0, timeLeft / TURN_DURATION)
  const dashOffset = CIRCUMFERENCE * (1 - fraction)
  const isWarning = timeLeft <= 10
  const isDanger  = timeLeft <= 5

  return (
    <div
      className={[
        styles.wrapper,
        isWarning ? styles.warning : '',
        isDanger  ? styles.danger  : '',
      ].join(' ')}
      aria-label={`${timeLeft} seconds remaining`}
    >
      <svg viewBox="0 0 56 56" className={styles.svg}>
        {/* Track */}
        <circle
          cx="28" cy="28" r={RADIUS}
          fill="none"
          stroke="var(--bg-card)"
          strokeWidth="5"
        />
        {/* Progress */}
        <circle
          cx="28" cy="28" r={RADIUS}
          fill="none"
          stroke={isDanger ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warning)' : 'var(--accent-secondary)'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={styles.number}>{timeLeft}</span>
    </div>
  )
}
