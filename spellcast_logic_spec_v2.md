# Game Logic Spec v2

This document describes how to build the current Spellcast game logic using this stack:

- Frontend: React 18, React Router v6, CSS Modules, Vite 5
- Backend: Firebase Realtime Database
- Auth: Firebase Anonymous Auth
- Deploy: Netlify SPA

This excludes visual design, animation, and branding. It focuses on:

- game state
- board lifecycle
- word submission
- board mutation helpers
- multiplayer-safe persistence
- Firebase data flow

## Product Goal

Build a multiplayer word game where:

1. players share one accepted 5x5 board
2. a player traces adjacent letters to form words
3. diagonal adjacency is allowed
4. cells cannot be reused within one word
5. when a valid word is submitted, only those consumed cells are replaced
6. the updated board must still satisfy the accepted-board rules
7. players can also use controlled utility actions like shuffle, swap, and hint
8. the game continues on the evolved shared board state until the host ends the match

## Core Rules

### Board

- Grid size: `5x5`
- Total cells: `25`
- Board letters are lowercase internally
- UI may render uppercase
- Board is shared across all players in the room

### Word path rules

- Path must contain at least `3` cells to submit
- Final word length must be at least `3`
- No cell reuse in the same path
- Each next cell must be adjacent to the previous one
- Adjacency includes:
  - horizontal
  - vertical
  - diagonal
- Backtracking over the immediately previous tile removes one step in the client selection model

### Word validity rules

A submitted word is valid only if:

1. the path itself is valid
2. the path forms a word on the current board
3. the word exists in the allowed gameplay dictionary
4. the word has not already been cast globally in the current match

### Board evolution rule

After a valid word:

1. only the consumed cells may change
2. replacement letters are generated with weighted random refill
3. the resulting board must still satisfy the accepted-board criteria
4. the refill must not leave an immediately replayable valid word segment on the consumed path
5. if no accepted refill is found within search budget:
   - return a controlled failure result
   - do not mutate the board

## Architecture Decision

Because there is no custom server, all game logic lives in the frontend codebase.

That means:

- board generation logic ships with the client
- solver logic ships with the client
- refill logic ships with the client
- dictionary lookup ships with the client
- Firebase is used for:
  - player identity
  - session persistence
  - room/game state sync
  - move history
  - shared board coordination

Important consequence:

- dictionary and solver data must be bundled or loaded as static assets

## Recommended Mode

Use a room-authoritative shared-state model coordinated through Firebase transactions.

Current behavior:

- one client starts the game and writes the initial accepted board
- word submissions are processed through a room-level transaction
- shuffle and swap actions are also processed through room-level transactions
- stale moves are rejected using board-version compare-and-swap

Do not rely on optimistic local recomputation without coordination. You will get race conditions.

## Requirements

## 1. App Initialization

On app startup:

1. initialize Firebase
2. sign in with Firebase Anonymous Auth
3. load static game assets:
   - dictionary
   - common dictionary subset
4. prepare runtime helpers:
   - trie builder
   - board solver
   - scoring functions
   - board generation/refill helpers

## 2. Routing

Current routes:

- `/`
  - app home
- `/spellcast`
  - Spellcast entry screen / create / join
- `/spellcast/room/:roomCode`
  - live room route resolving to lobby, game, or finished screen

## 3. Auth

Requirements:

- sign in anonymously on first load
- persist `uid`
- use `uid` for room membership and move attribution

Minimal player shape:

```ts
type Player = {
  uid: string
  username: string
  avatarId: string
  joinedAt: number
  connected: boolean
  score: number
  wordsFound: Record<string, number> | null
}
```

## 4. Game Session State

Each game session needs:

- current board
- board version
- found words
- player scores
- move history
- timestamps
- host identity

Current Realtime Database shape:

