import { useState, useCallback, useEffect, useRef } from 'react'
import { BOARD_SIZE, MIN_WORD_LENGTH } from '../constants/gameConfig'
import { isValidWord } from '../utils/dictionaryUtils'

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) <= 1 &&
    Math.abs(a.col - b.col) <= 1 &&
    !(a.row === b.row && a.col === b.col)
}

function pathContains(path, row, col) {
  return path.some(p => p.row === row && p.col === col)
}

export function useDragSelection(rendererRef, appRef, board, enabled, dictionary) {
  const [selectedPath, setSelectedPath] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const pathRef = useRef([])
  const draggingRef = useRef(false)
  const dictRef = useRef(dictionary)
  const boardRef = useRef(board)
  dictRef.current = dictionary
  boardRef.current = board

  const clearSelection = useCallback(() => {
    setSelectedPath([])
    pathRef.current = []
    setIsDragging(false)
    draggingRef.current = false
    rendererRef.current?.clearHighlight()
  }, [rendererRef])

  useEffect(() => {
    const renderer = rendererRef.current
    const app = appRef.current
    if (!renderer || !app || !board) return
    if (!enabled) {
      clearSelection()
      return
    }

    function getPathWord(path) {
      const b = boardRef.current
      if (!b) return ''
      return path.map(({ row, col }) => b[row]?.[col]?.letter || '').join('')
    }

    function isPathValid(path) {
      const word = getPathWord(path)
      return word.length >= MIN_WORD_LENGTH && dictRef.current && isValidWord(word, dictRef.current)
    }

    function handlePointerDown(e) {
      const pos = renderer.getTileAtPoint(e.global.x, e.global.y)
      if (!pos) return

      draggingRef.current = true
      setIsDragging(true)
      pathRef.current = [pos]
      setSelectedPath([pos])
      renderer.highlightPath([pos], false)
    }

    function handlePointerMove(e) {
      if (!draggingRef.current) return

      const path = pathRef.current
      if (path.length === 0) return
      const last = path[path.length - 1]

      let pos = renderer.getTileAtPoint(e.global.x, e.global.y, false)
      if (!pos) {
        pos = renderer.getTileAtPoint(e.global.x, e.global.y, true)
        if (!pos || !isAdjacent(last, pos)) return
      }

      if (pos.row === last.row && pos.col === last.col) return

      // Backtracking: if hovering over the second-to-last tile, pop
      if (path.length >= 2) {
        const prev = path[path.length - 2]
        if (pos.row === prev.row && pos.col === prev.col) {
          const newPath = path.slice(0, -1)
          pathRef.current = newPath
          setSelectedPath([...newPath])
          renderer.highlightPath(newPath, isPathValid(newPath))
          return
        }
      }

      if (!isAdjacent(last, pos)) return
      if (pathContains(path, pos.row, pos.col)) return

      const newPath = [...path, pos]
      pathRef.current = newPath
      setSelectedPath([...newPath])
      renderer.highlightPath(newPath, isPathValid(newPath))
    }

    function handlePointerUp() {
      draggingRef.current = false
      setIsDragging(false)
    }

    const stage = app.stage
    stage.eventMode = 'static'
    stage.hitArea = app.screen

    stage.on('pointerdown', handlePointerDown)
    stage.on('pointermove', handlePointerMove)
    stage.on('pointerup', handlePointerUp)
    stage.on('pointerupoutside', handlePointerUp)

    return () => {
      stage.off('pointerdown', handlePointerDown)
      stage.off('pointermove', handlePointerMove)
      stage.off('pointerup', handlePointerUp)
      stage.off('pointerupoutside', handlePointerUp)
    }
  }, [rendererRef, appRef, board, enabled, clearSelection])

  const selectedWord = selectedPath.length > 0 && board
    ? selectedPath.map(({ row, col }) => board[row]?.[col]?.letter || '').join('')
    : ''

  return { selectedPath, selectedWord, isDragging, clearSelection }
}
