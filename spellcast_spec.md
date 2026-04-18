# Spellcast — Game Specification

A **turn-based** word-grid game where players take turns forming words on a shared 5x5 board by connecting adjacent letters. Scoring blends **letter values**, **tile multipliers**, and **bonuses** — rewarding both vocabulary and board positioning. Rendered with **Pixi.js**.

---

## 1. Overview

- **Grid:** 5x5 shared board
- **Players:** 2–6 per game, free-for-all
- **Format:** Turn-based. Players alternate. Each match lasts **5 rounds** (configurable 1–5) — each player plays one word per round.
- **Board state:** Persists across turns. Tiles used in a word are replaced with fresh weighted-random letters; unused tiles (including multipliers and unclaimed gems) remain.
- **Win condition:** Highest cumulative score after all rounds.
- **Turn timer:** Configurable (30/45/60/90/120 seconds, default 60).

---

## 2. Grid Generation

Letters are **frequency-weighted**, not uniform random, to guarantee playable boards.

| Tier     | Letters                           | Weight     |
|----------|-----------------------------------|------------|
| Common   | E, A, R, I, O                     | High       |
| Medium   | T, N, S, L, D, G                  | Moderate   |
| Uncommon | B, C, M, P, F, H, U, W, Y, V, K   | Low        |
| Rare     | J, X, Q, Z                        | Very Low   |

Defined in `src/games/spellcast/constants/letterConfig.js` as `LETTER_POOL`.

Board generation (`src/games/spellcast/utils/boardUtils.js`):
- `generateBoard(round)` creates a 5x5 array of tile objects `{ letter, value, multiplier, gem }`
- Places 2 DL + 1 TL multiplier tiles per board
- Round 1: no 2x word multiplier. Rounds 2–5: one 2x tile placed
- ~3 gem tiles placed per board
- Replacement tiles from `replaceTiles()` get new weighted-random letters (no multipliers/gems on replacements)

---

## 3. Tile Adjacency & Selection

Players form words by **dragging** across adjacent tiles (horizontal, vertical, or diagonal) on the Pixi.js canvas.

**Constraints:**
- No tile can be reused within a single word
- The path must be continuous (each tile adjacent to the previous)
- Backtracking by dragging back pops the last tile

Drag logic implemented in `src/games/spellcast/hooks/useDragSelection.js`. Pixi.js pointer events handle the drag state machine.

---

## 4. Word Validation

Uses a bundled English dictionary (~149K words, 2–8 letters) loaded as a `Set` for O(1) lookup.

- Dictionary file: `src/games/spellcast/data/words.txt` (uppercase, one per line)
- Loaded via Vite `?raw` import in `src/games/spellcast/utils/dictionaryUtils.js`
- Also builds a **Trie** for prefix pruning in the hint solver
- Minimum word length: 2 letters

---

## 5. Letter Values

Each letter has a fixed point value defined in `src/games/spellcast/constants/letterConfig.js`:

| Tier   | Letters                              | Value |
|--------|--------------------------------------|-------|
| Common | E, A, I, O, N, R, T, L, S           | 1     |
| Medium | D, U                                | 2     |
| Medium | G, M, P                             | 3     |
| Higher | B, C, F, H, V, W, Y                 | 4     |
| High   | K                                    | 5     |
| Rare   | J, X                                | 8     |
| Rare   | Q, Z                                | 10    |

---

## 6. Tile Multipliers

Some tiles contain modifiers that boost score. Placed on the tile and persist until consumed.

### Letter Multipliers (apply only to that one letter)
- **DL** — Double Letter (letter value x 2)
- **TL** — Triple Letter (letter value x 3)

### Word Multipliers (apply to the full word)
- **2x** — Double Word

### Placement rules across rounds
- **Round 1:** No 2x word multipliers. DL/TL can appear.
- **Rounds 2–5:** One 2x tile placed each round. DL/TL continue to appear.
- Multiplier tiles that aren't consumed carry over to the next turn on the same tile.

---

## 7. Scoring — Order of Operations

Implemented in `src/games/spellcast/utils/scoringUtils.js`:

1. Apply letter multipliers (DL / TL) to individual letters
2. Sum all letter values
3. Apply word multiplier (2x) to the sum
4. Add bonuses **outside** the word multiplier