```json
rooms: {
  "{roomCode}": {
    "meta": {
      "hostUid": "uid123",
      "createdAt": 1710000000000,
      "status": "playing",
      "roomCode": "ABC123",
      "gameType": "spellcast"
    },
    "players": {
      "uid123": {
        "uid": "uid123",
        "username": "Mage",
        "avatarId": "fox",
        "joinedAt": 1710000000000,
        "connected": true,
        "score": 6,
        "wordsFound": {
          "steam": 1710000005000
        }
      }
    },
    "playerOrder": ["uid123"],
    "game": {
      "state": "playing",
      "startedAt": 1710000001000,
      "boardState": {
        "version": 4,
        "rows": [
          ["a","b","c","d","e"],
          ["f","g","h","i","j"],
          ["k","l","m","n","o"],
          ["p","q","r","s","t"],
          ["u","v","w","x","y"]
        ],
        "metrics": {
          "accepted": true,
          "score": 214.8,
          "totalWords": 31,
          "commonWords": 17,
          "longestWord": 6,
          "vowelRatio": 0.36,
          "startCellCoverage": 11,
          "identicalNeighborCount": 2,
          "failureTags": [],
          "countsByLength": {
            "4": 5,
            "5": 2
          }
        },
        "updatedAt": 1710000005000
      },
      "foundWords": {
        "steam": {
          "uid": "uid123",
          "score": 6,
          "length": 5,
          "createdAt": 1710000005000
        }
      },
      "moves": {
        "{moveId}": {
          "uid": "uid123",
          "word": "steam",
          "path": [0, 1, 7, 13, 19],
          "score": 6,
          "boardVersionBefore": 3,
          "boardVersionAfter": 4,
          "createdAt": 1710000005000
        }
      },
      "lastMove": {
        "uid": "uid123",
        "word": "steam",
        "score": 6,
        "path": [0, 1, 7, 13, 19],
        "refillWord": "qxzrt",
        "createdAt": 1710000005000
      }
    }
  }
}
```

## 5. Board Source of Truth

The active board must be stored as:

- `rows: string[][]`

Additional authoritative fields:

- `version`
- `metrics`
- `updatedAt`

Derived values like:

- current selection
- hinted word
- leaderboard
- recent word feed

should be recomputed client-side from room data.

## 6. Dictionaries

The current implementation uses two dictionaries:

- full gameplay dictionary
- common-word dictionary subset for board quality evaluation

Current asset approach:

1. preprocess dictionary data offline
2. store bundled static JSON
3. build trie structures client-side at runtime

Current assets:

- `src/games/spellcast/data/words.json`
- `src/games/spellcast/data/customWords.json`
- `src/games/spellcast/data/generate_dictionary.py`

## 7. Solver

The solver must support:

- trie lookup
- DFS
- 8-direction adjacency
- no cell reuse in one path
- minimum word length `3`
- maximum explored word length `8`

Outputs required:

- all solvable words
- counts by length
- start-cell coverage
- one path per discovered word

## 8. Board Quality Rules

The board-quality system currently evaluates:

- total words
- common words
- common counts by length
- longest word
- vowel ratio
- start-cell coverage
- identical-neighbor count
- dense identical clusters
- score
- failure tags
- accepted boolean

Current acceptance rules:

- at least `6` total words
- at least `2` common 4-letter words
- at least `1` common 5-letter word
- longest word at least `4`
- start-cell coverage at least `5`
- vowel ratio between `0.2` and `0.64`
- identical-neighbor count at most `5`
- dense identical clusters at most `1`
- no failure tags

## 9. Initial Board Generation

The current board generator uses a word-seeding strategy rather than pure weighted random generation.

Required flow:

1. allocate an empty 5x5 board
2. find six disjoint paths with lengths `[5, 4, 4, 4, 4, 4]`
3. choose dictionary words matching those lengths
4. write those words onto the chosen paths
5. evaluate the finished board
6. if accepted, use it
7. otherwise keep the best-scoring failed candidate
8. repeat until generation budget is exhausted
9. if no accepted board is found, use the best candidate
10. if no candidate exists, use a hardcoded fallback board

## 10. Word Submission Algorithm

When a player submits a word:

1. read current room state in a Firebase transaction
2. validate game type and active state
3. validate player is active
4. validate board version matches the client payload
5. validate path
6. build the word from the current board
7. validate word against dictionary
8. reject if already found globally
9. run refill algorithm
10. if refill succeeds:
    - increment board version
    - update board rows and metrics
    - update player score
    - record word under player and global found words
    - append move log
    - update `lastMove`
11. if refill fails:
    - reject move
    - keep board unchanged

## 11. Refill Algorithm

This is the main board-evolution mechanic.

Given:

- current board
- consumed path
- globally used words

Constraint:

- only consumed cells may change

Goal:

- find replacement letters that make the resulting board still accepted

Current refill search:

### Stage 1. Random restarts only

1. replace only consumed cells with weighted random letters
2. reject immediately if any contiguous segment of the consumed path still forms a valid replay word
3. evaluate the full board
4. track the best candidate by board score, with a replay penalty
5. if an accepted board is found, stop
6. otherwise keep searching until the attempt budget is exhausted

### Failure behavior

If no accepted refill is found:

- reject the move
- do not mutate the board

The current implementation does not use evolutionary search or hill-climbing.

