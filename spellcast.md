# Spellcast

Turn-based multiplayer word-tracing game. All players share one evolving 5x5 rune board and take turns casting words across multiple rounds.

## Game Flow

1. **Lobby** - Host creates a room, players join, and the host starts the match.
2. **Playing** - The match runs for a host-selected 5-10 rounds. Each round is one full cycle through the connected players, with each player taking exactly one cast turn before the next round begins automatically. The rune field carries over between rounds.
3. **Finished** - After the final round, the match ends and the highest total score wins. The host can then return everyone to the lobby.

## File Structure

All Spellcast-specific code lives in `src/games/spellcast/`.

```
src/games/spellcast/
|-- db.js                            # Firebase room/game operations
|-- constants/
|   `-- gameConfig.js                # Player limits, board size, game states
|-- data/
|   |-- words.json                   # Main playable dictionary + common-word subset
|   |-- customWords.json             # Manual allow/deny overrides for dictionary generation
|   |-- generate_dictionary.py       # Local script used to rebuild words.json
|   `-- words.js                     # Legacy/local word data helper file
|-- hooks/
|   |-- useBoardSelection.js         # Drag/click path building with backtrack support
|   `-- useGameState.js              # Derives board state, leaderboard, winner, host status
|-- utils/
|   |-- boardUtils.js                # Board generation, solving, refill, shuffle, swap, scoring, hints
|   `-- spellcastSounds.js           # Web Audio SFX + background music
|-- components/
|   |-- screens/
|   |   |-- SpellcastEntry.jsx       # Home screen, rules, create/join flow
|   |   |-- SpellcastRoomRoute.jsx   # Route resolver (Lobby/Game/GameOver)
|   |   |-- LobbyScreen.jsx          # Waiting room, players, start button
|   |   |-- GameScreen.jsx           # Main board, actions, leaderboard, word feed, chat
|   |   `-- GameOverScreen.jsx       # Match winner + return to lobby
|   |-- game/
|   |   |-- Board.jsx                # 5x5 tile grid
|   |   |-- ScorePanel.jsx           # Leaderboard and found-word counts
|   |   `-- WordFeed.jsx             # Recent cast words feed
|   `-- lobby/
|       |-- CreateRoomForm.jsx       # Room creation form
|       `-- JoinRoomForm.jsx         # Room join form
`-- (CSS modules for each component)
```

## Game States (`constants/gameConfig.js`)

- `lobby` - waiting for players
- `playing` - active shared-board gameplay
- `finished` - match complete, winner shown

## Board Logic (`utils/boardUtils.js`)

- **Board size**: fixed 5x5 grid
- **Pathing**: 8-direction adjacency allowed, no tile reuse within a single word
- **Backtracking**: dragging back over the immediately previous tile removes one step
- **Word validation**: checks the traced word against the local dictionary trie
- **Scoring**:
  - 3 letters: 10 points
  - 4 letters: 30 points
  - 5 letters: 60 points
  - 6 letters: 90 points
  - 7 letters: 130 points
  - 8 letters: 180 points
- **Board generation**: creates an accepted board by seeding several embedded word paths, then evaluates board quality
- **Board quality checks**: rejects weak boards with too few words, poor vowel balance, low coverage, or too many identical adjacent letters
- **Refill behavior**: after a valid word, only the consumed path is replaced with weighted random letters
- **Replay guard**: refill rejects paths that immediately form another valid word in that same slot
- **Shuffle**: permutes existing letters and only accepts the result if the board still passes quality checks
- **Swap**: replaces one chosen tile with one chosen letter and only accepts the result if the board remains valid
- **Hint**: reveals an unused 4-letter word from the current board if one exists
- **Gem economy**: each mage starts with 3 gems; `hint` and `swap` cost 2 gems each, and `shuffle` costs 1 gem
- **Utility stocks**: each mage also has limited stock for `hint`, `shuffle`, and `swap`; using a utility spends both stock and gems
- **Gem refresh**: every mage gains +3 gems every 5 rounds
- **Turn timer**: any mage who is not currently taking the turn can trigger a free countdown bar for the active player once per turn; if it expires, the turn passes

## Firebase Data (`rooms/{roomCode}`)

```
meta/
  hostUid, createdAt, status, roomCode, gameType: 'spellcast', numRounds
players/{uid}/
  uid, username, avatarId, joinedAt, connected, score, wordsFound
playerOrder: [uid, ...]
game/
  state, startedAt, round, totalRounds, turnOrder, currentTurnIndex, turnUtilityUsage, gemBalances, utilityStocks, liveSelection
  turnTimer/
    uid, turnUid, startedAt, endsAt
  boardState/
    version, rows, metrics, updatedAt
  foundWords/{word}/
    uid, score, length, createdAt
  moves/{moveId}/
    uid, word, path, score, boardVersionBefore, boardVersionAfter, createdAt
  lastMove/
    uid, word|action, score?, path?, refillWord?, tileIndex?, nextLetter?, turnUid?, amount?, round?, createdAt
