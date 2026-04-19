import { useEffect, useRef } from 'react'
import styles from './Board.module.css'

function getDirectionClass(fromIndex, toIndex) {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return ''
  const rowDelta = Math.floor(toIndex / 5) - Math.floor(fromIndex / 5)
  const colDelta = (toIndex % 5) - (fromIndex % 5)
  const key = `${rowDelta},${colDelta}`

  switch (key) {
    case '-1,0':
      return styles.arrowUp
    case '-1,1':
      return styles.arrowUpRight
    case '0,1':
      return styles.arrowRight
    case '1,1':
      return styles.arrowDownRight
    case '1,0':
      return styles.arrowDown
    case '1,-1':
      return styles.arrowDownLeft
    case '0,-1':
      return styles.arrowLeft
    case '-1,-1':
      return styles.arrowUpLeft
    default:
      return ''
  }
}

export default function Board({
  rows,
  path,
  remotePath,
  invalidPath,
  lastMoveTiles,
  lastMoveAction,
  lastMovePhase,
  animationCycle,
  onTilePointerDown,
  onTilePointerEnter,
  onTileClick,
  onSelectionEnd,
}) {
  const selected = new Set(path)
  const remoteSelected = new Set(remotePath || [])
  const invalid = new Set(invalidPath || [])
  const lastMove = new Set(lastMoveTiles || [])
  const activePointerIdRef = useRef(null)
  const activeTouchIdRef = useRef(null)
  const ignorePointerUntilRef = useRef(0)
  const localArrowMap = new Map(path.map((tileIndex, pathIndex) => [
    tileIndex,
    getDirectionClass(tileIndex, path[pathIndex + 1]),
  ]))
  const remoteArrowMap = new Map((remotePath || []).map((tileIndex, pathIndex) => [
    tileIndex,
    getDirectionClass(tileIndex, remotePath[pathIndex + 1]),
  ]))

  function resolveTileIndex(element) {
    const tile = element?.closest?.('button[data-tile-index]')
    if (!tile) return null
    const index = Number(tile.dataset.tileIndex)
    return Number.isInteger(index) ? index : null
  }

  useEffect(() => {
    function handleWindowPointerMove(event) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return
      }
      handlePointerMoveAtPoint(event.clientX, event.clientY, event.target)
    }

    function handleWindowPointerEnd(event) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return
      }
      activePointerIdRef.current = null
      onSelectionEnd(event.pointerId)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
    }
  }, [onSelectionEnd])

  useEffect(() => {
    function handleWindowTouchMove(event) {
      if (activeTouchIdRef.current === null) return
      const touch = Array.from(event.touches).find((entry) => entry.identifier === activeTouchIdRef.current)
      if (!touch) return
      event.preventDefault()
      handlePointerMoveAtPoint(touch.clientX, touch.clientY, document.elementFromPoint(touch.clientX, touch.clientY))
    }

    function handleWindowTouchEnd(event) {
      if (activeTouchIdRef.current === null) return
      const endedTouch = Array.from(event.changedTouches).find((entry) => entry.identifier === activeTouchIdRef.current)
      if (!endedTouch) return
      activeTouchIdRef.current = null
      ignorePointerUntilRef.current = Date.now() + 600
      onSelectionEnd()
    }

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false })
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: false })
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: false })
    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove)
      window.removeEventListener('touchend', handleWindowTouchEnd)
      window.removeEventListener('touchcancel', handleWindowTouchEnd)
    }
  }, [onSelectionEnd])

  function handlePointerMoveAtPoint(clientX, clientY, fallbackTarget) {
    const element = document.elementFromPoint(clientX, clientY)
    const index = resolveTileIndex(element) ?? resolveTileIndex(fallbackTarget)
    if (index === null) return
    onTilePointerEnter(index)
  }

  return (
    <div
      className={styles.board}
      onPointerMove={(event) => handlePointerMoveAtPoint(event.clientX, event.clientY, event.target)}
      onTouchStart={(event) => {
        const touch = event.changedTouches[0]
        if (!touch) return
        const index = resolveTileIndex(document.elementFromPoint(touch.clientX, touch.clientY))
        if (index === null) return
        event.preventDefault()
        activeTouchIdRef.current = touch.identifier
        ignorePointerUntilRef.current = Date.now() + 600
        onTilePointerDown(index, null)
      }}
    >
      {rows.flat().map((letter, index) => {
        const className = [
          styles.tile,
          selected.has(index) ? styles.selected : '',
          !selected.has(index) && remoteSelected.has(index) ? styles.remoteSelected : '',
          invalid.has(index) ? styles.invalid : '',
          path.length === 0 && remotePath?.length === 0 && lastMove.has(index) && lastMoveAction !== 'shuffle' ? styles.lastMove : '',
          path.length === 0 && remotePath?.length === 0 && lastMove.has(index) && lastMoveAction === 'cast' && lastMovePhase === 'preview' ? styles.castPreviewFlash : '',
          path.length === 0 && remotePath?.length === 0 && lastMove.has(index) && lastMoveAction !== 'cast' && lastMoveAction !== 'shuffle' ? styles.lastMoveFlash : '',
          path.length === 0 && lastMove.has(index) && lastMoveAction === 'shuffle' ? styles.shuffleFlash : '',
          path.length === 0 && lastMove.has(index) && lastMoveAction === 'swap' ? styles.swapMove : '',
          path[0] === index ? styles.anchor : '',
        ].join(' ')
        const arrowClass = localArrowMap.get(index) || remoteArrowMap.get(index) || ''
        const showArrow = Boolean(arrowClass)
        const isRemoteArrow = !localArrowMap.get(index) && Boolean(remoteArrowMap.get(index))

        return (
          <button
            key={`${animationCycle}-${index}`}
            className={className}
            data-tile-index={index}
            onPointerDown={(event) => {
              if (Date.now() < ignorePointerUntilRef.current) return
              activePointerIdRef.current = event.pointerId
              onTilePointerDown(index, event.pointerId)
            }}
            onPointerEnter={() => onTilePointerEnter(index)}
            onClick={() => {
              if (Date.now() < ignorePointerUntilRef.current) return
              onTileClick(index)
            }}
            type="button"
          >
            <span className={styles.letter}>{letter.toUpperCase()}</span>
            {showArrow && (
              <span
                className={[
                  styles.pathArrow,
                  arrowClass,
                  isRemoteArrow ? styles.pathArrowRemote : styles.pathArrowLocal,
                ].join(' ')}
                aria-hidden="true"
              >
                {'\u2191'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
