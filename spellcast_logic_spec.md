# Game Logic Spec

This document describes how to build the game logic only for the current Spellcast-style game using this stack:

- Frontend: React 18, React Router v6, CSS Modules, Vite 5
- Backend: Firebase Realtime Database
- Auth: Firebase Anonymous Auth
- Deploy: Netlify SPA

This excludes visual design, animation, and branding. It focuses on:

- game state
- board lifecycle
- word submission
- letter replacement
- multiplayer-safe persistence
- Firebase data flow

## Product Goal

Build a word game where:

1. a player receives a fresh accepted 5x5 board
2. the player traces adjacent letters to form words
3. diagonal adjacency is allowed
4. cells cannot be reused within one word
5. when a valid word is submitted, those consumed cells are replaced
6. the updated board must still satisfy the same core quality rules
7. the game continues on the evolved board state

## Core Rules

### Board

- Grid size: `5x5`
- Total cells: `25`
- Board letters are lowercase internally
- UI may render uppercase

### Word path rules

- Path must contain at least 1 cell before validation
- Final word length must be at least `3`
- No cell reuse in the same path
- Each next cell must be adjacent to the previous one
- Adjacency includes:
  - horizontal
  - vertical
  - diagonal

### Word validity rules

A submitted word is valid only if:

1. the path itself is valid
2. the path forms a word on the current board
3. the word exists in the allowed gameplay dictionary for that board state

### Board evolution rule

After a valid word:

1. only the consumed cells may change
2. replacement letters are searched for using the refill algorithm
3. the resulting board must still satisfy the accepted-board criteria
4. if no accepted refill is found within search budget:
   - return a controlled failure result
   - do not mutate the board

## Architecture Decision

Because there is no custom server, all game logic must live in the frontend codebase.

That means:

- board generation logic ships with the client
- solver logic ships with the client
- refill logic ships with the client
- Firebase is used for:
  - player identity
  - session persistence
  - room/game state sync
  - move history

Important consequence:

- dictionary and solver data must either be bundled, precompiled, or fetched as static assets

## Recommended Mode

Use a single-player or room-owner-authoritative model.

Recommended behavior:

- one client is responsible for generating the initial board
- word submissions are processed through a transaction/lock in Firebase
- the accepted updated board is then written back to Realtime Database

Do not rely on all clients recomputing moves optimistically without coordination. You will get race conditions.

## Requirements

## 1. App Initialization

On app startup:

1. initialize Firebase
2. sign in with Firebase Anonymous Auth
3. load static game assets:
   - dictionary
   - common dictionary
   - any precomputed trie payloads if used
4. prepare runtime helpers:
   - trie builder or trie loader
   - board solver
   - scoring/refill functions

## 2. Routing

Recommended routes:

- `/`
  - home / create game / join game
- `/game/:gameId`
  - live game screen
- optional `/results/:gameId`
  - finished game review

## 3. Auth

Requirements:

- sign in anonymously on first load
- persist `uid`
- store player record in database if needed

Minimal player shape:

```ts
type Player = {
  uid: string
  createdAt: number
  displayName?: string | null
}
```

## 4. Game Session State

Each game session needs:

- current board
- board version
- found words
- player scores or progress
- move lock / transaction safety
- timestamps

Recommended Realtime Database shape:

```json
games: {
  "{gameId}": {
    "status": "active",
    "createdAt": 1710000000000,
    "createdBy": "uid123",
    "boardState": {
      "version": 12,
      "rows": [
        ["a","b","c","d","e"],
        ["f","g","h","i","j"],
        ["k","l","m","n","o"],
        ["p","q","r","s","t"],
        ["u","v","w","x","y"]
      ],
      "accepted": true,
      "score": 580.2,
      "totalWords": 188,
      "commonWords": 104,
      "longestWord": 8,
      "startCellCoverage": 22,
      "vowelRatio": 0.32,
      "updatedAt": 1710000005000
    },
    "players": {
      "uid123": {
        "joinedAt": 1710000000000,
        "score": 0,
        "wordsFound": {
          "steam": true
        }
      }
    },
    "moves": {
      "{moveId}": {
        "uid": "uid123",
        "word": "steam",
        "path": [0, 1, 7, 13, 19],
        "boardVersionBefore": 12,
        "boardVersionAfter": 13,
        "createdAt": 1710000005000
      }
    },
    "lock": {
      "uid": "uid123",
      "expiresAt": 1710000005500
    }
  }
}
```

