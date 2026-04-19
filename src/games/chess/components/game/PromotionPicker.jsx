import { PIECE_UNICODE } from '../../constants/gameConfig'
import styles from './PromotionPicker.module.css'

const PROMO_PIECES = ['Q', 'R', 'B', 'N']

export default function PromotionPicker({ color, onSelect }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h3 className={styles.title}>Promote Pawn</h3>
        <div className={styles.options}>
          {PROMO_PIECES.map((type) => (
            <button
              key={type}
              className={styles.option}
              onClick={() => onSelect(type)}
            >
              <span className={styles.piece}>
                {PIECE_UNICODE[color + type]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
