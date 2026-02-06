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
  const [displayedPile, setDisplayedPile] = useState(null); // For showing resolved pile
  const [resolvedInfo, setResolvedInfo] = useState(null); // Winner info for resolved pile
  const [takenHandDisplay, setTakenHandDisplay] = useState(null); // For showing taken hand cards
  const [draggedCard, setDraggedCard] = useState(null); // Card being dragged
  const [isDragOver, setIsDragOver] = useState(false); // Whether dragging over drop zone
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const resolvedPileTimeoutRef = useRef(null);
  const takenHandTimeoutRef = useRef(null);

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

  // Handle displaying resolved pile with timeout
  useEffect(() => {
    // Clear any existing timeout
    if (resolvedPileTimeoutRef.current) {
      clearTimeout(resolvedPileTimeoutRef.current);
    }

    // If there's a current pile, show it immediately
    if (gameData?.current_pile?.length > 0) {
      setDisplayedPile(gameData.current_pile);
      setResolvedInfo(null);
      return;
    }

    // If round just ended and there's a resolved pile, show it for a timeout
    if (gameData?.resolved_pile?.length > 0 && !gameData?.current_pile?.length) {
      setDisplayedPile(gameData.resolved_pile);
      setResolvedInfo({
        winner: gameData.resolved_winner,
        suitBroken: gameData.suit_was_broken
      });

      // Clear the displayed pile after 6 seconds
      resolvedPileTimeoutRef.current = setTimeout(() => {
        setDisplayedPile(null);
        setResolvedInfo(null);
      }, 3000);
    } else if (!gameData?.resolved_pile?.length) {
      // No resolved pile, clear display
      setDisplayedPile(null);
      setResolvedInfo(null);
    }

    return () => {
      if (resolvedPileTimeoutRef.current) {
        clearTimeout(resolvedPileTimeoutRef.current);
      }
    };
  }, [gameData?.current_pile, gameData?.resolved_pile, gameData?.resolved_winner, gameData?.suit_was_broken]);

  // Handle displaying taken hand cards with timeout (fallback for state restoration)
  useEffect(() => {
    // Only update display when there are new taken hand cards
    // Don't clear immediately when backend clears - let the timeout handle it
    if (gameData?.taken_hand_cards?.length > 0) {
      // Clear any existing timeout
      if (takenHandTimeoutRef.current) {
        clearTimeout(takenHandTimeoutRef.current);
      }

      setTakenHandDisplay({
        cards: gameData.taken_hand_cards,
        from: gameData.taken_hand_from,
        by: gameData.taken_hand_by
      });

      // Clear the display after 6 seconds
      takenHandTimeoutRef.current = setTimeout(() => {
        setTakenHandDisplay(null);
      }, 6000);
    }

    return () => {
      if (takenHandTimeoutRef.current) {
        clearTimeout(takenHandTimeoutRef.current);
      }
    };
  }, [gameData?.taken_hand_cards, gameData?.taken_hand_from, gameData?.taken_hand_by]);

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
            // Directly set takenHandDisplay from the event data
            if (data.game_state?.taken_hand_cards?.length > 0) {
              if (takenHandTimeoutRef.current) {
                clearTimeout(takenHandTimeoutRef.current);
              }
              setTakenHandDisplay({
                cards: data.game_state.taken_hand_cards,
                from: data.game_state.taken_hand_from,
                by: data.game_state.taken_hand_by
              });
              takenHandTimeoutRef.current = setTimeout(() => {
                setTakenHandDisplay(null);
              }, 6000);
            }
            if (data.player !== playerName) {
              setNotification(`${data.player} took ${data.taken_from}'s hand!`);
            }
            break;
          case 'player_disconnected':
            setGameData(data.game_state);
            setNotification(`${data.player_name} disconnected`);
            break;
          case 'player_reconnected':
            setGameData(data.game_state);
            if (data.player_name !== playerName) {
              setNotification(`${data.player_name} reconnected!`);
            }
            break;
          case 'game_reset':
            setGameData(data.game_state);
            setDisplayedPile(null);
            setResolvedInfo(null);
            setTakenHandDisplay(null);
            setScreen('lobby');
            setNotification('Back to lobby!');
            break;
          case 'host_left':
            resetGame();
            setNotification('Host has left the game');
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
      if (data.rejoined) {
        setScreen('playing');
        setNotification('Reconnected to game!');
      } else {
        setScreen('lobby');
      }
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
    if (resolvedPileTimeoutRef.current) clearTimeout(resolvedPileTimeoutRef.current);
    if (takenHandTimeoutRef.current) clearTimeout(takenHandTimeoutRef.current);
    setGameId('');
    setJoinCode('');
    setGameData(null);
    setDisplayedPile(null);
    setResolvedInfo(null);
    setTakenHandDisplay(null);
    setScreen('welcome');
    setError('');
    setNotification('');
  };

  const playAgain = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/play-again`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, player_name: playerName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to restart game');
    } catch (err) {
      setError(err.message);
    }
  };

  const isMyTurn = gameData?.current_player === playerName;
  const myPlayer = gameData?.players?.find(p => p.name === playerName);
  const isHost = myPlayer?.is_host;

  // Sort hand by suit then by value
  const sortedHand = [...(gameData?.your_hand || [])].sort((a, b) => {
    const suitOrder = { SPADES: 0, HEARTS: 1, CLUBS: 2, DIAMONDS: 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    const rankOrder = { ACE: 14, KING: 13, QUEEN: 12, JACK: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
    return rankOrder[b.rank] - rankOrder[a.rank];
  });

  // Welcome Screen
  if (screen === 'welcome') {
    const hasGameCode = joinCode.trim().length > 0;
    const hasName = playerName.trim().length > 0;

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

            <input
              type="text"
              placeholder="Enter game code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-field"
              maxLength={6}
            />

            <div className="flex gap-3">
              <button
                onClick={createGame}
                disabled={!hasName || hasGameCode}
                className={`btn-primary flex-1 ${(!hasName || hasGameCode) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Create Game
              </button>
              <button
                onClick={joinGame}
                disabled={!hasName || !hasGameCode}
                className={`btn-secondary flex-1 ${(!hasName || !hasGameCode) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Join Game
              </button>
            </div>
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
      {/* Game Code Badge - Top Right */}
      <div className="fixed top-4 right-4 z-40">
        <div className="game-card px-3 py-2 flex items-center gap-2">
          <span className="text-white/50 text-xs">Code:</span>
          <span className="font-mono text-sm text-emerald-400 tracking-wider">{gameId}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(gameId);
              setNotification('Game code copied!');
            }}
            className="p-1 text-white/40 hover:text-white rounded transition-colors"
            title="Copy game code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

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
            {isHost ? (
              <div className="space-y-3">
                <button onClick={playAgain} className="btn-primary w-full">
                  Play Again
                </button>
                <button onClick={resetGame} className="w-full text-white/40 hover:text-white/70 text-sm transition-colors">
                  Leave Game
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-white/40 py-2 text-sm">
                  Waiting for host to play again...
                </div>
                <button onClick={resetGame} className="w-full text-white/40 hover:text-white/70 text-sm transition-colors">
                  Leave Game
                </button>
              </div>
            )}
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
              const isDisconnected = !player.is_connected && gameData?.game_state === 'PLAYING';

              return (
                <div key={player.name} className="relative pt-1 pb-2">
                  {/* Crown for host - top left */}
                  {player.is_host && (
                    <div className="absolute -top-1 -left-1 z-10">
                      <CrownIcon />
                    </div>
                  )}

                  <div className={`player-card ${isCurrentPlayer ? 'player-card-active' : ''} ${isDisconnected ? 'opacity-50' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      player.is_winner ? 'bg-amber-500/30 text-amber-400' :
                      player.is_kazhutha ? 'bg-red-500/30 text-red-400' :
                      isDisconnected ? 'bg-red-500/20 text-red-400' :
                      isYou ? 'bg-emerald-500/30 text-emerald-400' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">
                        {player.name}
                        {isYou && <span className="text-emerald-400"> (You)</span>}
                        {isDisconnected && <span className="text-red-400 text-xs ml-1">(Disconnected)</span>}
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

      {/* Waiting for Disconnected Player */}
      {gameData?.waiting_for_player && (
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4 mb-4 text-center">
          <span className="text-amber-300">Waiting for {gameData.waiting_for_player} to reconnect...</span>
        </div>
      )}

      {/* Take Hand Button (Special Rule) */}
      {gameData?.can_take_from_left && !gameData?.round_in_progress && (
        <div className="game-card p-3 mb-4 flex items-center justify-between">
          <span className="text-white/70 text-sm">Special Rule: Take cards from player on your left</span>
          <button onClick={takeHand} className="btn-warning text-sm">
            Take {gameData.can_take_from_left}'s Hand
          </button>
        </div>
      )}

      {/* Play Area - Drop Zone */}
      <div
        className={`play-area drop-zone p-4 sm:p-6 mb-4 min-h-[327px] sm:min-h-[381px] flex flex-col items-center justify-center ${isDragOver ? 'drop-zone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (isMyTurn && draggedCard) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (isMyTurn && draggedCard) {
            playCard(draggedCard);
            setDraggedCard(null);
          }
        }}
      >
        {displayedPile?.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="flex flex-wrap gap-3 justify-center items-end">
              {displayedPile.map((play, index) => (
                <div key={index} className="flex flex-col items-center">
                  <Card card={play.card} medium />
                  <span className={`text-[10px] sm:text-xs mt-1 ${
                    resolvedInfo?.winner === play.player ? 'text-amber-400 font-bold' : 'text-white/60'
                  }`}>{play.player}</span>
                </div>
              ))}
            </div>
            {resolvedInfo && (
              <div className={`mt-3 text-sm font-medium ${resolvedInfo.suitBroken ? 'text-red-400' : 'text-emerald-400'}`}>
                {resolvedInfo.suitBroken
                  ? `${resolvedInfo.winner} picks up the pile!`
                  : `Cards discarded - ${resolvedInfo.winner} leads next!`}
              </div>
            )}
          </div>
        ) : takenHandDisplay ? (
          <div className="flex flex-col items-center">
            <div className="text-amber-400 font-bold text-sm mb-3">
              {takenHandDisplay.by} took {takenHandDisplay.from}'s hand! ({takenHandDisplay.cards.length} cards)
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-h-[545px] overflow-y-auto">
              {takenHandDisplay.cards.map((card, idx) => (
                <Card key={`taken-${card.suit}-${card.rank}-${idx}`} card={card} medium />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-white/30 text-sm">
            {isMyTurn ? 'Your turn - drag a card here to play' : `Waiting for ${gameData?.current_player}...`}
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
              draggable={isMyTurn}
              onDragStart={(card) => setDraggedCard(card)}
              onDragEnd={() => setDraggedCard(null)}
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
