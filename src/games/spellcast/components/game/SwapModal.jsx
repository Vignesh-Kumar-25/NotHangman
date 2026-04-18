import { useState } from 'react'
import styles from './SwapModal.module.css'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function SwapModal({ board, onSwap, onCancel }) {
  const [selectedTile, setSelectedTile] = useState(null)
  const [step, setStep] = useState('tile')

  function handleTileClick(row, col) {
    setSelectedTile({ row, col })
    setStep('letter')
  }

  function handleLetterClick(letter) {
    if (selectedTile) {
      onSwap(selectedTile.row, selectedTile.col, letter)
    }
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Swap a Letter</h3>

        {step === 'tile' && (
          <>
            <p className={styles.instruction}>Click a tile on the board to replace</p>
            <div className={styles.letterGrid}>
              {board && board.flat().map((tile, i) => {
                const row = Math.floor(i / 5)
                const col = i % 5
                return (
                  <button
                    key={`${row}-${col}`}
                    className={styles.letterBtn}
                    onClick={() => handleTileClick(row, col)}
                  >
                    {tile.letter}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 'letter' && selectedTile && (
          <>
            <p className={styles.selectedTile}>
              Replacing: {board[selectedTile.row][selectedTile.col].letter} at ({selectedTile.row + 1}, {selectedTile.col + 1})
            </p>
            <p className={styles.instruction}>Choose the new letter</p>
            <div className={styles.letterGrid}>
              {LETTERS.map(letter => (
                <button
                  key={letter}
                  className={styles.letterBtn}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          </>
        )}

        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
