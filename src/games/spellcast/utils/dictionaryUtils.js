import wordListRaw from '../data/words.txt?raw'

let cachedDict = null
let cachedTrie = null

function buildTrie(words) {
  const root = {}
  for (const word of words) {
    let node = root
    for (const ch of word) {
      if (!node[ch]) node[ch] = {}
      node = node[ch]
    }
    node.$ = true
  }
  return root
}

export function hasPrefix(trie, prefix) {
  let node = trie
  for (const ch of prefix) {
    if (!node[ch]) return false
    node = node[ch]
  }
  return true
}

export function loadDictionary() {
  if (cachedDict) return { dictionary: cachedDict, trie: cachedTrie }

  const words = wordListRaw
    .split(/\r?\n/)
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= 2)

  cachedDict = new Set(words)
  cachedTrie = buildTrie(words)

  return { dictionary: cachedDict, trie: cachedTrie }
}

export function isValidWord(word, dictionary) {
  return word.length >= 2 && dictionary.has(word.toUpperCase())
}
