import { BOARD_GEM_COUNT, BOARD_SIZE, GEM_TILE_VALUE } from '../constants/gameConfig'
import WORD_DATA from '../data/words.json'

const FULL_WORDS = WORD_DATA.full
const COMMON_WORDS = WORD_DATA.common

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
const LETTER_WEIGHTS = buildLetterWeights(FULL_WORDS)
const LETTER_FREQUENCIES = buildLetterFrequencyMap(FULL_WORDS)

const WORDS_BY_LENGTH = FULL_WORDS.reduce((map, word) => {
  if (!map[word.length]) map[word.length] = []
  map[word.length].push(word)
  return map
}, {})

const TRIE = buildTrie(FULL_WORDS)
const COMMON_WORD_SET = new Set(COMMON_WORDS)

export function buildTrie(words) {
  const root = { children: {}, end: false }
  for (const word of words) {
    let node = root
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = { children: {}, end: false }
      }
      node = node.children[char]
    }
    node.end = true
  }
  return root
}

export function getWordsByLength(length) {
  return WORDS_BY_LENGTH[length] || []
}

export function isWordAllowed(word) {
  return TRIE_WORD_SET.has(word)
}

const TRIE_WORD_SET = new Set(FULL_WORDS)

export function flattenRows(rows) {
  return rows.flat()
}

export function toRows(flat) {
  const rows = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    rows.push(flat.slice(row * BOARD_SIZE, row * BOARD_SIZE + BOARD_SIZE))
  }
  return rows
}

export function indexToCoord(index) {
  return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE }
}

export function areAdjacent(a, b) {
  const first = indexToCoord(a)
  const second = indexToCoord(b)
  const rowDiff = Math.abs(first.row - second.row)
  const colDiff = Math.abs(first.col - second.col)
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0)
}

export function getNeighbors(index) {
  const { row, col } = indexToCoord(index)
  const neighbors = []
  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) continue
      const nextRow = row + rowOffset
      const nextCol = col + colOffset
      if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) continue
      neighbors.push(nextRow * BOARD_SIZE + nextCol)
    }
  }
  return neighbors
}

export function validatePath(path) {
  if (!Array.isArray(path) || path.length < 3) return false
  const seen = new Set()
  for (let index = 0; index < path.length; index++) {
    const cell = path[index]
    if (!Number.isInteger(cell) || cell < 0 || cell >= BOARD_SIZE * BOARD_SIZE) return false
    if (seen.has(cell)) return false
    seen.add(cell)
    if (index > 0 && !areAdjacent(path[index - 1], cell)) return false
  }
  return true
}

export function wordFromPath(rows, path) {
  const flat = flattenRows(rows)
  return path.map((index) => flat[index]).join('')
}

