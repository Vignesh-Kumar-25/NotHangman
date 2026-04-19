import styles from './Board.module.css'

export default function Board({
  rows,
  path,
  invalidPath,
  lastMoveTiles,
  lastMoveAction,
  animationCycle,
  onTilePointerDown,
  onTilePointerEnter,
  onTileClick,
}) {
  const selected = new Set(path)
  const invalid = new Set(invalidPath || [])
  const lastMove = new Set(lastMoveTiles || [])

  function handleBoardPointerMove(event) {
    const tile = event.target.closest('button[data-tile-index]')
    if (!tile) return
    const index = Number(tile.dataset.tileIndex)
    if (!Number.isInteger(index)) return
    onTilePointerEnter(index)
  }

  return (
    <div className={styles.board} onPointerMove={handleBoardPointerMove}>
      {rows.flat().map((letter, index) => {
        const className = [
          styles.tile,
          selected.has(index) ? styles.selected : '',
          invalid.has(index) ? styles.invalid : '',
          path.length === 0 && lastMove.has(index) && lastMoveAction !== 'shuffle' ? styles.lastMove : '',
          path.length === 0 && lastMove.has(index) && lastMoveAction !== 'shuffle' ? styles.lastMoveFlash : '',
          path.length === 0 && lastMove.has(index) && lastMoveAction === 'shuffle' ? styles.shuffleFlash : '',
          path.length === 0 && lastMove.has(index) && lastMoveAction === 'swap' ? styles.swapMove : '',
          path[0] === index ? styles.anchor : '',
        ].join(' ')

        return (
          <button
            key={`${animationCycle}-${index}`}
            className={className}
            data-tile-index={index}
            onPointerDown={() => onTilePointerDown(index)}
            onPointerEnter={() => onTilePointerEnter(index)}
            onClick={() => onTileClick(index)}
            type="button"
          >
            {letter.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
