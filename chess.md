# Chess

Multiplayer mini-chess on a compact 5x8 board. Two players, real-time moves, full rule enforcement.

## Files

All chess-specific code lives in `src/games/chess/`.

```
src/games/chess/
├── db.js                        # All DB operations (room CRUD, moves, resign, rematch)
├── hooks/
│   └── useGameState.js          # Derives game state (myColor, isMyTurn, isHost, etc.)
├── components/
│   ├── screens/                 # ChessEntry, ChessRoomRoute, LobbyScreen, GameScreen,
│   │                            # GameOverScreen
│   ├── game/                    # Board, CapturedPieces, PromotionPicker
│   └── lobby/                   # CreateRoomForm, JoinRoomForm, SettingsPanel
├── constants/
│   └── gameConfig.js            # Board dimensions, pieces, initial setup, timers, game states
└── utils/
    ├── chessLogic.js            # Move validation, check/checkmate/stalemate detection, promotion
    └── chessSounds.js           # Web Audio API sound effects (move, capture, check, checkmate)
```

## Game State Machine

`LOBBY → PLAYING → GAME_OVER`

## DB Functions (`db.js`)

| Function | Purpose |
|---|---|
| `createRoom(uid, username, avatarId)` | Creates room, returns 6-char code |
| `joinRoom(roomCode, uid, username, avatarId)` | Adds player to existing room (max 2) |
| `leaveRoom(roomCode, uid)` | Marks player disconnected, transfers host if needed |
| `updateSettings(roomCode, settings)` | Updates turn time limit (host only) |
| `startGame(roomCode, playerOrder)` | LOBBY → PLAYING, assigns white/black |
| `makeMove(roomCode, uid, fromR, fromC, toR, toC, promotionType)` | Validates and applies a move |
| `finishGame(roomCode)` | PLAYING → GAME_OVER |
| `resignGame(roomCode, uid)` | Forfeit, opponent wins |
| `resetGame(roomCode, playerOrder)` | Play again (swaps colors) |
| `returnToLobby(roomCode)` | GAME_OVER → LOBBY |

## Rules

- **Board**: 5 files × 8 ranks (compact variant, no castling or en passant)
- **Initial setup**: Back rank is Rook, Knight, King, Queen, Bishop (files 0-4); 5 pawns in front
- **Turn order**: White always moves first; colors swap on rematch
- **Move validation**: Full legal move checking including pins and discovered checks
- **Check**: King under attack; only moves that resolve check are legal
- **Checkmate**: No legal moves while in check → current player loses
- **Stalemate**: No legal moves while not in check → draw
- **Pawn promotion**: Pawn reaching far rank must promote (Queen, Rook, Bishop, or Knight)
- **Captures**: Captured pieces tracked and displayed per player
- **Turn timer**: Optional (30s, 60s, 2m, 5m, or unlimited); visual countdown only, no auto-forfeit
- **Resignation**: Either player can resign at any time
- **2 players exactly**: No spectators, no larger rooms

## Board Representation

- Internal: 2D array `board[row][col]` with `{ type, color }` objects or `null`
- Firebase storage: Flattened via `boardToFlat()` / restored via `flatToBoard()`
- Board flipped visually for black player

## Common Resources Used

Imports from shared `src/` modules:
- `@/firebase/config` — Firebase `db` instance
- `@/hooks/useRoom` — room subscription
- `@/components/shared/Avatar`, `AvatarPicker`, `LoadingSpinner` — UI components
- `@/components/chat/ChatPanel` — in-game chat
- `@/constants/avatars` — avatar definitions
- `@/utils/roomCode` — room code generation
