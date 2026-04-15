# Hangman

Multiplayer word-guessing game. Correct guesses keep your turn, wrong guesses pass it.

## Files

All hangman-specific code lives in `src/games/hangman/`.

```
src/games/hangman/
├── db.js                        # All DB operations (room CRUD, game logic)
├── hooks/
│   ├── useGameState.js          # Derives game state (isHost, isMyTurn, maskedWord, etc.)
│   ├── useHostArbiter.js        # Host-only: state transitions, timer, host reassignment
│   └── useTimer.js              # Turn countdown using serverTimeOffset
├── components/
│   ├── screens/                 # RoomRoute, LobbyScreen, GameScreen, GameOverScreen
│   ├── game/                    # HangmanCanvas, LetterGrid, WordDisplay, WordGuessInput,
│   │                            # ScorePanel, TurnIndicator, TurnTimer, CategoryBadge,
│   │                            # RoundBadge, RoundResultOverlay
│   └── lobby/                   # CreateRoomForm, JoinRoomForm, PlayerSlot, RoomCodeDisplay
├── constants/
│   ├── gameConfig.js            # TURN_DURATION, MAX_PLAYERS, scoring values, delays
│   └── gameStates.js            # LOBBY, ROUND_START, PLAYING, ROUND_END, GAME_OVER
├── data/
│   └── words.json               # Word lists by category
└── utils/
    ├── wordUtils.js             # pickWord, pickWordForRound, maskWord, isWordSolved, normalizeGuess
    └── turnUtils.js             # getNextPlayerUid (circular rotation)
```

## Game State Machine

`LOBBY → ROUND_START → PLAYING → ROUND_END → (next round or GAME_OVER)`

## DB Functions (`db.js`)

| Function | Purpose |
|---|---|
| `createRoom(uid, username, avatarId)` | Creates room, returns 6-char code |
| `joinRoom(roomCode, uid, username, avatarId)` | Adds player to existing room |
| `leaveRoom(roomCode, uid)` | Marks player disconnected, transfers host/turn if needed |
| `startGame(roomCode, playerOrder, numRounds)` | LOBBY → ROUND_START |
| `beginPlaying(roomCode)` | ROUND_START → PLAYING |
| `guessLetter(roomCode, uid, letter, game, playerOrder, players)` | Processes letter guess |
| `guessWord(roomCode, uid, word, game, playerOrder, players)` | Processes full word guess |
| `passTurn(roomCode, game, playerOrder)` | Advances turn (timer expiry) |
| `advanceRound(roomCode, game, playerOrder, players)` | Next round or GAME_OVER |
| `resetGame(roomCode, playerOrder, players, numRounds)` | Play again |
| `setRoomNumRounds(roomCode, numRounds)` | Update round count |
| `promoteHost(roomCode, newHostUid)` | Transfer host |

## Rules

- **Turn continuation**: correct letter keeps turn; wrong passes to next player
- **Scoring**: +10 correct letter, +50 correct word, +100 solve bonus
- **Rounds**: configurable (default 2, max 5); total turns = numRounds * playerCount
- **30-second turn timer** with server-time-offset correction
- **6 wrong guesses max** (full hangman drawing)
- **Word categories**: movies, animals, countries (cycled per round via `CATEGORIES[N % 3]`)
- **Case insensitive**: all input normalized to uppercase
- **Spaces in words**: always revealed; skipped as Firebase keys
- **Host arbiter**: only host triggers state transitions; earliest-joined connected player self-promotes if host disconnects

## Common Resources Used

Imports from shared `src/` modules:
- `@/firebase/config` — Firebase `db` instance
- `@/hooks/useRoom`, `@/hooks/useServerTimeOffset` — room subscription, clock correction
- `@/components/shared/Avatar`, `AvatarPicker`, `LoadingSpinner` — UI components
- `@/components/chat/ChatPanel` — in-game chat
- `@/constants/avatars` — avatar definitions
- `@/utils/roomCode` — room code generation
- `@/utils/soundManager` — sound effects
