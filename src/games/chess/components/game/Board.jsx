import { BOARD_ROWS, BOARD_COLS, PIECE_UNICODE } from '../../constants/gameConfig'
import styles from './Board.module.css'

export default function Board({
  board,
  myColor,
  selectedSquare,
  legalMoves,
  lastMove,
  kingInCheck,
  onSquareClick,
  disabled,
}) {
  const flipped = myColor === 'b'

  const rows = []
  for (let ri = 0; ri < BOARD_ROWS; ri++) {
    const r = flipped ? BOARD_ROWS - 1 - ri : ri
    const cols = []
    for (let ci = 0; ci < BOARD_COLS; ci++) {
      const c = flipped ? BOARD_COLS - 1 - ci : ci
      const piece = board[r][c]
      const isDark = (r + c) % 2 === 1
      const isSelected = selectedSquare && selectedSquare.r === r && selectedSquare.c === c
      const isLegal = legalMoves.some(m => m.r === r && m.c === c)
      const isCapture = isLegal && piece
      const isLastFrom = lastMove && lastMove.fromR === r && lastMove.fromC === c
      const isLastTo = lastMove && lastMove.toR === r && lastMove.toC === c
      const isCheck = kingInCheck && piece && piece.type === 'K' && piece.color === kingInCheck

      const classNames = [
        styles.square,
        isDark ? styles.dark : styles.light,
        isSelected ? styles.selected : '',
        (isLastFrom || isLastTo) ? styles.lastMove : '',
        isCheck ? styles.check : '',
      ].filter(Boolean).join(' ')

      cols.push(
        <div
          key={`${r}-${c}`}
          className={classNames}
          onClick={() => !disabled && onSquareClick(r, c)}
        >
          {piece && (
            <span className={`${styles.piece} ${piece.color === 'w' ? styles.whitePiece : styles.blackPiece}`}>
              {PIECE_UNICODE[piece.color + piece.type]}
            </span>
          )}
          {isLegal && !isCapture && <span className={styles.dot} />}
          {isCapture && <span className={styles.captureRing} />}
        </div>
      )
    }
    rows.push(
      <div key={ri} className={styles.row}>
        <span className={styles.rankLabel}>{flipped ? ri + 1 : BOARD_ROWS - ri}</span>
        {cols}
      </div>
    )
  }

  const fileLabels = ['a', 'b', 'c', 'd', 'e']
  const orderedFiles = flipped ? [...fileLabels].reverse() : fileLabels

  return (
    <div className={styles.boardContainer}>
      <div className={styles.board}>
        {rows}
        <div className={styles.fileLabels}>
          <span className={styles.rankLabel} />
          {orderedFiles.map((f) => (
            <span key={f} className={styles.fileLabel}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