## 12. Multiplayer Safety

Because Firebase Realtime Database has no server authority, write coordination is required.

Current approach:

### Board-version compare-and-swap

Every mutating action includes:

- `expectedVersion`

Before committing an action:

1. read latest board version inside the transaction
2. if it differs from the client payload:
   - reject the action
   - require the client to retry on the latest board

There is no separate explicit lock object in the current implementation.

## 13. Scoring Model

Player scoring is independent from board-quality scoring.

Current scoring:

```ts
function scoreWord(word: string) {
  if (word.length <= 3) return 1
  if (word.length === 4) return 3
  return 6
}
```

## 14. React State Requirements

Recommended client state split:

### Global app state

- auth user
- Firebase readiness
- room subscription state
- dictionary readiness

### Per-game state

- game record from Firebase
- current board rows
- board version
- selected path
- current formed word
- submit status
- status/error banners
- swap overlay open state
- mute state
- invalid path flash state
- hint board version

### Derived selectors

- current leaderboard
- winner
- found words feed
- selected score
- last move message
- hint availability

## 15. Required File Structure

Current project structure:

```text
src/games/spellcast/
  db.js
  constants/
    gameConfig.js
  data/
    words.json
    customWords.json
    generate_dictionary.py
  hooks/
    useGameState.js
    useBoardSelection.js
  utils/
    boardUtils.js
    spellcastSounds.js
  components/
    screens/
      SpellcastEntry.jsx
      SpellcastRoomRoute.jsx
      LobbyScreen.jsx
      GameScreen.jsx
      GameOverScreen.jsx
    game/
      Board.jsx
      ScorePanel.jsx
      WordFeed.jsx
    lobby/
      CreateRoomForm.jsx
      JoinRoomForm.jsx
```

## 16. Recommended Type Definitions

```ts
type CellIndex = number

type BoardRows = string[][]

type BoardMetrics = {
  accepted: boolean
  score: number
  totalWords: number
  commonWords: number
  longestWord: number
  vowelRatio: number
  startCellCoverage: number
  identicalNeighborCount: number
  failureTags: string[]
  countsByLength: Record<number, number>
}

type BoardState = {
  version: number
  rows: BoardRows
  metrics: BoardMetrics
  updatedAt: number
}

type Move = {
  uid: string
  word: string
  path: CellIndex[]
  score: number
  boardVersionBefore: number
  boardVersionAfter: number
  createdAt: number
}

type FoundWord = {
  uid: string
  score: number
  length: number
  createdAt: number
}

type GameRecord = {
  state: "lobby" | "playing" | "finished"
  boardState?: BoardState
  foundWords?: Record<string, FoundWord>
  moves?: Record<string, Move>
  lastMove?: {
    uid: string
    action?: "shuffle" | "swap"
    word?: string
    score?: number
    path?: CellIndex[]
    refillWord?: string
    tileIndex?: number
    nextLetter?: string
    createdAt: number
  }
}
```

## 17. Firebase Realtime Database Responsibilities

Firebase stores:

- active room state
- active board
- board version
- players
- move log
- scores
- found words
- host ownership
- connection status

Firebase does not generate:

- boards
- solver results
- hint logic
- dictionary search logic
- refill search logic

Those stay client-side.

## 18. Netlify Requirements

You need SPA routing enabled.

Either:

- `netlify.toml`

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Or equivalent Netlify UI rule.

## 19. Non-Negotiable Logic Rules

If you want behavior aligned with the current game:

1. diagonal adjacency must be allowed
2. no cell reuse in one word
3. initial board must be accepted before players see it, unless fallback generation is required
4. after a valid word, only consumed cells may change
5. refilled board must also be accepted
6. if accepted refill cannot be found, the move must fail rather than degrade board quality
7. global duplicate words must be rejected
8. shuffle and swap must also preserve accepted-board quality
9. stale board versions must reject mutating actions

## 20. Build Order

Recommended implementation order:

1. Firebase bootstrapping and anonymous auth
2. dictionary asset generation/loading
3. trie + solver
4. metrics + acceptance logic
5. initial accepted-board generator
6. board selection/path validation hook
7. move submission logic
8. refill algorithm
9. shuffle / swap utility actions
10. Firebase room sync and version conflict handling

## 21. Practical Warning

This stack can implement the game, but one constraint remains:

- without a custom server, authoritative anti-cheat is weak

If players are trusted, this is acceptable.
If competitive integrity matters, move validation and board mutation logic to a server or Cloud Functions.

For a normal casual room-based game, this stack is sufficient.
