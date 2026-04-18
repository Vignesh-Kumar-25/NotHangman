import { TURN_DURATION } from '../../constants/gameConfig'
import styles from './TurnTimer.module.css'

const RADIUS = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TurnTimer({ timeLeft, turnDuration = TURN_DURATION }) {
  const fraction = timeLeft / turnDuration
  const offset = CIRCUMFERENCE * (1 - fraction)
  const isLow = timeLeft <= 10

  return (
    <div className={styles.timer}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle className={styles.timerCircleBg} cx="26" cy="26" r={RADIUS} />
        <circle
          className={`${styles.timerCircle} ${isLow ? styles.low : ''}`}
          cx="26"
          cy="26"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={styles.timerText}>{timeLeft}</span>
    </div>
  )
}
