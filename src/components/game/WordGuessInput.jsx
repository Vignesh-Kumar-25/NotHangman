import { useState } from 'react'
import styles from './WordGuessInput.module.css'

export default function WordGuessInput({ onGuess, disabled = false }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onGuess(trimmed)
    setValue('')
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="Guess the full word…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        maxLength={30}
      />
      <button type="submit" className={styles.btn} disabled={disabled || !value.trim()}>
        Guess
      </button>
    </form>
  )
}