### Formula

```
score = ( Σ (letter_value × letter_multiplier) ) × word_multiplier
        + (10 if word_length ≥ 6 else 0)
```

### Long Word Bonus
- Words of **6+ letters** → **+10 points**
- Bonus is **NOT** multiplied by 2x

---

## 8. Gems (Currency System)

Gems are both a **placed tile feature** and a **spendable resource**.

### Starting state
- Each player begins each match with **3 gems**

### Earning gems
- Certain tiles on the grid are **gem-marked** (diamond icon)
- Using a gem-marked tile in a valid word awards **1 gem** per marked tile consumed
- After the turn, the tile is replaced with a fresh letter (the gem mark does not transfer)

### Cap
- **Maximum 10 gems** held at any time

### End-of-game conversion
- **1 gem = 1 point** (applied to every leftover gem at game over)

### Abilities (spend gems during your turn — one ability per turn max)

| Ability        | Cost    | Effect                                                           |
|----------------|---------|------------------------------------------------------------------|
| Shuffle board  | 1 gem   | Reshuffle all current tile letters (multipliers/gems stay in place) |
| Swap letter    | 3 gems  | Replace any one tile's letter with any letter A–Z of your choice |
| Hint           | 4 gems  | Highlights the highest-scoring word found by DFS solver          |

Gem logic: `src/games/spellcast/utils/gemUtils.js`

---

## 9. Gem Tile & Multiplier Placement

Board generation in `src/games/spellcast/utils/boardUtils.js`:
- Picks random non-overlapping positions for multipliers and gems
- Avoids placing multiple modifiers on the same tile
- ~3 gem tiles, 2 DL, 1 TL per board; 1 word-2x from round 2+

---

## 10. Turn Structure

Each turn follows a strict sequence:

1. Player may spend gems on one ability (shuffle/swap/hint)
2. Player drags to trace a word path on the Pixi.js canvas
3. Word is validated against dictionary + scored
4. Tiles consumed are replaced with fresh weighted-random letters
5. Gems earned from consumed gem tiles
6. Turn passes to next player

### Round completion
- A **round** ends when every player has taken one turn (tracked via `turnIndex`)
- Between rounds: new board generated with fresh multiplier/gem tiles
- Host arbiter auto-advances rounds after a 5-second delay

---

## 11. Game States

Same state machine as Hangman: `LOBBY → ROUND_START → PLAYING → ROUND_END → GAME_OVER`

Defined in `src/games/spellcast/constants/gameStates.js`.

Host arbiter (`src/games/spellcast/hooks/useHostArbiter.js`) handles:
- Host reassignment on disconnect
- ROUND_START → PLAYING (3s delay)
- Timer expiry → pass turn
- ROUND_END → next round or GAME_OVER (5s delay)

---

## 12. Firebase Data Structure

```
rooms/{roomCode}/
  meta: { hostUid, status, roomCode, createdAt, numRounds, turnDuration }
  players: {
    [uid]: { uid, username, avatarId, score, gems, connected, joinedAt }
  }
  playerOrder: [uid1, uid2, ...]
  game: {
    state,                    // LOBBY | ROUND_START | PLAYING | ROUND_END | GAME_OVER
    round, numRounds, turnDuration,
    currentTurnUid, turnStartTime,
    turnIndex,                // 0..playerOrder.length; round ends when === length
    board: [[{letter, value, multiplier, gem}, ...], ...],  // 5x5
    lastWord: null | { path, word, score, playerUid },
    usedAbility: null | 'shuffle' | 'swap' | 'hint',
    hintWord: null | [{row, col}, ...]
  }
  roundHistory: { [round]: { scores: {[uid]: number} } }
  chat: { ... }
  kickVotes: { ... }
```

DB operations: `src/games/spellcast/db.js` (16 functions: createRoom, joinRoom, leaveRoom, reconnectPlayer, startGame, beginPlaying, submitWord, passTurn, useAbilityShuffle, useAbilitySwap, useAbilityHint, advanceRound, resetGame, setRoomNumRounds, setRoomTurnDuration, voteToKick, promoteHost).

---

## 13. Rendering (Pixi.js)

