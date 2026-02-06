from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Dict, List, Optional
from pydantic import BaseModel
import uuid
import asyncio
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import random
import os

# Data Models
class Suit(str, Enum):
    HEARTS = "HEARTS"
    DIAMONDS = "DIAMONDS"
    CLUBS = "CLUBS"
    SPADES = "SPADES"

class Rank(str, Enum):
    ACE = "ACE"
    KING = "KING"
    QUEEN = "QUEEN"
    JACK = "JACK"
    TEN = "10"
    NINE = "9"
    EIGHT = "8"
    SEVEN = "7"
    SIX = "6"
    FIVE = "5"
    FOUR = "4"
    THREE = "3"
    TWO = "2"

@dataclass
class Card:
    suit: Suit
    rank: Rank

    def __eq__(self, other):
        if not isinstance(other, Card):
            return False
        return self.suit == other.suit and self.rank == other.rank

    def __hash__(self):
        return hash((self.suit, self.rank))

    @property
    def value(self) -> int:
        rank_values = {
            Rank.ACE: 14, Rank.KING: 13, Rank.QUEEN: 12, Rank.JACK: 11,
            Rank.TEN: 10, Rank.NINE: 9, Rank.EIGHT: 8, Rank.SEVEN: 7,
            Rank.SIX: 6, Rank.FIVE: 5, Rank.FOUR: 4, Rank.THREE: 3, Rank.TWO: 2
        }
        return rank_values[self.rank]

    def to_dict(self):
        return {'suit': self.suit.value, 'rank': self.rank.value}

# Request/Response Models
class CreateGameRequest(BaseModel):
    player_name: str

class JoinGameRequest(BaseModel):
    game_id: str
    player_name: str

class StartGameRequest(BaseModel):
    game_id: str
    player_name: str

class PlayCardRequest(BaseModel):
    game_id: str
    player_name: str
    card: dict

class TakeHandRequest(BaseModel):
    game_id: str
    player_name: str

class PlayAgainRequest(BaseModel):
    game_id: str
    player_name: str

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, dict]] = {}
        self.ping_tasks: Dict[str, asyncio.Task] = {}
        self.cleanup_task: Optional[asyncio.Task] = None
        self.PING_INTERVAL = 30
        self.CONNECTION_TIMEOUT = 60

    async def connect(self, websocket: WebSocket, game_id: str, player_name: str):
        try:
            await websocket.accept()

            if game_id not in self.active_connections:
                self.active_connections[game_id] = {}

            self.active_connections[game_id][player_name] = {
                'websocket': websocket,
                'last_seen': datetime.now(),
                'connected': True
            }

            task_key = f"{game_id}_{player_name}"
            self.ping_tasks[task_key] = asyncio.create_task(
                self._keep_alive(game_id, player_name)
            )

        except Exception as e:
            print(f"Error in connect: {str(e)}")
            await self._handle_disconnect(game_id, player_name)

    async def disconnect(self, game_id: str, player_name: str):
        await self._handle_disconnect(game_id, player_name)

    async def _handle_disconnect(self, game_id: str, player_name: str):
        task_key = f"{game_id}_{player_name}"
        if task_key in self.ping_tasks:
            self.ping_tasks[task_key].cancel()
            del self.ping_tasks[task_key]

        if game_id in self.active_connections:
            if player_name in self.active_connections[game_id]:
                conn_info = self.active_connections[game_id][player_name]
                if 'websocket' in conn_info:
                    try:
                        await conn_info['websocket'].close()
                    except Exception:
                        pass
                del self.active_connections[game_id][player_name]

            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def broadcast_to_game(self, game_id: str, message: dict):
        if game_id not in self.active_connections:
            return

        game = games.get(game_id)
        if not game:
            return

        disconnected_players = []
        for player_name, conn_info in list(self.active_connections[game_id].items()):
            try:
                if conn_info['connected']:
                    player_message = message.copy()
                    if 'game_state' in player_message:
                        player_message['game_state'] = game.get_state(player_name)

                    await conn_info['websocket'].send_json(player_message)
                    conn_info['last_seen'] = datetime.now()
            except Exception:
                disconnected_players.append(player_name)

        for player_name in disconnected_players:
            await self._handle_disconnect(game_id, player_name)

    async def _keep_alive(self, game_id: str, player_name: str):
        try:
            while True:
                if (game_id in self.active_connections and
                    player_name in self.active_connections[game_id]):
                    conn_info = self.active_connections[game_id][player_name]
                    try:
                        await conn_info['websocket'].send_json({"type": "ping"})
                        conn_info['last_seen'] = datetime.now()
                    except Exception:
                        await self._handle_disconnect(game_id, player_name)
                        break
                else:
                    break
                await asyncio.sleep(self.PING_INTERVAL)
        except asyncio.CancelledError:
            pass

