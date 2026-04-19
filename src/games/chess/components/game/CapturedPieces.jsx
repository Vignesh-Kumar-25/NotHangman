import { PIECE_UNICODE } from '../../constants/gameConfig'
import styles from './CapturedPieces.module.css'

export default function CapturedPieces({ pieces, capturedByColor }) {
  if (!pieces || pieces.length === 0) return null

  const capturedColor = capturedByColor === 'w' ? 'b' : 'w'

  return (
    <div className={styles.captured}>
      {pieces.map((type, i) => (
        <span key={i} className={styles.piece}>
          {PIECE_UNICODE[capturedColor + type]}
        </span>
      ))}
    </div>
  )
}
