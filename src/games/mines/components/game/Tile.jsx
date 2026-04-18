import { NUMBER_COLORS } from '../../constants/gameConfig'
import styles from './Tile.module.css'

export default function Tile({ index, value, isRevealed, canClick, onClick }) {
  const isBomb = value === -1
  const isEmpty = value === 0
  const number = value > 0 ? value : null

  function handleClick() {
    if (!canClick || isRevealed) return
    onClick(index)
  }

  const classes = [styles.tile]
  if (isRevealed) {
    classes.push(styles.revealed)
    if (isBomb) classes.push(styles.bomb)
    if (isEmpty) classes.push(styles.empty)
  } else {
    classes.push(styles.hidden)
    if (canClick) classes.push(styles.clickable)
  }

  return (
    <button
      className={classes.join(' ')}
      onClick={handleClick}
      disabled={isRevealed || !canClick}
      aria-label={
        isRevealed
          ? isBomb ? 'Bomb' : `${value} adjacent bombs`
          : 'Unrevealed tile'
      }
    >
      {isRevealed && isBomb && <span className={styles.bombIcon}>&#128163;</span>}
      {isRevealed && number && (
        <span className={styles.number} style={{ color: NUMBER_COLORS[number] || '#fff' }}>
          {number}
        </span>
      )}
    </button>
  )
}
