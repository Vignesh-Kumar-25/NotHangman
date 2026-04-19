import { useEffect, useRef, useState } from 'react'
import { areAdjacent, wordFromPath } from '../utils/boardUtils'

export function useBoardSelection(rows) {
  const [path, setPath] = useState([])
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const suppressClickIndexRef = useRef(null)

  useEffect(() => {
    function handlePointerUp() {
      draggingRef.current = false
      setDragging(false)
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
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

  function handlePointerDown(index) {
    draggingRef.current = true
    setDragging(true)
    suppressClickIndexRef.current = index
    setPath((current) => {
      if (current.length === 1 && current[0] === index) {
        draggingRef.current = false
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

  function clearSelection() {
    draggingRef.current = false
    suppressClickIndexRef.current = null
    setDragging(false)
    setPath([])
  }

  return {
    path,
    dragging,
    currentWord: rows && path.length ? wordFromPath(rows, path).toUpperCase() : '',
    handlePointerDown,
    handlePointerEnter,
    handleTileClick,
    clearSelection,
  }
}
