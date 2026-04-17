# Tron

Multiplayer light-cycle arena game. Players steer bikes that leave trails; last one alive wins the round.

## Files

All tron-specific code lives in `src/games/tron/`.

```
src/games/tron/
├── db.js                            # All DB operations (room CRUD, game state, snapshots, inputs)
├── engine/
│   ├── GameEngine.js                # Main game loop, collision detection, state management
│   ├── Player.js                    # Individual player state & physics
│   ├── InputManager.js              # Keyboard/touch input handling
│   ├── PowerUpManager.js            # Power-up spawning & effect application
│   ├── TrailCollision.js            # Wall, trail, and head-on collision detection
│   └── TronScene.js                 # Phaser scene rendering
├── hooks/
│   ├── useGameState.js              # Derives game state from Firebase room data
│   ├── useGameLoop.js               # Host vs client game loop, Phaser init, snapshot sync
│   ├── useCountdown.js              # 3-second countdown timer
│   └── useHostArbiter.js            # Host-side orchestration (round transitions, timeout)
├── components/
│   ├── screens/
│   │   ├── TronEntry.jsx            # Home screen, create/join flow
│   │   ├── TronRoomRoute.jsx        # Route resolver (Lobby/Game/GameOver)
│   │   ├── LobbyScreen.jsx          # Pre-game lobby with settings
│   │   ├── GameScreen.jsx           # Active gameplay with Phaser canvas
│   │   └── GameOverScreen.jsx       # Final results & leaderboard
│   ├── game/
│   │   ├── HUD.jsx                  # Round, alive count, timer, active power-up
│   │   ├── ScorePanel.jsx           # Sidebar player scores & alive status
│   │   ├── CountdownOverlay.jsx     # 3-2-1-GO overlay
│   │   ├── RoundResultOverlay.jsx   # Round winner & kill feed
│   │   └── TouchControls.jsx        # Mobile left/right buttons
│   └── lobby/
│       ├── CreateRoomForm.jsx       # Username, avatar, vehicle selection
│       ├── JoinRoomForm.jsx         # Room code + player setup
│       ├── SettingsPanel.jsx        # Host settings (rounds, duration, trail, power-ups)
│       └── VehiclePicker.jsx        # 8 colors + 4 styles
├── constants/
│   ├── gameConfig.js                # Physics, timing, trail, scoring settings
│   ├── gameStates.js                # LOBBY, COUNTDOWN, PLAYING, ROUND_END, GAME_OVER
│   ├── powerUps.js                  # 5 power-up type definitions
│   ├── spawnPositions.js            # Spawn configs for 2-4 players
│   └── vehicles.js                  # 8 colors + 4 styles
├── utils/
│   ├── spawnUtils.js                # Maps playerOrder to spawn positions
│   ├── deterministicRandom.js       # Seeded PRNG (Mulberry32) for reproducible power-ups
│   └── colorUtils.js                # Hex/RGB conversions, trail fading, glow colors
└── (CSS modules for each component)
```

## Game State Machine

`LOBBY → COUNTDOWN → PLAYING → ROUND_END → (next round or GAME_OVER)`

## Networking Model

**Host-authoritative**: the host runs the physics loop at 60 FPS and broadcasts snapshots (~10/sec) to Firebase. Clients send turn input only when it changes; no input prediction or rollback.

- **Host**: runs `GameEngine`, reads all player inputs from Firebase, writes snapshots
- **Clients**: send turn input (`-1`/`0`/`1`), subscribe to host snapshots, render from synced state

## DB Functions (`db.js`)

| Function | Purpose |
|---|---|
| `createRoom(uid, username, avatarId)` | Creates room with host, returns 6-char code |
| `joinRoom(roomCode, uid, username, avatarId)` | Adds player (max 4), auto-assigns free color |
| `leaveRoom(roomCode, uid)` | Marks disconnected, promotes host if needed |
| `updateVehicle(roomCode, uid, color, style)` | Change vehicle color/style |
| `updateSettings(roomCode, settings)` | Host-only: rounds, duration, trail length, power-ups |
| `startGame(roomCode, playerOrder)` | LOBBY → COUNTDOWN, assigns spawns, seeds RNG |
| `beginPlaying(roomCode)` | COUNTDOWN → PLAYING (sets server timestamp) |
| `writeSnapshot(roomCode, snapshot)` | Host broadcasts positions, trails, power-ups |
| `subscribeToSnapshot(roomCode, callback)` | Clients sync game state from host |
| `writeTurnInput(roomCode, uid, input)` | Client sends turn input (-1/0/1) |
| `subscribeToInputs(roomCode, callback)` | Host reads all player inputs |
| `endRound(roomCode, results)` | Records winner, kills, scores; PLAYING → ROUND_END |
| `advanceRound(roomCode)` | Next round COUNTDOWN or GAME_OVER |
| `resetGame(roomCode)` | Zero scores, return to COUNTDOWN round 1 |
| `promoteHost(roomCode, newHostUid)` | Reassign host |

## Rules

- **Movement**: continuous at 150 px/s, steering at 3.2 rad/s (A/D or Arrow keys)
- **Arena**: 1000x700 pixels
- **Collision types**: wall boundary, opponent/self trail (point-to-segment), head-on contact
- **Self-trail grace**: last 15 trail points ignored to prevent instant death
- **Scoring**: +100 round win, +50 kill (credited to trail owner)
- **Rounds**: configurable 2-5 (default 2); all rounds played, then final leaderboard
- **Round duration**: 60/90/120/180 seconds (default 90), enforced via server timestamp
- **Trail length**: Short (120), Medium (250), Long (500), or Infinite
- **Max 4 players**, min 2 to start
- **Vehicle customization**: 8 colors (unique per player, auto-reassigned) + 4 styles

## Power-Ups (optional, host-toggled)

Spawn every 5 seconds, max 3 on field, pickup radius 16px. Deterministic spawning via seeded PRNG.

| Power-Up | Duration | Effect |
|---|---|---|
| Speed Boost | 3 sec | Move at 280 px/s |
| Ghost Mode | 2 sec | Pass through trails (not walls) |
| Trail Bomb | Instant | Erase trails in 80px radius |
| Short Circuit | Instant | Cut nearest opponent's trail in half |
| Phase Wall | 5 sec | Place 80px wall perpendicular ahead |

## Key Constants

```
PLAYER_SPEED = 150, BOOST_SPEED = 280, TURN_RATE = 3.2
PLAYER_RADIUS = 8, TRAIL_WIDTH = 4, TRAIL_GLOW_WIDTH = 12
PHYSICS_FPS = 60, SNAPSHOT_RATE = 100ms
COUNTDOWN_DURATION = 3s, ROUND_END_DELAY = 4000ms
```

## Common Resources Used

Imports from shared `src/` modules:
- `@/firebase/config` — Firebase `db` instance
- `@/hooks/useRoom`, `@/hooks/useServerTimeOffset` — room subscription, clock correction
- `@/hooks/useAuth` — anonymous auth uid
- `@/components/shared/Avatar`, `AvatarPicker`, `LoadingSpinner` — UI components
- `@/components/chat/ChatPanel` — in-game chat
- `@/constants/avatars` — avatar definitions
- `@/utils/roomCode` — room code generation
- Reuses hangman's `RoomCodeDisplay` and `PlayerSlot` components
