import { useCallback, useEffect, useRef, useState } from 'react'
import { areAdjacent, wordFromPath } from '../utils/boardUtils'

export function useBoardSelection(rows) {
  const [path, setPath] = useState([])
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const activePointerIdRef = useRef(null)
  const suppressClickIndexRef = useRef(null)
  const touchBacktrackCandidateRef = useRef(null)

  const endSelection = useCallback(function endSelection(pointerId = null) {
    if (pointerId !== null && activePointerIdRef.current !== null && pointerId !== activePointerIdRef.current) {
      return
    }
    draggingRef.current = false
    activePointerIdRef.current = null
    touchBacktrackCandidateRef.current = null
    setDragging(false)
  }, [])

  const clearSelection = useCallback(function clearSelection() {
    endSelection()
    suppressClickIndexRef.current = null
    touchBacktrackCandidateRef.current = null
    setPath([])
  }, [endSelection])

  useEffect(() => {
    function handlePointerUp(event) {
      endSelection(event.pointerId)
    }

    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [endSelection])

  function appendIndex(index) {
    setPath((current) => {
      if (current.length === 0) return [index]
      const last = current[current.length - 1]
      if (index === last) return current

      if (current.length > 1 && index === current[current.length - 2]) {
        return current.slice(0, -1)
      }

      if (current.includes(index) || !areAdjacent(last, index)) {
        return current
      }

      return [...current, index]
    })
  }

  function handlePointerDown(index, pointerId = null) {
    draggingRef.current = true
    activePointerIdRef.current = pointerId
    setDragging(true)
    suppressClickIndexRef.current = index
    touchBacktrackCandidateRef.current = null
    setPath((current) => {
      if (current.length === 1 && current[0] === index) {
        draggingRef.current = false
        activePointerIdRef.current = null
        touchBacktrackCandidateRef.current = null
        setDragging(false)
        return []
      }

      if (current.length > 0 && current[current.length - 1] !== index) {
        if (!current.includes(index) && areAdjacent(current[current.length - 1], index)) {
          return [...current, index]
        }
      }
      return [index]
    })
  }

  function handlePointerEnter(index, pointerType = 'mouse') {
    if (!draggingRef.current) return

    if (pointerType !== 'touch') {
      touchBacktrackCandidateRef.current = null
      appendIndex(index)
      return
    }

    setPath((current) => {
      if (current.length === 0) return [index]
      const last = current[current.length - 1]
      if (index === last) {
        touchBacktrackCandidateRef.current = null
        return current
      }

      const previous = current[current.length - 2]
      if (current.length > 1 && index === previous) {
        if (touchBacktrackCandidateRef.current === index) {
          touchBacktrackCandidateRef.current = null
          return current.slice(0, -1)
        }
        touchBacktrackCandidateRef.current = index
        return current
      }

      touchBacktrackCandidateRef.current = null
      if (current.includes(index) || !areAdjacent(last, index)) {
        return current
      }

      return [...current, index]
    })
  }

  function handleTileClick(index) {
    if (draggingRef.current) return
    if (suppressClickIndexRef.current === index) {
      suppressClickIndexRef.current = null
      return
    }

    setPath((current) => {
      if (current.length === 1 && current[0] === index) {
        return []
      }

      if (current.length > 0 && current[0] === index) {
        return []
      }

      const last = current[current.length - 1]
      if (current.length === 0) return [index]
      if (index === last) return current

      if (current.length > 1 && index === current[current.length - 2]) {
        return current.slice(0, -1)
      }

      if (current.includes(index) || !areAdjacent(last, index)) {
        return current
      }

      return [...current, index]
    })
  }

  return {
    path,
    dragging,
    currentWord: rows && path.length ? wordFromPath(rows, path).toUpperCase() : '',
    handlePointerDown,
    handlePointerEnter,
    handleTileClick,
    endSelection,
    clearSelection,
  }
}
