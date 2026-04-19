import { useEffect, useRef, useState } from 'react'
import { areAdjacent, wordFromPath } from '../utils/boardUtils'

export function useBoardSelection(rows) {
  const [path, setPath] = useState([])
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const activePointerIdRef = useRef(null)
  const suppressClickIndexRef = useRef(null)

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
  }, [])

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
    setPath((current) => {
      if (current.length === 1 && current[0] === index) {
        draggingRef.current = false
        activePointerIdRef.current = null
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

  function handlePointerEnter(index) {
    if (!draggingRef.current) return
    appendIndex(index)
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

  function endSelection(pointerId = null) {
    if (pointerId !== null && activePointerIdRef.current !== null && pointerId !== activePointerIdRef.current) {
      return
    }
    draggingRef.current = false
    activePointerIdRef.current = null
    setDragging(false)
  }

  function clearSelection() {
    endSelection()
    suppressClickIndexRef.current = null
    setPath([])
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
