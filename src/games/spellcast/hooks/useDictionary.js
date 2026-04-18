import { useState, useEffect, useRef } from 'react'
import { loadDictionary } from '../utils/dictionaryUtils'

export function useDictionary() {
  const [loading, setLoading] = useState(true)
  const dictRef = useRef(null)
  const trieRef = useRef(null)

  useEffect(() => {
    const { dictionary, trie } = loadDictionary()
    dictRef.current = dictionary
    trieRef.current = trie
    setLoading(false)
  }, [])

  return { dictionary: dictRef.current, trie: trieRef.current, loading }
}
