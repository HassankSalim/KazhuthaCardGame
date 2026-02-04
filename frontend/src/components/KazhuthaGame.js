import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card, { SuitIndicator } from './Card';

// In production (HTTPS), use the same host. In development, use localhost:8000
const IS_SECURE = window.location.protocol === 'https:';
const SERVER_URL = IS_SECURE ? window.location.host : (process.env.REACT_APP_SERVER_URL || 'localhost:8000');
const BACKEND_URL = `${IS_SECURE ? 'https' : 'http'}://${SERVER_URL}`;
const WS_URL = `${IS_SECURE ? 'wss' : 'ws'}://${SERVER_URL}`;

// Crown icon for current player
const CrownIcon = () => (
  <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
    <path d="M5 19h14v2H5z"/>
  </svg>
);

const KazhuthaGame = () => {
  const [screen, setScreen] = useState('welcome');
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const connectWebSocket = useCallback(() => {
    if (!gameId || !playerName) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);
    const ws = new WebSocket(`${WS_URL}/ws/${gameId}/${playerName}`);

    ws.onopen = () => {
      setIsConnecting(false);
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'ping':
            ws.send('pong');
            break;
          case 'connected':
          case 'player_joined':
            setGameData(data.game_state);
            if (data.type === 'player_joined' && data.player_name !== playerName) {
              setNotification(`${data.player_name} joined the game`);
            }
            break;
          case 'game_started':
            setGameData(data.game_state);
            setScreen('playing');
            setNotification('Game started!');
            break;
          case 'card_played':
          case 'game_state':
          case 'game_update':
            setGameData(data.game_state);
            break;
          case 'hand_taken':
            setGameData(data.game_state);
            if (data.player !== playerName) {
              setNotification(`${data.player} took ${data.taken_from}'s hand!`);
            }
            break;
          case 'player_disconnected':
            setGameData(data.game_state);
            setNotification(`${data.player_name} disconnected`);
            break;
          default:
            break;
        }

        if (data.game_state?.game_state === 'FINISHED') {
          setScreen('finished');
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnecting(false);
      if (screen === 'playing' || screen === 'lobby') {
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      }
    };

    ws.onerror = () => {
      setIsConnecting(false);
      setError('Connection error');
    };

    wsRef.current = ws;
  }, [gameId, playerName, screen]);

  useEffect(() => {
    if (gameId && playerName && (screen === 'lobby' || screen === 'playing')) {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket, gameId, playerName, screen]);

  const createGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: playerName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create game');
      setGameId(data.game_id);
      setScreen('lobby');
    } catch (err) {
      setError(err.message);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      setError('Please enter game code');
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: joinCode.trim().toUpperCase(),
          player_name: playerName.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to join game');
      setGameId(joinCode.trim().toUpperCase());
      setScreen('lobby');
    } catch (err) {
      setError(err.message);
    }
  };

  const startGame = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_name: playerName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to start game');
    } catch (err) {
      setError(err.message);
    }
  };

  const playCard = async (card) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_name: playerName, card }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Invalid move');
      setGameData(data.game_state);
    } catch (err) {
      setError(err.message);
    }
  };

  const takeHand = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/take-hand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_name: playerName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Cannot take hand');
      setGameData(data.game_state);
      setNotification(data.message);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetGame = () => {
    if (wsRef.current) wsRef.current.close();
    setGameId('');
    setJoinCode('');
    setGameData(null);
    setScreen('welcome');
    setError('');
    setNotification('');
  };

  const isMyTurn = gameData?.current_player === playerName;
  const myPlayer = gameData?.players?.find(p => p.name === playerName);
  const isHost = myPlayer?.is_host;

  // Sort hand by suit then by value
  const sortedHand = [...(gameData?.your_hand || [])].sort((a, b) => {
    const suitOrder = { SPADES: 0, HEARTS: 1, DIAMONDS: 2, CLUBS: 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    const rankOrder = { ACE: 14, KING: 13, QUEEN: 12, JACK: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
    return rankOrder[b.rank] - rankOrder[a.rank];
  });

  // Welcome Screen
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="game-card w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Kazhutha</h1>
            <p className="text-white/50">A classic card game</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-field"
              maxLength={20}
            />

            <button onClick={createGame} className="btn-primary w-full">
              Create New Game
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-white/40 text-sm bg-[#243d24]">or join existing</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="Enter game code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-field font-mono text-center tracking-widest"
              maxLength={6}
            />

            <button onClick={joinGame} className="btn-secondary w-full">
              Join Game
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lobby Screen
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="game-card w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Game Lobby</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-white/50">Code:</span>
              <span className="font-mono text-2xl text-emerald-400 tracking-widest">{gameId}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gameId);
                  setNotification('Copied!');
                }}
                className="p-1.5 text-white/40 hover:text-white rounded transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-white/50 text-sm mb-3">Players ({gameData?.players?.length || 1}/8)</h3>
            <div className="space-y-2">
              {(gameData?.players || [{ name: playerName, is_host: true }]).map((player) => (
                <div
                  key={player.name}
                  className={`player-card ${player.name === playerName ? 'ring-1 ring-emerald-500/50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    player.is_host ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/70'
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-medium">{player.name}</span>
                    {player.name === playerName && <span className="text-emerald-400 text-sm ml-1">(You)</span>}
                  </div>
                  {player.is_host && (
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Host</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={(gameData?.players?.length || 1) < 2}
              className={`btn-primary w-full ${(gameData?.players?.length || 1) < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {(gameData?.players?.length || 1) < 2 ? 'Waiting for players...' : 'Start Game'}
            </button>
          ) : (
            <div className="text-center text-white/40 py-4">
              Waiting for host to start...
            </div>
          )}

          <button onClick={resetGame} className="w-full mt-4 text-white/40 hover:text-white/70 text-sm transition-colors">
            Leave Lobby
          </button>

          {notification && (
            <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm text-center">
              {notification}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Playing/Finished Screen
  return (
    <div className="min-h-screen flex flex-col p-4 max-w-5xl mx-auto">
      {/* Game Over Modal */}
      {screen === 'finished' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="game-card p-8 text-center max-w-md w-full">
            <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
            {gameData?.kazhutha === playerName ? (
              <div className="mb-6">
                <div className="text-6xl mb-4">😵</div>
                <p className="text-xl text-red-400">You are the Kazhutha!</p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-xl text-emerald-400">You won!</p>
                <p className="text-white/50 mt-2">{gameData?.kazhutha} is the Kazhutha</p>
              </div>
            )}
            <button onClick={resetGame} className="btn-primary">
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Player Bar */}
      <div className="game-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Players */}
          <div className="flex flex-wrap gap-3 flex-1">
            {gameData?.players?.map((player) => {
              const isCurrentPlayer = player.name === gameData.current_player;
              const isYou = player.name === playerName;

              return (
                <div key={player.name} className="relative pt-1 pb-2">
                  {/* Crown for host - top left */}
                  {player.is_host && (
                    <div className="absolute -top-1 -left-1 z-10">
                      <CrownIcon />
                    </div>
                  )}

                  <div className={`player-card ${isCurrentPlayer ? 'player-card-active' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      player.is_winner ? 'bg-amber-500/30 text-amber-400' :
                      player.is_kazhutha ? 'bg-red-500/30 text-red-400' :
                      isYou ? 'bg-emerald-500/30 text-emerald-400' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">
                        {player.name}
                        {isYou && <span className="text-emerald-400"> (You)</span>}
                      </div>
                      <div className="text-white/50 text-xs">
                        {player.is_winner ? 'Won!' : player.is_kazhutha ? 'Kazhutha!' : `${player.card_count} cards`}
                      </div>
                    </div>
                  </div>

                  {/* Turn indicator dot - centered below card */}
                  {isCurrentPlayer && (
                    <div className="absolute -bottom-1 inset-x-0 flex justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Suit */}
          <SuitIndicator suit={gameData?.current_suit} />
        </div>
      </div>

      {/* Take Hand Button (Special Rule) */}
      {gameData?.can_take_from_left && !gameData?.round_in_progress && (
        <div className="game-card p-3 mb-4 flex items-center justify-between">
          <span className="text-white/70 text-sm">Special Rule: Take cards from player on your left</span>
          <button onClick={takeHand} className="btn-warning text-sm">
            Take {gameData.can_take_from_left}'s Hand
          </button>
        </div>
      )}

      {/* Play Area */}
      <div className="play-area p-4 sm:p-6 mb-4 min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center">
        {gameData?.current_pile?.length > 0 ? (
          <div className="flex flex-wrap gap-3 justify-center items-end">
            {gameData.current_pile.map((play, index) => (
              <div key={index} className="flex flex-col items-center">
                <Card card={play.card} small />
                <span className="text-white/60 text-[10px] sm:text-xs mt-1">{play.player}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white/30 text-sm">
            {isMyTurn ? 'Your turn - play a card' : `Waiting for ${gameData?.current_player}...`}
          </div>
        )}
      </div>

      {/* Your Hand */}
      <div className="game-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Your Hand</h3>
          <span className="text-white/50 text-sm">{sortedHand.length} cards</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-start">
          {sortedHand.map((card, idx) => (
            <Card
              key={`${card.suit}-${card.rank}-${idx}`}
              card={card}
              onClick={() => playCard(card)}
              disabled={!isMyTurn}
            />
          ))}
          {sortedHand.length === 0 && (
            <div className="text-white/40 py-8 w-full text-center">
              {myPlayer?.is_winner ? "You've won!" : "No cards"}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg text-sm">
            {notification}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg text-sm">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default KazhuthaGame;
