import { useCountdown } from '../../hooks/useCountdown'
import styles from './CountdownOverlay.module.css'

export default function CountdownOverlay({ isActive, round }) {
  const count = useCountdown(isActive)

  if (!isActive) return null

  return (
    <div className={styles.overlay}>
      <p className={styles.round}>Round {round}</p>
      <p className={styles.count}>{count > 0 ? count : 'GO!'}</p>
    </div>
  )
}
