# Not Flappy Bird

Multiplayer side-by-side Flappy Bird-style race. Everyone flies through the same seeded pipe course at the same time; highest score wins, with survival time as the tiebreaker.

## Files

All flappy-specific code lives in `src/games/flappy/`.

```
src/games/flappy/
|-- db.js                         # Room CRUD, settings, run reporting, finish/reset logic
|-- hooks/
|   `-- useGameState.js           # Derives players, host, connected/alive players, local run state
|-- components/
|   |-- screens/                  # FlappyEntry, FlappyRoomRoute, LobbyScreen, GameScreen, GameOverScreen
|   |-- game/                     # Board, PlayerPanel
|   `-- lobby/                    # CreateRoomForm, JoinRoomForm, SettingsPanel
|-- constants/
|   `-- gameConfig.js             # Player limits, settings options, game states, world physics constants
`-- utils/
    |-- flappyLogic.js            # Seeded pipes, speed ramp, travel distance, scoring, collision, standings
    `-- flappySounds.js           # Web Audio API flap/crossing/music plus game-over voice fallback
```

## Game State Machine

`LOBBY -> PLAYING -> FINISHED`

The host starts the game from the lobby. `startGame` sets a deterministic seed, writes each player's initial run, and schedules a short shared countdown via `startsAt`. During play, each client simulates its own bird locally and reports its run state to Firebase. When every connected player is crashed, the host finishes the race and writes the winner.

## DB Functions (`db.js`)

| Function | Purpose |
|---|---|
| `createRoom(uid, username, avatarId)` | Creates a Flappy room with default settings, returns 6-char code |
| `joinRoom(roomCode, uid, username, avatarId)` | Adds player to an existing Flappy lobby |
| `leaveRoom(roomCode, uid)` | Removes lobby players or marks active players disconnected/crashed; transfers host if needed |
| `updateSettings(roomCode, settings)` | Host setting updates for `pipeGap` and `gameSpeed` |
| `startGame(roomCode, playerOrder, meta)` | LOBBY -> PLAYING, seeds pipe course, creates per-player runs |
| `reportRunState(roomCode, uid, state)` | Client reports alive, score, survival time, y, velocity, and crash time |
| `finishRace(roomCode)` | Host computes winner once all connected players are no longer alive |
| `resetGame(roomCode, playerOrder, meta)` | Starts another race with the same room/settings |
| `returnToLobby(roomCode)` | FINISHED -> LOBBY |

## Rules

- **Shared course**: all players use the same `seed`, pipe spacing, pipe gap, speed setting, and countdown.
- **Input**: Space, Arrow Up, click, or tap flaps the local bird.
- **Local simulation**: each client owns its own physics loop and reports its run to Firebase.
- **Scoring**: score is the number of pipes passed.
- **Winner**: highest score wins; if scores tie, higher `survivalMs` wins.
- **Collision**: crashing occurs on ceiling, ground, or overlapping a pipe outside the gap.
- **Speed ramp**: effective speed ramps by selected mode. `Cruise` starts at `0.9x` and slowly caps at `1.5x`; `Normal` starts at `1x` and caps at `2x`; `Fast` starts at `1.5x` and caps at `2.5x`.
- **Moving pipes**: pipe columns start oscillating at score 35.
- **Players**: 1-6 players; default room settings allow solo testing.
- **Settings**: host can choose pipe gap (`Tight`, `Classic`, `Wide`) and speed (`Cruise`, `Normal`, `Fast`) in the lobby.

## Key Constants (`constants/gameConfig.js`)

| Constant | Value / Purpose |
|---|---|
| `MIN_PLAYERS` | `1` |
| `MAX_PLAYERS` | `6` |
| `COUNTDOWN_MS` | `3000` |
| `DEFAULT_PIPE_GAP` | `150` |
| `DEFAULT_GAME_SPEED` | `1` |
| `WORLD.width` / `WORLD.height` | `420 x 520` game area |
| `WORLD.birdX` / `WORLD.birdSize` | Fixed horizontal position and collision size |
| `WORLD.gravity` / `WORLD.flapVelocity` | Bird physics |
| `WORLD.pipeWidth` / `WORLD.pipeSpacing` | Pipe geometry and spacing |
| `WORLD.baseSpeed` | Base world scroll speed |
| `WORLD.groundHeight` | Ground collision/rendering height |
| `PIPE_MOVEMENT` | Pipe oscillation settings after score 35 |

## Firebase Data (`rooms/{roomCode}`)

```
meta/
  hostUid, createdAt, status, roomCode, gameType: 'flappy'
  pipeGap, gameSpeed
players/{uid}/
  uid, username, avatarId, joinedAt, connected
playerOrder: [uid, ...]
game/
  state, seed, startsAt, pipeGap, gameSpeed
  runs/{uid}/
    alive, score, survivalMs, y, velocity, crashedAt, leftAt
  winner, finishedAt
```

## Core Logic (`utils/flappyLogic.js`)

- `getPipe(seed, index)` creates deterministic pipe heights from a seeded PRNG.
- `getVisiblePipes(seed, elapsedMs, speedMultiplier)` returns the visible pipe window for rendering/collision.
- `getSpeedRamp(elapsedMs)` returns the default displayed speed ramp.
- `getEffectiveSpeedMultiplier(elapsedMs, speedMultiplier)` applies the configured speed profile and cap.
- `getTravelDistance(elapsedMs, speedMultiplier)` computes world scroll distance with the ramp.
- `getPipeScreenX(pipe, elapsedMs, speedMultiplier)` maps a pipe to current screen position.
- `getScoreFromElapsed(seed, elapsedMs, speedMultiplier)` converts travel distance into pipes passed.
- `getPipeColumnOffset(pipe, elapsedMs, score, pipeGap)` and `getPipeGapTop(pipe, elapsedMs, score, pipeGap)` apply moving-pipe offsets once score reaches 35.
- `hasCollision(y, seed, elapsedMs, pipeGap, speedMultiplier, score)` checks bounds and pipe collisions, including moving pipe gaps.
- `sortRuns(playerOrder, players, runs)` orders final standings by score, then survival time.

## UI Features

- **Entry screen** with rules, create room, and join room flows.
- **Lobby screen** with room code copying, player list, settings, start button, leave button, and chat.
- **Split race board** showing one course per connected player.
- **Countdown overlay** before physics starts.
- **Flight board** ranking panel with live scores.
- **Audio** includes flap, pipe-crossing cues, tempo-adjusted pop music, and a game-over voice/fallback tone.
- **Chat** is available in lobby, gameplay, and game-over screens.

## Common Resources Used

Imports from shared `src/` modules:
- `@/firebase/config` - Firebase `db` instance
- `@/hooks/useRoom`, `@/hooks/useServerTimeOffset` - room subscription, clock correction
- `@/hooks/useAuth` - anonymous auth uid on entry screen
- `@/components/shared/Avatar`, `AvatarPicker`, `LoadingSpinner` - UI components
- `@/components/chat/ChatPanel` - in-game chat
- `@/constants/avatars` - avatar definitions
- `@/utils/roomCode` - room code generation and normalization