```

## Key DB Operations (`db.js`)

| Function | Purpose |
|---|---|
| `createRoom(uid, username, avatarId)` | Create Spellcast room with host player |
| `joinRoom(roomCode, uid, username, avatarId)` | Join existing lobby (max 6 players) |
| `leaveRoom(roomCode, uid)` | Leave lobby or mark disconnected during a match |
| `startGame(roomCode)` | Generate board, reset scores, enter `playing` |
| `submitWord(roomCode, uid, path, expectedVersion)` | Validate traced word, score it, refill board, record move |
| `reshuffleBoard(roomCode, uid, expectedVersion)` | Shuffle the current board if an accepted result is found |
| `swapLetter(roomCode, uid, tileIndex, nextLetter, expectedVersion)` | Replace one tile with one chosen letter if the board stays accepted |
| `useHint(roomCode, uid)` | Spend hint stock/gems and register hint usage for the turn |
| `updateLiveSelection(roomCode, uid, path, boardVersion)` | Broadcast the active player's current traced path to other clients |
| `triggerTurnTimer(roomCode, uid)` | Start the free countdown against the current active player |
| `expireTurnTimer(roomCode, turnUid, endedAt)` | Authoritatively expire the countdown and pass the turn |
| `finishMatch(roomCode)` | Force the match to end immediately |
| `returnToLobby(roomCode)` | Reset room back to `lobby` |

## Rules

- **Shared board**: everyone plays on the same evolving board
- **Minimum word length**: 3 letters
- **Turn-based rounds**: a round ends when every connected player has completed one successful cast turn
- **Adjacency**: orthogonal and diagonal links are both valid
- **No tile reuse** within one traced word
- **Repeat casts allowed**: words can be cast and scored again later in the same match
- **Board versioning**: submissions, shuffles, and swaps reject stale client state if the board has already changed
- **Cast ends the turn**: a successful cast passes play to the next connected player
- **Utility actions stay on turn**: shuffle, swap, and hint do not end your turn
- **Utility limits**: hint, shuffle, and swap can each be used at most once per turn and only while you still have enough gems and remaining stock
- **Gem refresh**: gems do not reset every round; instead, every mage gains +3 gems every 5 rounds
- **Timer pressure**: the non-active players can trigger one free timer per turn; it is unavailable to the active player
- **Rounds**: the host chooses 5-10 rounds, and the same evolving board carries through the full match
- **Winning**: highest total score after the final round
- **Player count**: 1-6 players supported
- **Title/branding**: the entry/lobby UI is presented as `Not Spellcast`

## UI Features

- **Drag-based selection** with click support and one-step undo by backtracking
- **Live selection sharing**: non-active players can see the active player's current traced path in blue
- **Path direction markers**: selected tiles show directional arrows for the traced path
- **Large board actions** under the grid: `Cast`, `Clear Path`, `Hint`, `Shuffle`, `Swap`, and the spectator `Turn Timer`
- **Swap overlay** with mobile-friendly A-Z picker
- **Utility economy UI**: each utility button shows remaining stock plus gem cost
- **Recent-word feed** showing who cast what
- **Leaderboard** showing score, found-word counts, and gem totals
- **Top banner messaging** for casts, errors, shuffles, swaps, hints, timer starts, and timer expiries
- **Turn timer bar** shown in the action-message area when spectators trigger the countdown
- **Tile feedback**:
  - local selection uses green outlines
  - opponent live selection uses blue outlines
  - successful cast paths blink orange before refill, then settle into a dim orange afterglow
  - swaps flash orange on the changed tile
  - shuffles flash the board orange temporarily
- **Mobile layout** stacks board/actions first, then mages/recent spells, then rune-field metrics
- **ChatPanel** available in lobby and active game

## Sound (`utils/spellcastSounds.js`)

All audio is programmatic via Web Audio API.

- Rising-pitch tile select sound while tracing
- Word-complete fanfare that gets fuller for longer words
- Invalid word cue
- Ambient looping background music
- Global mute toggle via `setMuted` / `isMuted`

## Common Resources Used

Imports from shared `src/` modules:
- `@/firebase/config` - Firebase `db` instance
- `@/hooks/useRoom`, `@/hooks/useAuth` - room subscription and auth uid
- `@/components/shared/Avatar`, `LoadingSpinner` - shared UI
- `@/components/chat/ChatPanel` - in-game chat
- `@/utils/roomCode` - room code generation
