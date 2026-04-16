import { useRef, useEffect } from 'react'
import { GRID_WIDTH, GRID_HEIGHT, CELL_SIZE } from '../../constants/gameConfig'
import styles from './TronCanvas.module.css'

export default function TronCanvas({ canvasRef }) {
  const containerRef = useRef(null)

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const maxW = container.clientWidth
      const maxH = container.clientHeight
      const gameW = GRID_WIDTH * CELL_SIZE
      const gameH = GRID_HEIGHT * CELL_SIZE
      const scale = Math.min(maxW / gameW, maxH / gameH, 1)

      canvas.style.width = `${gameW * scale}px`
      canvas.style.height = `${gameH * scale}px`
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [canvasRef])

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas
        ref={canvasRef}
        width={GRID_WIDTH * CELL_SIZE}
        height={GRID_HEIGHT * CELL_SIZE}
        className={styles.canvas}
      />
    </div>
  )
}
