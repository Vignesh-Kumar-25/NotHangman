export function generateBombs(rows, cols, count) {
  const total = rows * cols
  const safeCount = Math.min(count, total - 1)
  const bombs = new Set()
  while (bombs.size < safeCount) {
    bombs.add(Math.floor(Math.random() * total))
  }
  return Array.from(bombs)
}

export function getNeighborIndices(index, rows, cols) {
  const row = Math.floor(index / cols)
  const col = index % cols
  const neighbors = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push(nr * cols + nc)
      }
    }
  }
  return neighbors
}

export function getAdjacentBombCount(index, bombSet, rows, cols) {
  let count = 0
  for (const ni of getNeighborIndices(index, rows, cols)) {
    if (bombSet.has(ni)) count++
  }
  return count
}

export function floodReveal(startIndex, bombSet, rows, cols, existingRevealed) {
  const toReveal = {}
  const stack = [startIndex]
  const visited = new Set(
    Object.keys(existingRevealed || {}).map(Number)
  )

  while (stack.length > 0) {
    const index = stack.pop()
    if (visited.has(index)) continue
    if (bombSet.has(index)) continue
    visited.add(index)

    const count = getAdjacentBombCount(index, bombSet, rows, cols)
    toReveal[index] = count

    if (count === 0) {
      for (const ni of getNeighborIndices(index, rows, cols)) {
        if (!visited.has(ni) && !bombSet.has(ni)) {
          stack.push(ni)
        }
      }
    }
  }

  return toReveal
}

export function getNextAlivePlayerIndex(currentIndex, playerOrder, eliminatedPlayers) {
  const total = playerOrder.length
  for (let i = 1; i <= total; i++) {
    const nextIndex = (currentIndex + i) % total
    const uid = playerOrder[nextIndex]
    if (!eliminatedPlayers[uid]) return nextIndex
  }
  return -1
}
