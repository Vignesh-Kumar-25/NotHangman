# Not Minesweeper

Multiplayer minesweeper-style game. Players take turns revealing tiles on a shared grid. Hitting a bomb eliminates you; last player standing wins the round.

## Game Flow

1. **Lobby** — Host creates room, players join (2-6 players). Host configures settings.
2. **Playing** — Players take turns clicking tiles. Safe tiles flood-reveal (like classic minesweeper). Bombs eliminate the clicking player.
3. **Round Over** — Last surviving player wins the round. Auto-advances after 5 seconds or host clicks "Next Round".
4. **Finished** — After all rounds complete, match winner is shown on the Game Over screen.

In the final round, the explosion popup shows for 2 seconds before transitioning to the Game Over screen (no round-over card for the final round).

## Settings (configurable in lobby by host)

| Setting | Options | Default |
|---|---|---|
| Board Size | 8x8, 10x10, 12x12, 16x16 | 10x10 |
| Bombs | 10, 15, 20, 25, 30 | 15 |
| Turn Timer | 15s, 30s, 45s, 60s, No limit | 30s |
| Rounds | 1, 3, 5, 7 | 3 |

Bomb count is capped at `rows * cols - 1`.

## Board Logic (`utils/boardUtils.js`)

- **Bomb placement**: Random unique indices, `generateBombs(rows, cols, count)`
- **Flood reveal**: When a safe tile with 0 adjacent bombs is clicked, recursively reveals all connected 0-count tiles and their borders (`floodReveal`)
- **Adjacent count**: Standard 8-neighbor minesweeper counting (`getAdjacentBombCount`)
- **Turn rotation**: Skips eliminated players (`getNextAlivePlayerIndex`)
- **Round start rotation**: Each round starts with a different player (`(roundNumber - 1) % playerCount`)

## File Structure

```
src/games/mines/
├── db.js                       # Firebase operations (create/join/leave room, reveal tile, rounds, match finish)
├── constants/
│   └── gameConfig.js           # Board sizes, bomb presets, timer options, round options, game states, number colors
├── hooks/
│   └── useGameState.js         # Derives game state from room data (players, turns, elimination)
├── utils/
│   ├── boardUtils.js           # Bomb generation, flood reveal, neighbor counting
│   └── minesSounds.js          # Web Audio API: tile reveal, explosion, round win, match win, background music
├── components/
│   ├── screens/
│   │   ├── MinesEntry.jsx      # Game home page (title, rules, create/join room)
│   │   ├── MinesRoomRoute.jsx  # Router: lobby → game → game over based on game state
│   │   ├── LobbyScreen.jsx     # Pre-game lobby (players, settings, start)
│   │   ├── GameScreen.jsx      # Main gameplay (board, players, timer, popups, chat)
│   │   └── GameOverScreen.jsx  # Match results (winner, standings, round breakdown)
│   ├── game/
│   │   ├── Board.jsx           # Grid of tiles
│   │   ├── PlayerPanel.jsx     # Player list with elimination/wins status
│   │   └── Tile.jsx            # Individual tile (hidden, revealed number, bomb)
│   └── lobby/
│       ├── CreateRoomForm.jsx  # Room creation form
│       ├── JoinRoomForm.jsx    # Room join form
│       └── SettingsPanel.jsx   # Board size, bombs, timer, rounds config
```

## Game States (`constants/gameConfig.js`)

- `lobby` — waiting for players, settings configurable
- `playing` — active gameplay, turn-based tile reveals
- `round_over` — round ended, showing winner, auto-advancing
- `finished` — all rounds complete, showing match results

## Firebase Data (`rooms/{roomCode}`)

```
meta/
  hostUid, roomCode, status, gameType: 'mines'
  boardRows, boardCols, bombCount, turnTimeLimit, numRounds
players/{uid}/
  uid, username, avatarId, joinedAt, connected
playerOrder: [uid, ...]
game/
  state, bombs: [indices], revealed: {index: count | -1}
  currentTurnIndex, eliminatedPlayers: {uid: true}
  turnStartedAt, lastAction: {type, index, uid, timestamp}
  currentRound, totalRounds, roundWins: {uid: count}
  roundResults: {round: winnerUid}, roundWinner, matchWinner
```

## Key DB Operations (`db.js`)

| Function | Purpose |
|---|---|
| `createRoom(uid, username, avatarId)` | Create room with default settings |
| `joinRoom(roomCode, uid, username, avatarId)` | Join existing room (max 6 players) |
| `leaveRoom(roomCode, uid)` | Leave room (host transfer if needed) |
| `startGame(roomCode, playerOrder, meta)` | Generate bombs, begin round 1 |
| `revealTile(roomCode, uid, tileIndex)` | Reveal tile — safe flood-reveal or bomb elimination |
| `startNextRound(roomCode, meta)` | Reset board for next round |
| `finishMatch(roomCode)` | Transition from round_over to finished state |
| `skipTurn(roomCode)` | Timeout: triggers a random unrevealed tile for the current player |
| `resetGame(roomCode, playerOrder, meta)` | Full reset for "Play Again" |
| `returnToLobby(roomCode)` | Return to lobby state |

## UI Features

- **Timer**: Displayed prominently at the top of the screen (outside the player panel) with large font. Turns red and pulses when ≤5 seconds remain. When time runs out, a random unrevealed tile is triggered for the timed-out player (can hit a bomb). A message is shown: "X ran out of time, random tile triggered".
- **Explosion popup**: Shows bomb emoji + "KABOOM!" for 3.5s (2s on final round). Overlays the entire screen.
- **Round over popup**: Shows round winner avatar, scores, and "Next Round" button (host) or auto-advance message.
- **Mute button**: Toggles all sound effects and background music.
- **Chat**: Available on all screens via ChatPanel.

## Sound Effects (`utils/minesSounds.js`)

All audio is programmatic via Web Audio API (no audio files). Includes:
- Tile reveal click
- Explosion (layered noise burst)
- Round win fanfare
- Match win fanfare
- Button clicks
- Background music (looping sequence)
- Global mute toggle (`setMuted` / `isMuted`)