function shuffle(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

function buildLetterWeights(words) {
  const counts = {}
  for (const word of words) {
    for (const letter of word) {
      counts[letter] = (counts[letter] || 0) + 1
    }
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  let cumulative = 0

  return Object.entries(counts).map(([letter, count]) => {
    cumulative += count / total
    return { letter, threshold: cumulative }
  })
}

function buildLetterFrequencyMap(words) {
  const counts = {}
  for (const word of words) {
    for (const letter of word) {
      counts[letter] = (counts[letter] || 0) + 1
    }
  }
  return counts
}

function randomWeightedLetter() {
  const roll = Math.random()
  return LETTER_WEIGHTS.find((entry) => roll <= entry.threshold)?.letter || 'e'
}

function fillPathWithRandomLetters(base, path) {
  const nextFlat = [...base]
  path.forEach((index) => {
    nextFlat[index] = randomWeightedLetter()
  })
  return nextFlat
}

function pathHasReplayWord(rows, path) {
  for (let start = 0; start <= path.length - 3; start++) {
    for (let end = start + 3; end <= path.length; end++) {
      const segment = path.slice(start, end)
      const formed = wordFromPath(rows, segment)
      if (isWordAllowed(formed)) {
        return true
      }
    }
  }

  return false
}

function measureIdenticalNeighbors(rows) {
  const flat = flattenRows(rows)
  let identicalNeighborCount = 0
  let denseClusterCount = 0

  for (let index = 0; index < flat.length; index++) {
    const letter = flat[index]
    const sameNeighbors = getNeighbors(index).filter((neighbor) => flat[neighbor] === letter)

    // Count each identical pair once.
    identicalNeighborCount += sameNeighbors.filter((neighbor) => neighbor > index).length

    // Flag local clumps like the repeated T cluster in the screenshot.
    if (sameNeighbors.length >= 2) {
      denseClusterCount += 1
    }
  }

  return { identicalNeighborCount, denseClusterCount }
}

function solveBoard(rows) {
  const flat = flattenRows(rows)
  const words = {}
  const startCells = new Set()

  function dfs(index, node, path, word) {
    const letter = flat[index]
    const nextNode = node.children[letter]
    if (!nextNode) return

    const nextPath = [...path, index]
    const nextWord = word + letter

    if (nextNode.end && nextWord.length >= 3 && !words[nextWord]) {
      words[nextWord] = nextPath
      startCells.add(nextPath[0])
    }

    if (nextWord.length >= 8) return

    for (const neighbor of getNeighbors(index)) {
      if (!nextPath.includes(neighbor)) {
        dfs(neighbor, nextNode, nextPath, nextWord)
      }
    }
  }

  for (let index = 0; index < flat.length; index++) {
    dfs(index, TRIE, [], '')
  }

  return { words, startCells }
}

export function evaluateBoard(rows) {
  const solved = solveBoard(rows)
  const foundWords = Object.keys(solved.words)
  const commonWords = foundWords.filter((word) => COMMON_WORD_SET.has(word))
  const countsByLength = commonWords.reduce((counts, word) => {
    counts[word.length] = (counts[word.length] || 0) + 1
    return counts
  }, {})
  const flat = flattenRows(rows)
  const vowelRatio = flat.filter((letter) => VOWELS.has(letter)).length / flat.length
  const longestWord = foundWords.reduce((max, word) => Math.max(max, word.length), 0)
  const longestWordText = foundWords
    .filter((word) => word.length === longestWord)
    .sort((left, right) => left.localeCompare(right))[0] || ''
  const { identicalNeighborCount, denseClusterCount } = measureIdenticalNeighbors(rows)
  const failureTags = []

  if (foundWords.length < 6) failureTags.push('low-word-count')
  if ((countsByLength[4] || 0) < 2) failureTags.push('low-common-fours')
  if ((countsByLength[5] || 0) < 1) failureTags.push('low-common-fives')
  if (longestWord < 4) failureTags.push('short-board')
  if (solved.startCells.size < 5) failureTags.push('low-coverage')
  if (vowelRatio < 0.2) failureTags.push('too-few-vowels')
  if (vowelRatio > 0.64) failureTags.push('too-many-vowels')
  if (identicalNeighborCount > 5) failureTags.push('too-many-identical-neighbors')
  if (denseClusterCount > 1) failureTags.push('dense-identical-clusters')

  const score =
    foundWords.length * 8 +
    commonWords.length * 4 +
    longestWord * 5 +
    solved.startCells.size * 6 -
    identicalNeighborCount * 4 -
    denseClusterCount * 10 -
    failureTags.length * 18 -
    Math.abs(0.4 - vowelRatio) * 40

  return {
    accepted: failureTags.length === 0,
    score,
    totalWords: foundWords.length,
    commonWords: commonWords.length,
    longestWord,
    longestWordText,
    startCellCoverage: solved.startCells.size,
    vowelRatio,
    identicalNeighborCount,
    countsByLength,
    failureTags,
    words: solved.words,
  }
}

function getGemEligibleIndices(rows) {
  const flat = flattenRows(rows)
  const uniqueLetters = [...new Set(flat)]
  const rareLetterCount = Math.min(uniqueLetters.length, Math.max(4, Math.ceil(uniqueLetters.length / 3)))
  const rareLetters = new Set(
    uniqueLetters
      .sort((left, right) => {
        const leftCount = LETTER_FREQUENCIES[left] || Number.MAX_SAFE_INTEGER
        const rightCount = LETTER_FREQUENCIES[right] || Number.MAX_SAFE_INTEGER
        return leftCount - rightCount || left.localeCompare(right)
      })
      .slice(0, rareLetterCount),
  )

  return flat.reduce((indices, letter, index) => {
    if (rareLetters.has(letter)) {
      indices.push(index)
    }
    return indices
  }, [])
}

function chooseGemIndices(candidates, lockedIndices = [], desiredCount = BOARD_GEM_COUNT) {
  const chosen = [...lockedIndices]
  const chosenSet = new Set(chosen)
  const remaining = shuffle(candidates.filter((index) => !chosenSet.has(index)))

  for (const index of remaining) {
    if (chosen.length >= desiredCount) break
    if (chosen.every((selected) => !areAdjacent(selected, index))) {
      chosen.push(index)
      chosenSet.add(index)
    }
  }

  for (const index of remaining) {
    if (chosen.length >= desiredCount) break
    if (!chosenSet.has(index)) {
      chosen.push(index)
      chosenSet.add(index)
    }
  }

  return chosen
}

export function buildGemTiles(rows, previousGemTiles = {}, changedIndices = [], desiredCount = BOARD_GEM_COUNT) {
  const candidates = getGemEligibleIndices(rows)
  const candidateSet = new Set(candidates)
  const changedSet = new Set(changedIndices || [])
  const lockedIndices = Object.entries(previousGemTiles || {})
    .map(([index, value]) => ({ index: Number(index), value }))
    .filter(({ index, value }) => Number.isInteger(index) && value > 0 && !changedSet.has(index) && candidateSet.has(index))
    .map(({ index }) => index)

  const chosen = chooseGemIndices(candidates, lockedIndices, desiredCount)
  return chosen.reduce((tiles, index) => {
    tiles[index] = GEM_TILE_VALUE
    return tiles
  }, {})
}

export function findHintWord(rows, usedWords = {}, length = 4) {
  const boardWords = evaluateBoard(rows).words
  const usedWordSet =
    usedWords instanceof Set
      ? usedWords
      : new Set(
          Array.isArray(usedWords)
            ? usedWords
            : Object.keys(usedWords || {}),
        )

  const candidates = Object.keys(boardWords).filter(
    (word) => word.length === length && !usedWordSet.has(word),
  )

  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function findPath(length, available) {
  const availableList = shuffle(Array.from(available))

  function walk(index, path, seen) {
    if (path.length === length) return path
    const neighbors = shuffle(getNeighbors(index).filter((neighbor) => available.has(neighbor) && !seen.has(neighbor)))
    for (const neighbor of neighbors) {
      seen.add(neighbor)
      const result = walk(neighbor, [...path, neighbor], seen)
      if (result) return result
      seen.delete(neighbor)
    }
    return null
  }

  for (const start of availableList) {
    const seen = new Set([start])
    const result = walk(start, [start], seen)
    if (result) return result
  }

  return null
}

export function createAcceptedBoard() {
  let best = null

  for (let attempt = 0; attempt < 250; attempt++) {
    const flat = new Array(BOARD_SIZE * BOARD_SIZE).fill(null)
    const available = new Set(flat.map((_, index) => index))
    const chosenWords = []
    const paths = []
    let failed = false

    for (const length of shuffle([5, 4, 4, 4, 4, 4])) {
      const path = findPath(length, available)
      if (!path) {
        failed = true
        break
      }

      const choices = shuffle(getWordsByLength(length))
      const word = choices.find((candidate) => !chosenWords.includes(candidate)) || choices[0]
      if (!word) {
        failed = true
        break
      }

      chosenWords.push(word)
      paths.push(path)

      path.forEach((index, letterIndex) => {
        flat[index] = word[letterIndex]
        available.delete(index)
      })
    }

    if (failed || flat.some((cell) => !cell)) continue

    const rows = toRows(flat)
    const metrics = evaluateBoard(rows)
    if (metrics.accepted) {
      return { rows, metrics, gemTiles: buildGemTiles(rows) }
    }
    if (!best || metrics.score > best.metrics.score) {
      best = { rows, metrics, gemTiles: buildGemTiles(rows) }
    }
  }

  if (best) return best

  const fallback = toRows([
    's', 'p', 'e', 'l', 'l',
    'c', 'a', 's', 't', 'r',
    'u', 'n', 'e', 'm', 'a',
    'g', 'i', 'c', 's', 'e',
    'g', 'l', 'o', 'w', 'n',
  ])
  return { rows: fallback, metrics: evaluateBoard(fallback), gemTiles: buildGemTiles(fallback) }
}

export function refillBoard(rows, path, usedWords = {}) {
  const base = flattenRows(rows)
  let best = null

  for (let attempt = 0; attempt < 700; attempt++) {
    const nextFlat = fillPathWithRandomLetters(base, path)
    const nextRows = toRows(nextFlat)
    if (pathHasReplayWord(nextRows, path)) continue

    const metrics = evaluateBoard(nextRows)
    const replayPenalty = Object.keys(usedWords).some((word) => wordFromPath(nextRows, path) === word) ? 10 : 0
    const candidateScore = metrics.score - replayPenalty

    if (!best || candidateScore > best.candidateScore) {
      best = { rows: nextRows, metrics, refillWord: wordFromPath(nextRows, path), candidateScore }
    }

    if (metrics.accepted) {
      return { rows: nextRows, metrics, refillWord: wordFromPath(nextRows, path) }
    }
  }

  if (best?.metrics.accepted) {
    return { rows: best.rows, metrics: best.metrics, refillWord: best.refillWord }
  }

  return null
}

export function scoreWord(word) {
  if (word.length <= 3) return 10
  if (word.length === 4) return 30
  if (word.length === 5) return 60

  const extraLetters = word.length - 5
  return 60 + extraLetters * 20 + extraLetters * (extraLetters + 1) * 5
}

export function shuffleBoard(rows) {
  const original = flattenRows(rows)
  let best = null

  for (let attempt = 0; attempt < 250; attempt++) {
    const shuffled = shuffle(original)
    if (shuffled.every((letter, index) => letter === original[index])) continue

    const nextRows = toRows(shuffled)
    const metrics = evaluateBoard(nextRows)

    if (!best || metrics.score > best.metrics.score) {
      best = { rows: nextRows, metrics }
    }

    if (metrics.accepted) {
      return { rows: nextRows, metrics }
    }
  }

  return best?.metrics.accepted ? best : null
}

export function swapBoardLetter(rows, index, nextLetter) {
  if (!/^[a-z]$/.test(nextLetter)) return null
  const flat = flattenRows(rows)
  if (flat[index] === nextLetter) return null

  const updated = [...flat]
  updated[index] = nextLetter
  const nextRows = toRows(updated)
  const metrics = evaluateBoard(nextRows)

  return { rows: nextRows, metrics }
}