# Game Logic
class GameSession:
    def __init__(self, game_id: str, host_name: str):
        self.game_id = game_id
        self.players: Dict[str, List[Card]] = {host_name: []}
        self.player_order: List[str] = [host_name]
        self.active_players: List[str] = []  # Players still in the game
        self.current_player_idx = 0
        self.current_pile: List[tuple] = []
        self.current_suit: Optional[Suit] = None
        self.original_suit: Optional[Suit] = None
        self.game_started = False
        self.finished = False
        self.kazhutha = None  # The loser (last one with cards)
        self.winners: List[str] = []  # Players who have won (in order)
        self.host_name = host_name
        self.discarded_cards: List[Card] = []
        self.round_in_progress = False
        self.last_action: Optional[str] = None  # For UI feedback
        self.game_first_card_played = False
        self.resolved_pile: List[tuple] = []  # Store last resolved pile for display
        self.resolved_winner: Optional[str] = None  # Who won the last round
        self.suit_was_broken: bool = False  # Whether suit was broken in last round
        self.taken_hand_cards: List[Card] = []  # Cards taken in take hand action
        self.taken_hand_from: Optional[str] = None  # Who the cards were taken from
        self.taken_hand_by: Optional[str] = None  # Who took the cards
        self.original_players: List[str] = []  # Players present when game started
        self.connected_players: set = set()  # Currently connected players
        self.waiting_for_player: Optional[str] = None  # Disconnected player whose turn it is

    def add_player(self, player_name: str) -> bool:
        if player_name in self.players or self.game_started:
            return False
        if len(self.players) >= 8:  # Max 8 players
            return False
        self.players[player_name] = []
        self.player_order.append(player_name)
        return True

    def remove_player(self, player_name: str):
        if player_name not in self.players:
            return

        if not self.game_started:
            # In lobby: remove completely
            del self.players[player_name]
            self.player_order.remove(player_name)
        else:
            # During game: mark disconnected but PRESERVE cards
            self.connected_players.discard(player_name)
            # If it's their turn, set waiting state
            if player_name == self.current_player and player_name in self.active_players:
                self.waiting_for_player = player_name

    def can_rejoin(self, player_name: str) -> tuple:
        """Check if a player can rejoin an in-progress game"""
        if not self.game_started:
            return (False, "Game not started - use normal join")
        if self.finished:
            return (False, "Game is finished")
        if player_name not in self.original_players:
            return (False, "You were not part of this game")
        if player_name in self.connected_players:
            return (False, "Player with this name is already connected")
        return (True, "OK")

    def player_reconnected(self, player_name: str):
        """Handle a player reconnecting to the game"""
        self.connected_players.add(player_name)

        # If they have cards and aren't in active_players, restore them
        if player_name in self.players and len(self.players[player_name]) > 0:
            if player_name not in self.active_players:
                # Insert at correct position based on original order
                original_idx = self.player_order.index(player_name)
                insert_idx = 0
                for i, p in enumerate(self.active_players):
                    if self.player_order.index(p) > original_idx:
                        break
                    insert_idx = i + 1
                self.active_players.insert(insert_idx, player_name)

        # Clear waiting state if we were waiting for this player
        if self.waiting_for_player == player_name:
            self.current_player_idx = self.active_players.index(player_name)
            self.waiting_for_player = None

    def reset_game(self):
        """Reset game state back to lobby, keeping players and host."""
        # Reset player hands to empty
        for name in list(self.players.keys()):
            self.players[name] = []
        # Reset all game state
        self.active_players = []
        self.current_player_idx = 0
        self.current_pile = []
        self.current_suit = None
        self.original_suit = None
        self.game_started = False
        self.finished = False
        self.kazhutha = None
        self.winners = []
        self.discarded_cards = []
        self.round_in_progress = False
        self.last_action = None
        self.game_first_card_played = False
        self.resolved_pile = []
        self.resolved_winner = None
        self.suit_was_broken = False
        self.taken_hand_cards = []
        self.taken_hand_from = None
        self.taken_hand_by = None
        self.original_players = []
        self.waiting_for_player = None

    def start_game(self):
        if len(self.players) < 2:
            raise ValueError("Need at least 2 players")

        # Create and deal deck
        deck = self._create_deck()

        # Deal cards as evenly as possible
        player_names = list(self.players.keys())
        for i, card in enumerate(deck):
            player_idx = i % len(player_names)
            self.players[player_names[player_idx]].append(card)

        # Sort each player's hand
        for player_name in self.players:
            self.players[player_name].sort(key=lambda c: (c.suit.value, -c.value))

        # Initialize active players
        self.active_players = list(self.player_order)

        # Find player with Ace of Spades
        ace_of_spades = Card(Suit.SPADES, Rank.ACE)
        for i, player_name in enumerate(self.player_order):
            if ace_of_spades in self.players[player_name]:
                self.current_player_idx = i
                break

        self.game_started = True
        self.game_first_card_played = False
        self.original_players = list(self.player_order)
        self.connected_players = set(self.player_order)

    def _create_deck(self) -> List[Card]:
        deck = []
        for suit in Suit:
            for rank in Rank:
                deck.append(Card(suit, rank))

        for _ in range(7):
            random.shuffle(deck)

        return deck

    def get_player_on_left(self, player_name: str) -> Optional[str]:
        """Get the player sitting to the left (next in order) who is still active"""
        if player_name not in self.active_players:
            return None

        idx = self.active_players.index(player_name)
        next_idx = (idx + 1) % len(self.active_players)
        left_player = self.active_players[next_idx]

        # Can't take from yourself
        if left_player == player_name:
            return None

        return left_player

    def take_hand_from_left(self, player_name: str) -> tuple:
        """
        Special Rule: A player can take the entire hand from the player on their left.
        Can only be done on your turn.
        Returns (success, message, taken_from_player)
        """
        if not self.game_started or self.finished:
            return (False, "Game not in progress", None)

        if self.round_in_progress and len(self.current_pile) > 0:
            return (False, "Cannot take hand during a round", None)

        if player_name not in self.active_players:
            return (False, "You are not an active player", None)

        # Can only take hand on your turn
        if player_name != self.current_player:
            return (False, "You can only take hand on your turn", None)

        left_player = self.get_player_on_left(player_name)
        if not left_player:
            return (False, "No player to take from", None)

        if len(self.players[left_player]) == 0:
            return (False, "That player has no cards", None)

        # Take all cards from the left player
        taken_cards = list(self.players[left_player])  # Make a copy for display
        self.players[player_name].extend(taken_cards)
        self.players[left_player] = []

        # Store taken cards info for display to all players
        self.taken_hand_cards = taken_cards
        self.taken_hand_from = left_player
        self.taken_hand_by = player_name

        # Sort the combined hand
        self.players[player_name].sort(key=lambda c: (c.suit.value, -c.value))

        # The left player becomes a winner (they got rid of all their cards)
        self.winners.append(left_player)
        self.active_players.remove(left_player)

        # Check if game is over (only one player left)
        self._check_game_over()

        # The player who took the hand continues playing (they're still current player)
        # Just need to update the index since active_players changed
        if player_name in self.active_players:
            self.current_player_idx = self.active_players.index(player_name)

        # Clear resolved pile since this is a new action
        self.resolved_pile = []
        self.resolved_winner = None

        self.last_action = f"{player_name} took {left_player}'s hand!"

        return (True, f"Took {len(taken_cards)} cards from {left_player}", left_player)

    def play_card(self, player_name: str, card_dict: dict) -> tuple:
        """Returns (success, error_message)"""
        if not self.game_started or self.finished:
            return (False, "Game not in progress")

        if player_name != self.current_player:
            return (False, "Not your turn")

        if player_name not in self.active_players:
            return (False, "You are not an active player")

        card = Card(Suit(card_dict['suit']), Rank(card_dict['rank']))
        player_hand = self.players[player_name]

        if card not in player_hand:
            return (False, "Card not in your hand")

        # First card of the game must be Ace of Spades
        if not self.game_first_card_played:
            if card.suit != Suit.SPADES or card.rank != Rank.ACE:
                return (False, "First card must be Ace of Spades")
            self.game_first_card_played = True

        # Starting a new round
        if not self.current_pile:
            self.original_suit = card.suit
            self.current_suit = card.suit
            self.round_in_progress = True
            # Clear resolved pile from previous round when new round starts
            self.resolved_pile = []
            self.resolved_winner = None
            # Clear taken hand info
            self.taken_hand_cards = []
            self.taken_hand_from = None
            self.taken_hand_by = None

        # Must follow suit if possible
        if self.current_suit:
            has_suit = any(c.suit == self.current_suit for c in player_hand)
            if has_suit and card.suit != self.current_suit:
                return (False, f"You must play a {self.current_suit.value}")

        # Play the card
        player_hand.remove(card)
        self.current_pile.append((player_name, card))
        self.last_action = f"{player_name} played {card.rank.value} of {card.suit.value}"

        # Check if a different suit was played (breaking suit)
        if card.suit != self.original_suit:
            self._resolve_round(suit_broken=True)
        else:
            # Check if round is complete (all active players have played)
            players_who_played = set(p for p, _ in self.current_pile)
            if len(players_who_played) == len(self.active_players):
                self._resolve_round(suit_broken=False)
            else:
                self._advance_to_next_active_player()

        return (True, None)

    def _resolve_round(self, suit_broken: bool):
        if not self.current_pile:
            return

        # Find highest card of original suit
        original_suit_cards = [(pname, card) for pname, card in self.current_pile
                               if card.suit == self.original_suit]

        winning_play = max(original_suit_cards, key=lambda x: x[1].value)
        winning_player = winning_play[0]

        # Store the resolved pile for display before clearing
        self.resolved_pile = list(self.current_pile)
        self.resolved_winner = winning_player
        self.suit_was_broken = suit_broken

        if suit_broken:
            # Give all cards to the player with highest card of original suit
            for _, card in self.current_pile:
                self.players[winning_player].append(card)
            self.players[winning_player].sort(key=lambda c: (c.suit.value, -c.value))
            self.last_action = f"{winning_player} picks up the pile!"
        else:
            # All same suit - discard the cards
            for _, card in self.current_pile:
                self.discarded_cards.append(card)
            self.last_action = f"Cards discarded - {winning_player} leads next!"

        # Clear the round
        self.current_pile = []
        self.current_suit = None
        self.original_suit = None
        self.round_in_progress = False

        # Check for players who have emptied their hands
        self._check_for_winners()

        # Set the winning player as next to play (if they're still active)
        if winning_player in self.active_players:
            self.current_player_idx = self.active_players.index(winning_player)
        else:
            # Winner has no cards left - next player starts
            # Find the position where winner was
            winner_original_idx = self.player_order.index(winning_player)
            # Find next active player clockwise
            for i in range(1, len(self.player_order)):
                next_idx = (winner_original_idx + i) % len(self.player_order)
                next_player = self.player_order[next_idx]
                if next_player in self.active_players:
                    self.current_player_idx = self.active_players.index(next_player)
                    break

        self._check_game_over()

    def _check_for_winners(self):
        """Check if any player has emptied their hand and mark them as winner"""
        for player_name in list(self.active_players):
            if len(self.players[player_name]) == 0 and player_name not in self.winners:
                self.winners.append(player_name)
                self.active_players.remove(player_name)

    def _check_game_over(self):
        """Check if only one player remains with cards"""
        players_with_cards = [p for p in self.active_players if len(self.players[p]) > 0]

        if len(players_with_cards) == 1:
            self.finished = True
            self.kazhutha = players_with_cards[0]
            self.last_action = f"{self.kazhutha} is the Kazhutha!"
        elif len(players_with_cards) == 0:
            # Everyone got rid of cards simultaneously (rare)
            self.finished = True

    def _advance_to_next_active_player(self):
        """Move to the next active player"""
        if not self.active_players:
            return

        current_player = self.current_player
        if current_player in self.active_players:
            current_idx = self.active_players.index(current_player)
            self.current_player_idx = (current_idx + 1) % len(self.active_players)
        else:
            self.current_player_idx = 0

    @property
    def current_player(self) -> str:
        if not self.active_players:
            return self.player_order[0]
        return self.active_players[self.current_player_idx % len(self.active_players)]

    def get_state(self, player_name: Optional[str] = None) -> dict:
        """Get the current game state for a specific player"""

        # Determine who can take hand from left (only on your turn)
        can_take_from_left = None
        if (player_name and
            player_name in self.active_players and
            player_name == self.current_player and  # Only on your turn
            self.game_started and
            not self.finished and
            not self.round_in_progress):
            left_player = self.get_player_on_left(player_name)
            if left_player and len(self.players.get(left_player, [])) > 0:
                can_take_from_left = left_player

        state = {
            'game_id': self.game_id,
            'players': [
                {
                    'name': name,
                    'card_count': len(cards),
                    'is_host': name == self.host_name,
                    'is_active': name in self.active_players,
                    'is_winner': name in self.winners,
                    'is_kazhutha': name == self.kazhutha,
                    'is_connected': name in self.connected_players
                }
                for name, cards in self.players.items()
            ],
            'player_order': self.player_order,
            'active_players': self.active_players,
            'current_player': self.current_player if self.active_players else None,
            'current_suit': self.current_suit.value if self.current_suit else None,
            'current_pile': [
                {'player': pname, 'card': card.to_dict()}
                for pname, card in self.current_pile
            ],
            'game_state': 'FINISHED' if self.finished else 'PLAYING' if self.game_started else 'WAITING',
            'kazhutha': self.kazhutha,
            'winners': self.winners,
            'last_action': self.last_action,
            'can_take_from_left': can_take_from_left,
            'round_in_progress': self.round_in_progress,
            'discarded_count': len(self.discarded_cards),
            'resolved_pile': [
                {'player': pname, 'card': card.to_dict()}
                for pname, card in self.resolved_pile
            ],
            'resolved_winner': self.resolved_winner,
            'suit_was_broken': self.suit_was_broken,
            'taken_hand_cards': [card.to_dict() for card in self.taken_hand_cards],
            'taken_hand_from': self.taken_hand_from,
            'taken_hand_by': self.taken_hand_by,
            'waiting_for_player': self.waiting_for_player
        }

        if player_name and player_name in self.players:
            state['your_hand'] = [card.to_dict() for card in self.players[player_name]]

        return state

