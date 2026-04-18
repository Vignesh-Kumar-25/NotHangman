# Party Games

Multiplayer party games platform. Currently includes three games (Hangman, Spellcast, Tron). Built with React + Vite, Firebase Realtime Database, deployed on Netlify. Tron uses Phaser for rendering. Spellcast uses Pixi.js for rendering.

## Core Features

- **Room-based multiplayer**: 2-6 players per room via 6-character invite codes (Hangman caps at 5, Tron at 4, Spellcast at 6)
- **Guest play**: Firebase Anonymous Authentication, no account needed
- **In-game chat**: capped at 200 chars/message, last 50 messages loaded
- **Avatars**: 5 SVG avatar choices per player
- **Sound effects**: programmatic Web Audio API tones and background music via `soundManager.js`
- **Games**: each game lives in `src/games/<name>/` with its own docs (Hangman — see `hangman.md`, Spellcast — see `spellcast_spec.md`, Tron — see `tron.md`)

## Architecture

### Stack
- **Frontend**: React 18, React Router v6, CSS Modules, Vite 5
- **Backend**: Firebase Realtime Database (no custom server)
- **Auth**: Firebase Anonymous Auth
- **Deploy**: Netlify with SPA redirect (`/*` → `/index.html`)

### File Structure
```
src/
├── App.jsx                          # Routes: / (home), /<game>, /room/:roomCode, /spellcast/room/:roomCode
├── main.jsx                         # Entry point, BrowserRouter
├── firebase/
│   ├── config.js                    # Firebase init, reads VITE_FIREBASE_* env vars
│   ├── auth.js                      # signInAnonymously, onAuthStateChanged
│   └── db.js                        # Common DB: subscribeToRoom, chat operations
├── hooks/
│   ├── useAuth.js                   # Auto sign-in as anonymous guest
│   ├── useRoom.js                   # Subscribe to room data via onValue
│   ├── useChat.js                   # Chat subscription
│   └── useServerTimeOffset.js       # Reads .info/serverTimeOffset for clock correction
├── components/
│   ├── screens/
│   │   └── HomeScreen               # Landing page, game selection grid
│   ├── chat/                        # ChatPanel, ChatMessage, ChatInput
│   └── shared/                      # Avatar, AvatarPicker, Button, LoadingSpinner
├── constants/
│   └── avatars.js                   # Avatar definitions (5 SVGs in public/avatars/)
├── utils/
│   ├── roomCode.js                  # generateRoomCode, normalizeRoomCode
│   └── soundManager.js              # Web Audio API: playCorrect, playWrong, playRoundWin, bg music
├── styles/
│   ├── global.css
│   └── animations.css
└── games/
    ├── hangman/                     # See hangman.md
    │   ├── db.js
    │   ├── hooks/
    │   ├── components/{screens,game,lobby}/
    │   ├── constants/
    │   ├── data/
    │   └── utils/
    ├── spellcast/                   # See spellcast_spec.md
    │   ├── db.js
    │   ├── renderer/                # SpellcastRenderer, TileSprite (Pixi.js)
    │   ├── hooks/
    │   ├── components/{screens,game,lobby}/
    │   ├── constants/
    │   ├── data/                    # words.txt (English dictionary, ~149K words)
    │   └── utils/
    └── tron/                        # See tron.md
        ├── db.js
        ├── engine/                  # GameEngine, Player, InputManager, collisions, Phaser scene
        ├── hooks/
        ├── components/{screens,game,lobby}/
        ├── constants/
        └── utils/
```

Path alias: `@` → `src/` (configured in `vite.config.js`).

### Platform vs Game Responsibility

**Platform layer** (`src/` — shared, global):
- Room system — create, join, manage rooms (`roomCode.js`, `useRoom`)
- Firebase auth — anonymous login (`firebase/auth.js`, `useAuth`)
- Chat system — send/subscribe messages (`firebase/db.js`, `useChat`, `components/chat/`)
- Avatars — picker and display (`constants/avatars.js`, `components/shared/Avatar*`)
- Sound manager — audio effects and background music (`utils/soundManager.js`)
- Realtime sync infrastructure — room subscription, server time offset (`firebase/db.js`, `useServerTimeOffset`)

**Game layer** (`src/games/<name>/` — per game):
- Game rules and logic — state machines, scoring, turn mechanics
- Game state stored under room — reads/writes to `rooms/{roomCode}/game` in Firebase
- Game UI components — screens, game-specific widgets, game lobby
- Game-specific DB interactions — own `db.js` with game operations

Games import platform code via `@/` alias. Platform code never imports from `src/games/`.

Currently implemented: Hangman (see `hangman.md`), Spellcast (see `spellcast_spec.md`), Tron (see `tron.md`).

## Data Flow

1. **Auth**: App loads → `useAuth` auto-signs in anonymously → uid available
2. **Room creation/join**: Player creates or joins room → game-specific `db.js` writes to `rooms/{roomCode}` in Firebase RTDB
3. **Real-time sync**: `useRoom` subscribes via `onValue` to entire room node → all clients receive updates
4. **Chat**: `sendChatMessage` pushes to `rooms/{roomCode}/chat`; `subscribeToChatMessages` loads last 50

## Common APIs (`src/firebase/db.js`)

| Function | Purpose |
|---|---|
| `subscribeToRoom(roomCode, callback)` | Real-time room subscription |
| `subscribeToChatMessages(roomCode, callback)` | Real-time chat subscription (last 50) |
| `sendChatMessage(roomCode, uid, username, avatarId, text)` | Push chat message (max 200 chars) |

## Key Constraints

- **Room codes**: 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I)
- **Firebase RTDB arrays**: `playerOrder` may arrive as `{0: uid}` object — normalized to array in `useRoom`
- **Chat**: 200 char limit per message, last 50 loaded