## 5. Board Source of Truth

The active board must be stored as:

- `rows: string[][]`

Derived values like:

- flat board
- word set
- score
- coverage

should be recomputed client-side as needed unless you also persist summary fields for convenience.

## 6. Dictionaries

You need two dictionaries:

- full gameplay dictionary
- common-word dictionary

Recommended build approach:

1. preprocess dictionaries offline into static JSON assets
2. load them from `/public`
3. build tries on startup or ship prebuilt trie JSON

Frontend-safe asset options:

- `public/data/full-dictionary.json`
- `public/data/common-dictionary.json`
- optional `public/data/full-trie.json`
- optional `public/data/common-trie.json`

## 7. Solver

The solver must support:

- trie lookup
- DFS
- 8-direction adjacency
- no cell reuse in one word
- minimum word length
- maximum word length

Outputs required:

- all solvable words
- counts by length
- start-cell coverage
- start-cell counts
- optional paths

## 8. Board Quality Rules

The board-quality system should match the existing accepted-board logic.

Required metrics:

- total words
- common words
- common counts by length
- longest word
- vowel ratio
- short-word share
- start-cell coverage
- rare-letter total
- repeat overflow
- identical-neighbor count
- score
- failure tags
- accepted boolean

Required acceptance rules:

- total words within target band
- enough common 4-letter words
- enough common 5-letter words
- enough common 6-letter words
- longest word threshold
- start-cell coverage threshold
- vowel ratio inside target band
- no failure tags

## 9. Initial Board Generation

The board generator should use:

- weighted 25-bucket generation
- shuffle
- hard sanity filters
- solve and score
- rerolls
- local repair

Required flow:

1. generate letters from weighted buckets
2. shuffle into a board
3. run hard sanity
4. solve full/common dictionaries
5. score board
6. if accepted, use it
7. else locally repair weak cells
8. repeat until accepted or generation budget is exhausted

## 10. Word Submission Algorithm

When a player submits a word:

1. read current board state
2. validate board version has not changed
3. validate path
4. build word from path
5. validate word against current board and dictionary
6. reject if duplicate for that player or globally, depending on game rule
7. run refill algorithm
8. if refill succeeds:
   - increment board version
   - update board rows
   - update player score
   - append move log
9. if refill fails:
   - reject move
   - keep board unchanged

## 11. Refill Algorithm

This is the important game mechanic.

Given:

- current board
- consumed path

Constraint:

- only consumed cells may change

Goal:

- find replacement letters that make the resulting board still accepted

Recommended refill search stages:

### Stage 1. Random restarts

1. replace only consumed cells with random weighted letters
2. evaluate full board
3. if accepted, stop
4. track best failed candidate

### Stage 2. Evolutionary search

Represent the consumed-cell replacement as a small genome:

- one replacement letter per consumed index

Then:

1. initialize population
2. score each genome by board fitness
3. keep elites
4. create crossover children
5. mutate children
6. repeat for fixed generations
7. stop early if accepted board found

### Stage 3. Local hill climb

Start from the best failed genome:

1. mutate 1..N consumed cells
2. keep only improving mutations
3. use a heuristic to prefer:
   - better vowel balance
   - lower repeat pressure
   - fewer failure tags
   - closer total-word target
4. stop early if accepted board found

### Failure behavior

If no accepted refill is found:

- reject the move
- do not mutate the board

If you want strict mechanic fidelity, do not regenerate the whole board.

## 12. Multiplayer Safety

Because Firebase Realtime Database has no server authority, you need write coordination.

Recommended approach:

### Board-version compare-and-swap

Every move payload includes:

- `boardVersionBefore`

