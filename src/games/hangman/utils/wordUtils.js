import wordsData from '../data/words.json'

const ALL_CATEGORIES = ['movies', 'animals', 'countries', 'anime', 'catchphrases', 'pokemon'] // 'bangalore' — pending words

export function pickWord(category = null, allowedCategories = null) {
  const pool = allowedCategories?.length ? allowedCategories : ALL_CATEGORIES
  const cat = category ?? pool[Math.floor(Math.random() * pool.length)]
  const list = wordsData[cat]
  const word = list[Math.floor(Math.random() * list.length)]
  return { word, category: cat }
}

export function pickWordForRound(roundIndex, allowedCategories = null) {
  const pool = allowedCategories?.length ? allowedCategories : ALL_CATEGORIES
  const cat = pool[roundIndex % pool.length]
  return pickWord(cat, allowedCategories)
}

// Returns array of {char, revealed, isSpace} for each character in the word
export function maskWord(word, guessedLetters = {}) {
  return word.split('').map((char) => ({
    char,
    isSpace: char === ' ',
    revealed: char === ' ' || guessedLetters[char] === true,
  }))
}

export function isWordSolved(word, guessedLetters = {}) {
  // Spaces are always "solved" — only check letter characters
  return word.split('').every((char) => char === ' ' || guessedLetters[char] === true)
}

export function normalizeGuess(input) {
  return input.trim().toUpperCase()
}

export function getCategories() {
  return ALL_CATEGORIES
}
