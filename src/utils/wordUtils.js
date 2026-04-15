import wordsData from '../data/words.json'

const CATEGORIES = ['movies', 'animals', 'countries']

export function pickWord(category = null) {
  const cat = category ?? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
  const list = wordsData[cat]
  const word = list[Math.floor(Math.random() * list.length)]
  return { word, category: cat }
}

export function pickWordForRound(roundIndex) {
  const cat = CATEGORIES[roundIndex % CATEGORIES.length]
  return pickWord(cat)
}

// Returns array of {char, revealed} for each character in the word
export function maskWord(word, guessedLetters = {}) {
  return word.split('').map((char) => ({
    char,
    revealed: guessedLetters[char] === true,
  }))
}

export function isWordSolved(word, guessedLetters = {}) {
  return word.split('').every((char) => guessedLetters[char] === true)
}

export function normalizeGuess(input) {
  return input.trim().toUpperCase()
}

export function getCategories() {
  return CATEGORIES
}