# FastAPI App
app = FastAPI(title="Kazhutha Card Game Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Game state storage
games: Dict[str, GameSession] = {}
manager = ConnectionManager()

# REST Endpoints
@app.post("/api/game/create")
async def create_game(request: CreateGameRequest):
    if not request.player_name or len(request.player_name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Player name required")

    game_id = str(uuid.uuid4())[:6].upper()
    games[game_id] = GameSession(game_id, request.player_name.strip())
    return {"game_id": game_id, "player_name": request.player_name.strip()}

@app.post("/api/game/join")
async def join_game(request: JoinGameRequest):
    game_id = request.game_id.upper().strip()
    player_name = request.player_name.strip()

    if not player_name:
        raise HTTPException(status_code=400, detail="Player name required")

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]

    # Check if this is a rejoin attempt for an in-progress game
    if game.game_started:
        can_rejoin, message = game.can_rejoin(player_name)
        if can_rejoin:
            game.player_reconnected(player_name)
            await manager.broadcast_to_game(game_id, {
                "type": "player_reconnected",
                "player_name": player_name,
                "game_state": game.get_state()
            })
            return {"success": True, "game_id": game_id, "rejoined": True}
        else:
            raise HTTPException(status_code=400, detail=message)

    # Original logic for lobby joins
    if not game.add_player(player_name):
        raise HTTPException(status_code=400, detail="Cannot join game - name taken or game started")

    await manager.broadcast_to_game(game_id, {
        "type": "player_joined",
        "player_name": player_name,
        "game_state": game.get_state()
    })

    return {"success": True, "game_id": game_id}

@app.post("/api/game/start")
async def start_game(request: StartGameRequest):
    game_id = request.game_id.upper().strip()

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]
    if game.host_name != request.player_name:
        raise HTTPException(status_code=403, detail="Only host can start game")

    try:
        game.start_game()
        await manager.broadcast_to_game(game_id, {
            "type": "game_started",
            "game_state": game.get_state()
        })
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/game/play-again")
async def play_again(request: PlayAgainRequest):
    game_id = request.game_id.upper().strip()

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]
    if not game.finished:
        raise HTTPException(status_code=400, detail="Game is not finished")
    if game.host_name != request.player_name:
        raise HTTPException(status_code=403, detail="Only host can start play again")

    game.reset_game()
    await manager.broadcast_to_game(game_id, {
        "type": "game_reset",
        "game_state": game.get_state()
    })
    return {"success": True}

