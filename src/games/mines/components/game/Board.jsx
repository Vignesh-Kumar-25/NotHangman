import Tile from './Tile'
import styles from './Board.module.css'

export default function Board({ rows, cols, revealed, canClick, onTileClick }) {
  const tiles = []
  const total = rows * cols

  for (let i = 0; i < total; i++) {
    const isRevealed = revealed[i] !== undefined
    const value = isRevealed ? revealed[i] : null
    tiles.push(
      <Tile
        key={i}
        index={i}
        value={value}
        isRevealed={isRevealed}
        canClick={canClick}
        onClick={onTileClick}
      />
    )
  }

  return (
    <div
      className={styles.board}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {tiles}
    </div>
  )
}