- **SpellcastRenderer** (`src/games/spellcast/renderer/SpellcastRenderer.js`): Manages 5x5 grid of TileSprites, trail graphics for drag paths, hint highlighting
- **TileSprite** (`src/games/spellcast/renderer/TileSprite.js`): Individual tile container — rounded rect background, letter text, point value, multiplier badge (DL/TL/2x colored), gem diamond icon. Interactive pointer events.
- **useGameRenderer** hook: Creates Pixi.Application, attaches to DOM via callback ref, manages lifecycle
- **useDragSelection** hook: Pointer event state machine for tile selection with adjacency validation

Render constants in `src/games/spellcast/renderer/constants.js`:
- Tile size: 80px, gap: 6px, padding: 20px
- Canvas auto-scales via `maxWidth: 100%`

---

## 14. Hint Solver

DFS word finder in `src/games/spellcast/utils/hintUtils.js`:
- Explores all paths from every cell, 8-directional adjacency
- Uses Trie prefix pruning to cut infeasible branches early
- Returns the highest-scoring valid word path
- Path length capped at 10 to limit computation
- Runs client-side when player spends 4 gems on Hint ability

---

## 15. File Structure

```
src/games/spellcast/
  db.js                              # All Firebase operations
  constants/
    gameConfig.js                    # Board size, timing, gem costs, scoring
    gameStates.js                    # LOBBY, ROUND_START, PLAYING, ROUND_END, GAME_OVER
    letterConfig.js                  # Letter values, weighted pool, multiplier types
  data/
    words.txt                        # English dictionary (~149K words, uppercase)
  utils/
    boardUtils.js                    # Board generation, tile replacement, shuffle, swap
    scoringUtils.js                  # Word scoring with multiplier order of operations
    dictionaryUtils.js               # Dictionary Set + Trie loader
    hintUtils.js                     # DFS hint solver with Trie pruning
    gemUtils.js                      # Gem earn/spend/afford helpers
    turnUtils.js                     # Next player rotation (skip disconnected)
  hooks/
    useGameState.js                  # Derive isHost, isMyTurn, myGems from room
    useHostArbiter.js                # Host-only state transitions
    useTimer.js                      # Turn countdown with server time offset
    useGameRenderer.js               # Pixi.Application lifecycle (callback ref)
    useDragSelection.js              # Drag state machine for tile selection
    useDictionary.js                 # Lazy dictionary + trie loader
  renderer/
    SpellcastRenderer.js             # Grid rendering, trail, highlight, hint
    TileSprite.js                    # Single tile: letter, value, badges, gem icon
    constants.js                     # Tile size, colors, fonts
  components/
    screens/
      SpellcastEntry.jsx             # Game home (hero + create/join)
      SpellcastRoomRoute.jsx         # Router (lobby/game/gameover) + reconnect
      LobbyScreen.jsx                # Room code, players, host settings
      GameScreen.jsx                 # Sidebar + Pixi canvas + chat + overlays
      GameOverScreen.jsx             # Leaderboard + play again
    game/
      ScorePanel.jsx                 # Player list with scores + gem counts
      TurnTimer.jsx                  # Circular SVG countdown
      TurnIndicator.jsx              # "Your turn!" / "Player's turn"
      RoundBadge.jsx                 # "Round X / Y"
      GemPanel.jsx                   # Gem count + ability buttons
      LastWordDisplay.jsx            # Last submitted word + score
      SwapModal.jsx                  # Tile + letter picker for swap ability
      RoundResultOverlay.jsx         # Round summary overlay
    lobby/
      CreateRoomForm.jsx             # Username + avatar picker
      JoinRoomForm.jsx               # Room code + username + avatar
      RoomCodeDisplay.jsx            # 6-char code with copy button
      PlayerSlot.jsx                 # Player card in lobby
```

---

## 16. Reconnection

When a player refreshes mid-game, `onDisconnect` fires and sets `connected: false`. The `SpellcastRoomRoute` component detects this on mount and calls `reconnectPlayer()` to restore `connected: true` and re-register `onDisconnect`.

---

## 17. Platform Integration

- **App.jsx**: Lazy-loaded routes at `/spellcast` and `/spellcast/room/:roomCode`
- **HomeScreen.jsx**: Spellcast card in the GAMES array with `available: true`
- **Dependency**: `pixi.js ^7.3.3`