@app.post("/api/game/play")
async def play_card(request: PlayCardRequest):
    game_id = request.game_id.upper().strip()

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]
    success, error = game.play_card(request.player_name, request.card)

    if success:
        await manager.broadcast_to_game(game_id, {
            "type": "card_played",
            "player": request.player_name,
            "card": request.card,
            "game_state": game.get_state()
        })
        return {"success": True, "game_state": game.get_state(request.player_name)}

    raise HTTPException(status_code=400, detail=error)

@app.post("/api/game/take-hand")
async def take_hand(request: TakeHandRequest):
    game_id = request.game_id.upper().strip()

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]
    success, message, taken_from = game.take_hand_from_left(request.player_name)

    if success:
        await manager.broadcast_to_game(game_id, {
            "type": "hand_taken",
            "player": request.player_name,
            "taken_from": taken_from,
            "game_state": game.get_state()
        })
        return {"success": True, "message": message, "game_state": game.get_state(request.player_name)}

    raise HTTPException(status_code=400, detail=message)

@app.get("/api/game/{game_id}")
async def get_game_state(game_id: str, player_name: str = None):
    game_id = game_id.upper().strip()

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    return games[game_id].get_state(player_name)

@app.get("/api/healthz")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# WebSocket endpoint
@app.websocket("/ws/{game_id}/{player_name}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_name: str):
    game_id = game_id.upper().strip()

    await manager.connect(websocket, game_id, player_name)

    # Send initial state if game exists
    if game_id in games:
        game = games[game_id]

        # Mark player as connected if they're part of the game
        if game.game_started and player_name in game.original_players:
            game.player_reconnected(player_name)
            # Notify others that player reconnected
            await manager.broadcast_to_game(game_id, {
                "type": "player_reconnected",
                "player_name": player_name,
                "game_state": game.get_state()
            })

        await websocket.send_json({
            "type": "connected",
            "game_state": game.get_state(player_name)
        })

    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=manager.CONNECTION_TIMEOUT
                )

                if data == "pong":
                    if (game_id in manager.active_connections and
                        player_name in manager.active_connections[game_id]):
                        manager.active_connections[game_id][player_name]['last_seen'] = datetime.now()

            except asyncio.TimeoutError:
                await manager.disconnect(game_id, player_name)
                break

    except (WebSocketDisconnect, RuntimeError):
        await manager.disconnect(game_id, player_name)
        if game_id in games:
            game = games[game_id]
            game.remove_player(player_name)

            # If host leaves while in lobby or game is finished, notify everyone to go back to welcome
            if player_name == game.host_name and (not game.game_started or game.finished):
                await manager.broadcast_to_game(game_id, {
                    "type": "host_left",
                    "player_name": player_name
                })
            else:
                await manager.broadcast_to_game(game_id, {
                    "type": "player_disconnected",
                    "player_name": player_name,
                    "game_state": game.get_state()
                })

# Serve static files (React build)
static_dir = os.path.join(os.path.dirname(__file__), "frontend", "build")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=os.path.join(static_dir, "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