Before committing a move:

1. read latest board version
2. if it differs from the client’s expected version:
   - reject locally
   - reload board

### Temporary move lock

Recommended:

1. client writes lock with own `uid` and short expiry
2. if lock already exists and is live, block submit
3. once move commits, clear lock

Do this with a transaction.

## 13. Scoring Model

Player scoring is game-specific and separate from board quality.

Recommended player score choices:

- score by word length
- optional bonus for common words
- optional bonus for unique words

Example:

```ts
function scoreWord(word: string) {
  return word.length
}
```

Keep player scoring independent from board-acceptance scoring.

## 14. React State Requirements

Recommended client state split:

### Global app state

- auth user
- Firebase readiness
- dictionary readiness

### Per-game state

- game record from Firebase
- current board rows
- board version
- selected path
- current formed word
- submit status
- move lock state

### Derived selectors

- flattened board
- selected letters
- can-submit boolean
- current player score
- word already found boolean

## 15. Required File Structure

Recommended Vite + React structure:

```text
src/
  app/
    router.tsx
    providers/
      FirebaseProvider.tsx
      AuthProvider.tsx

  pages/
    HomePage/
      HomePage.tsx
      HomePage.module.css
    GamePage/
      GamePage.tsx
      GamePage.module.css

  components/
    Board/
      Board.tsx
      Board.module.css
    Tile/
      Tile.tsx
      Tile.module.css
    WordPanel/
      WordPanel.tsx
      WordPanel.module.css
    ScorePanel/
      ScorePanel.tsx
      ScorePanel.module.css

  firebase/
    app.ts
    auth.ts
    db.ts
    gameApi.ts

  game/
    config.ts
    types.ts
    dictionary/
      loadDictionary.ts
      trie.ts
    solver/
      adjacency.ts
      solveBoard.ts
    metrics/
      scoreBoard.ts
      failureTags.ts
      acceptance.ts
    generator/
      weightedBuckets.ts
      generateBoard.ts
      repairBoard.ts
      createAcceptedBoard.ts
    refill/
      refillBoard.ts
      refillFitness.ts
      refillMutations.ts
    validation/
      validatePath.ts
      validateMove.ts
    scoring/
      scoreWord.ts

  hooks/
    useAnonymousAuth.ts
    useGame.ts
    useBoardSelection.ts
    useSubmitMove.ts

  utils/
    time.ts
    ids.ts

  styles/
    globals.css

public/
  data/
    full-dictionary.json
    common-dictionary.json
    full-trie.json
    common-trie.json

netlify.toml
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
  failureTags: string[]
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
  boardVersionBefore: number
  boardVersionAfter: number
  createdAt: number
}

type GameRecord = {
  status: "active" | "finished"
  createdAt: number
  createdBy: string
  boardState: BoardState
  players: Record<string, any>
  moves: Record<string, Move>
  lock?: {
    uid: string
    expiresAt: number
  }
}
```

## 17. Firebase Realtime Database Responsibilities

Firebase should store:

- active game board
- board version
- players
- move log
- scores
- lock state

Firebase should not be responsible for:

- generating boards
- solving boards
- word search logic
- refill search logic

Those stay client-side in shared game logic modules.

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
3. initial board must be accepted before player sees it
4. after a valid word, only consumed cells may change
5. refilled board must also be accepted
6. if accepted refill cannot be found, the move must fail rather than degrade board quality

## 20. Build Order

Recommended implementation order:

1. Firebase bootstrapping and anonymous auth
2. dictionary asset loading
3. trie + solver
4. metrics + acceptance logic
5. initial accepted-board generator
6. board selection/path validation hook
7. move submission logic
8. refill algorithm
9. Firebase game sync
10. locking/version conflict handling

## 21. Practical Warning

This stack can implement the game, but there is one real constraint:

- without a custom server, authoritative anti-cheat is weak

If players are trusted, this is acceptable.
If competitive integrity matters, eventually move move-validation and refill generation to a server or Cloud Functions.

For now, for a normal casual game, this stack is sufficient.
