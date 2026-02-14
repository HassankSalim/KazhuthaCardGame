# Kazhutha Card Game

A classic multiplayer card game where the goal is to get rid of all your cards. The last player with cards is the Kazhutha (loser)!

## Rules

### Basic Gameplay
- Uses a standard 52-card deck (no jokers)
- Cards are dealt evenly to all players
- The player with the Ace of Spades starts by playing it
- Play proceeds clockwise

### Following Suit
- Players must play a card of the suit that was led if they have one
- If all players play the same suit, the cards are discarded and the highest card wins the right to lead next
- If a player cannot follow suit, they play any card and the round ends immediately

### Breaking Suit
- When a player cannot follow suit and plays a different suit, the player with the highest card of the original suit must pick up all the cards
- That player then leads the next round

### Winning
- Get rid of all your cards to win
- The last player with cards is the Kazhutha (loser)

### Special Rule: Taking Hands
- Between rounds (not during a round), a player may take the entire hand of the player on their left
- The player whose hand was taken immediately becomes a winner
- A player may take hands from multiple players on their left

## Running the Game

### Backend (Python/FastAPI)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The server runs on `http://localhost:8000`

### Frontend (React)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm start
```

The frontend runs on `http://localhost:3000`

### Environment Variables

Frontend:
- `REACT_APP_SERVER_URL`: Backend server URL (default: `localhost:8000`)

## Project Structure

```
Kazhutha/
├── main.py              # FastAPI backend server
├── requirements.txt     # Python dependencies
├── Dockerfile           # Multi-stage Docker build (Node.js + Python)
├── render.yaml          # Render.com deployment config
├── .dockerignore
├── .gitignore
├── README.md
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js
        └── components/
            ├── KazhuthaGame.js
            └── Card.js
```

## API Endpoints

### REST
- `POST /api/game/create` - Create a new game
- `POST /api/game/join` - Join an existing game (also handles reconnection)
- `POST /api/game/start` - Start the game (host only)
- `POST /api/game/play` - Play a card
- `POST /api/game/take-hand` - Take hand from player on left
- `POST /api/game/play-again` - Reset game back to lobby (host only, after game ends)
- `GET /api/game/{game_id}` - Get game state
- `GET /api/healthz` - Health check

### WebSocket
- `WS /ws/{game_id}/{player_name}` - Real-time game updates

#### Message Types (Server → Client)
| Type | Description |
|------|-------------|
| `connected` | Initial connection established |
| `player_joined` | A player joined the lobby |
| `player_reconnected` | A disconnected player reconnected |
| `player_disconnected` | A player disconnected during game |
| `game_started` | Game has started, cards dealt |
| `card_played` | A player played a card |
| `hand_taken` | A player took another player's hand |
| `game_reset` | Game reset to lobby (play again) |
| `host_left` | Host left the game |
| `ping` | Keep-alive ping (client responds with `"pong"`) |

## Deployment

### Build Frontend
```bash
cd frontend
npm run build
```

The backend will automatically serve the built frontend from `frontend/build/`.

### Production
Set appropriate CORS origins in `main.py` for production use.
