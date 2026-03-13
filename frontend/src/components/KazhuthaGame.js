import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card, { SuitIndicator } from './Card';

// In production (HTTPS), use the same host. In development, use localhost:8000
const IS_SECURE = window.location.protocol === 'https:';
const SERVER_URL = IS_SECURE ? window.location.host : (process.env.REACT_APP_SERVER_URL || 'localhost:8000');
const BACKEND_URL = `${IS_SECURE ? 'https' : 'http'}://${SERVER_URL}`;
const WS_URL = `${IS_SECURE ? 'wss' : 'ws'}://${SERVER_URL}`;

// Crown icon for host player
const CrownIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="m249 64.79c-1.32-0.68-2.6 0.05-3.58 1.02l-68.85 62.36-46.25-87.55c-0.57-1.09-1.37-1.74-2.58-1.62-1.08 0.01-2.07 0.66-2.52 1.66l-45.52 87.06-69.07-62.44c-1.03-1-2.53-1.32-3.75-0.57-1.22 0.7-1.62 1.98-1.31 3.33l29.01 145c0.31 1.56 1.44 2.55 2.86 2.55h181.2c1.41 0 2.63-0.99 2.87-2.45l29.01-145c0.32-1.35-0.28-2.76-1.5-3.35z" fill="#000"/>
    <path d="m128 47.75-44.59 86.16c-0.45 0.88-1.22 1.47-2.19 1.55-0.89 0.12-1.84-0.25-2.51-0.9l-65.76-59.43 27.02 134.8h176.1l27.02-135.3-65.64 59.79c-0.75 0.7-1.7 1-2.67 0.8-0.95-0.23-1.75-0.88-2.2-1.75l-44.54-85.71z" fill="url(#crown_paint0)"/>
    <path d="m128 47.75-0.22 0.42v161.8h88.25l27.02-135.3-65.64 59.79c-0.75 0.7-1.7 1-2.67 0.8-0.95-0.23-1.75-0.88-2.2-1.75l-44.54-85.71z" fill="url(#crown_paint1)"/>
    <path d="m128 75.82c-1.33-0.11-2.44 0.59-3.09 1.79l-40.2 78-47.05-41.82c-0.98-0.9-2.45-1.07-3.59-0.32-1.13 0.75-1.64 2.2-1.35 3.55l16.27 79.37c0.31 1.45 1.53 2.45 2.95 2.45h151.7c1.41 0 2.63-1.1 2.94-2.55l16.27-79.37c0.29-1.35-0.33-2.9-1.55-3.55s-2.65-0.35-3.63 0.65l-45.67 41.59-41.08-78c-0.65-1.2-1.67-1.9-2.89-1.79z" fill="#000"/>
    <path d="m127.4 85.8-39.7 76.41c-0.45 0.9-1.32 1.6-2.3 1.65-0.97 0.1-1.92-0.3-2.65-1.05l-41.85-39.19 13.47 69.27h146.8l13.47-69.67-41.73 39.49c-0.75 0.7-1.8 1.1-2.77 0.85-0.98-0.2-1.85-0.95-2.3-1.95l-40.43-75.81z" fill="url(#crown_paint2)"/>
    <path d="m127.8 86.45v106.4h73.39l13.47-69.67-41.73 39.49c-0.75 0.7-1.8 1.1-2.77 0.85-0.98-0.2-1.85-0.95-2.3-1.95l-40.06-75.16z" fill="url(#crown_paint3)"/>
    <path d="m128.8 116.1c-1.13-2.05-4.4-2.05-5.43 0l-15.1 29.67c-0.56 1.1-0.51 2.45 0.1 3.55l16.92 29.17c1.13 2.1 4.46 2.1 5.58 0l16.48-29.17c0.66-1.15 0.61-2.6-0.1-3.75l-18.45-29.47z" fill="#000"/>
    <path d="m127.7 123-13.87 24.42 13.96 23.62 13.97-24.42-14.06-23.62z" fill="url(#crown_paint4)"/>
    <path d="m127.8 123v48.04l13.97-24.42-13.97-23.62z" fill="url(#crown_paint5)"/>
    <defs>
      <linearGradient id="crown_paint0" x1="12.95" x2="243" y1="128.8" y2="128.8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F7D046" offset="0"/>
        <stop stopColor="#CC9210" offset="1"/>
      </linearGradient>
      <linearGradient id="crown_paint1" x1="185.4" x2="185.4" y1="47.75" y2="209.9" gradientUnits="userSpaceOnUse">
        <stop stopColor="#CC9210" offset="0"/>
        <stop stopColor="#CC9210" offset="1"/>
      </linearGradient>
      <linearGradient id="crown_paint2" x1="40.91" x2="214.6" y1="134.8" y2="134.8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#D8D9DB" offset="0"/>
        <stop stopColor="#96989A" offset="1"/>
      </linearGradient>
      <linearGradient id="crown_paint3" x1="171.2" x2="171.2" y1="86.45" y2="192.9" gradientUnits="userSpaceOnUse">
        <stop stopColor="#96989A" offset="0"/>
        <stop stopColor="#96989A" offset="1"/>
      </linearGradient>
      <linearGradient id="crown_paint4" x1="113.8" x2="141.7" y1="147" y2="147" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3CAEF3" offset="0"/>
        <stop stopColor="#26426B" offset="1"/>
      </linearGradient>
      <linearGradient id="crown_paint5" x1="134.8" x2="134.8" y1="123" y2="171" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E4888" offset="0"/>
        <stop stopColor="#1E4888" offset="1"/>
      </linearGradient>
    </defs>
  </svg>
);

// Detect primary pointer type: fine = mouse/trackpad, coarse = touchscreen
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

const KazhuthaGame = () => {
  const [screen, setScreen] = useState('welcome');
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [displayedPile, setDisplayedPile] = useState(null); // For showing resolved pile
  const [resolvedInfo, setResolvedInfo] = useState(null); // Winner info for resolved pile
  const [takenHandDisplay, setTakenHandDisplay] = useState(null); // For showing taken hand cards
  const [draggedCard, setDraggedCard] = useState(null); // Card being dragged
  const [isDragOver, setIsDragOver] = useState(false); // Whether dragging over drop zone
  const [selectedCard, setSelectedCard] = useState(null); // Card selected by tap (mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const resolvedPileTimeoutRef = useRef(null);
  const takenHandTimeoutRef = useRef(null);
  const screenRef = useRef('welcome');
  const gameOverRef = useRef(null);

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

  // Keep screenRef in sync with screen state (used by WS onclose handler)
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

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

  // Track viewport width for mobile layout
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Clear selected card when turn changes
  useEffect(() => {
    setSelectedCard(null);
  }, [gameData?.current_player]);

  // Focus the game-over modal when it appears
  useEffect(() => {
    if (screen === 'finished' && gameOverRef.current) {
      gameOverRef.current.focus();
    }
  }, [screen]);

  const isCardEqual = (a, b) => a && b && a.suit === b.suit && a.rank === b.rank;

  const connectWebSocket = useCallback(() => {
    if (!gameId || !playerName) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;


    const ws = new WebSocket(`${WS_URL}/ws/${gameId}/${playerName}`);

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
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
      if (screenRef.current !== 'welcome') {
        const attempts = reconnectAttemptsRef.current;
        if (attempts < 10) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          reconnectAttemptsRef.current = attempts + 1;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      }
    };

    ws.onerror = () => {

      setError('Connection error');
    };

    wsRef.current = ws;
  }, [gameId, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameId && playerName && screen !== 'welcome') {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket, gameId, playerName, screen]);

  // Clean up WebSocket on unmount only
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const createGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
    screenRef.current = 'welcome';
    if (wsRef.current) wsRef.current.close();
    if (resolvedPileTimeoutRef.current) clearTimeout(resolvedPileTimeoutRef.current);
    if (takenHandTimeoutRef.current) clearTimeout(takenHandTimeoutRef.current);
    reconnectAttemptsRef.current = 0;
    setGameId('');
    setJoinCode('');
    setGameData(null);
    setDisplayedPile(null);
    setResolvedInfo(null);
    setTakenHandDisplay(null);
    setScreen('welcome');
    setError('');
    setNotification('');
    setIsLoading(false);
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
      <main className="flex items-center justify-center p-4" style={{ minHeight: 'var(--app-height, 100vh)' }}>
        <div className="game-card w-full max-w-md p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-black text-white mb-3 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Kazhutha</h1>
            <p className="text-felt-muted text-sm tracking-widest uppercase">A classic card game</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input-field"
              maxLength={20}
              aria-label="Your name"
            />

            <input
              type="text"
              placeholder="Enter game code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-field"
              maxLength={6}
              aria-label="Game code"
            />

            <div className="flex gap-3">
              <button
                onClick={createGame}
                disabled={!hasName || hasGameCode || isLoading}
                className={`btn-primary flex-1 ${(!hasName || hasGameCode || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Creating...' : 'Create Game'}
              </button>
              <button
                onClick={joinGame}
                disabled={!hasName || !hasGameCode || isLoading}
                className={`btn-secondary flex-1 ${(!hasName || !hasGameCode || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Lobby Screen
  if (screen === 'lobby') {
    return (
      <main className="flex items-center justify-center p-4" style={{ minHeight: 'var(--app-height, 100vh)' }}>
        <div className="game-card w-full max-w-md p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Game Lobby</h1>
            <div className="flex items-center justify-center gap-2">
              <span className="text-felt-muted">Code:</span>
              <span className="font-mono text-2xl text-emerald-400 tracking-widest">{gameId}</span>
              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(gameId);
                    setNotification('Copied!');
                  } catch {
                    setError('Could not copy to clipboard');
                  }
                }}
                className="p-3 text-felt-dim hover:text-white rounded transition-colors"
                aria-label="Copy game code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-felt-muted text-sm mb-3">Players ({gameData?.players?.length || 1}/8)</h3>
            <div className="space-y-2">
              {(gameData?.players || [{ name: playerName, is_host: true }]).map((player) => (
                <div
                  key={player.name}
                  className={`player-card ${player.name === playerName ? 'ring-1 ring-emerald-500/50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    player.is_host ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-felt-light'
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
              disabled={(gameData?.players?.length || 1) < 2 || isLoading}
              className={`btn-primary w-full ${((gameData?.players?.length || 1) < 2 || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Starting...' : (gameData?.players?.length || 1) < 2 ? 'Waiting for players...' : 'Start Game'}
            </button>
          ) : (
            <div className="text-center text-felt-dim py-4">
              Waiting for host to start...
            </div>
          )}

          <button onClick={resetGame} className="w-full mt-4 text-felt-dim hover:text-felt-light text-sm transition-colors">
            Leave Lobby
          </button>

          {notification && (
            <div role="status" className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm text-center">
              {notification}
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Playing/Finished Screen
  return (
    <main className="flex flex-col p-2 sm:p-4 max-w-5xl mx-auto" style={{ minHeight: 'var(--app-height, 100vh)' }}>
      <h1 className="sr-only">Kazhutha Game{isMyTurn ? ' - Your Turn' : ''}</h1>

      {/* Game Code Badge - inline on mobile, fixed on desktop */}
      <div className={`${isMobile ? 'flex justify-end mb-2' : 'fixed top-4 right-4'} z-40`}>
        <div className="game-card px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1.5 sm:gap-2">
          <span className="text-felt-muted text-xs">Code:</span>
          <span className="font-mono text-xs sm:text-sm text-emerald-400 tracking-wider">{gameId}</span>
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(gameId);
                setNotification('Game code copied!');
              } catch {
                setError('Could not copy to clipboard');
              }
            }}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-felt-dim hover:text-white rounded transition-colors"
            aria-label="Copy game code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {screen === 'finished' && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          ref={gameOverRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              const focusable = gameOverRef.current?.querySelectorAll('button:not([disabled])');
              if (focusable?.length) {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }
          }}
        >
          <div className="game-card p-8 text-center max-w-md w-full">
            <h2 id="game-over-title" className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Game Over!</h2>
            {gameData?.kazhutha === playerName ? (
              <div className="mb-6">
                <div className="text-6xl mb-4" aria-hidden="true">😵</div>
                <p className="text-xl text-red-400">You are the Kazhutha!</p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
                <p className="text-xl text-emerald-400">You won!</p>
                <p className="text-felt-muted mt-2">{gameData?.kazhutha} is the Kazhutha</p>
              </div>
            )}
            {isHost ? (
              <div className="space-y-3">
                <button onClick={playAgain} className="btn-primary w-full">
                  Play Again
                </button>
                <button onClick={resetGame} className="w-full text-felt-dim hover:text-felt-light text-sm transition-colors">
                  Leave Game
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-felt-dim py-2 text-sm">
                  Waiting for host to play again...
                </div>
                <button onClick={resetGame} className="w-full text-felt-dim hover:text-felt-light text-sm transition-colors">
                  Leave Game
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Bar */}
      <div className="game-card p-2 sm:p-4 mb-2 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Players - horizontal scroll on mobile, wrap on desktop */}
          <div className="flex gap-2 sm:gap-3 flex-1 overflow-x-auto sm:flex-wrap scrollbar-hide pb-1">
            {gameData?.players?.map((player) => {
              const isCurrentPlayer = player.name === gameData.current_player;
              const isYou = player.name === playerName;
              const isDisconnected = !player.is_connected && gameData?.game_state === 'PLAYING';

              return (
                <div key={player.name} className="relative pt-1 pb-2 flex-shrink-0">
                  {/* Crown for host - top left */}
                  {player.is_host && (
                    <div className="absolute -top-1 -left-1 z-10">
                      <CrownIcon />
                    </div>
                  )}

                  <div className={`player-card ${isCurrentPlayer ? 'player-card-active' : ''} ${isDisconnected ? 'opacity-50' : ''}`}>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                      player.is_winner ? 'bg-amber-500/30 text-amber-400' :
                      player.is_kazhutha ? 'bg-red-500/30 text-red-400' :
                      isDisconnected ? 'bg-red-500/20 text-red-400' :
                      isYou ? 'bg-emerald-500/30 text-emerald-400' :
                      'bg-white/10 text-felt-light'
                    }`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">
                        {player.name}
                        {isYou && <span className="text-emerald-400 text-xs"> (You)</span>}
                        {isDisconnected && <span className="text-red-400 text-xs ml-1">(DC)</span>}
                      </div>
                      <div className="text-felt-muted text-xs">
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
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 sm:p-4 mb-2 sm:mb-4 text-center">
          <span className="text-amber-300 text-xs sm:text-base">Waiting for {gameData.waiting_for_player} to reconnect...</span>
        </div>
      )}

      {/* Take Hand Button (Special Rule) */}
      {gameData?.can_take_from_left && !gameData?.round_in_progress && (
        <div className="game-card p-3 mb-2 sm:mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-between">
          <span className="text-felt-light text-xs sm:text-sm text-center sm:text-left">Special Rule: Take cards from player on your left</span>
          <button onClick={takeHand} className="btn-warning text-sm whitespace-nowrap">
            Take {gameData.can_take_from_left}'s Hand
          </button>
        </div>
      )}

      {/* Play Area - Drop Zone */}
      <div
        role="region"
        aria-label={isMyTurn ? 'Play area - your turn' : `Play area - waiting for ${gameData?.current_player || 'opponent'}`}
        className={`play-area drop-zone p-3 sm:p-6 mb-2 sm:mb-4 min-h-[180px] sm:min-h-[381px] flex flex-col items-center justify-center ${isDragOver ? 'drop-zone-active' : ''} ${selectedCard && isMyTurn ? 'drop-zone-ready' : ''}`}
        onClick={() => {
          if (selectedCard && isMyTurn) {
            playCard(selectedCard);
            setSelectedCard(null);
          }
        }}
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
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-end">
              {displayedPile.map((play, index) => (
                <div key={index} className="flex flex-col items-center">
                  <Card card={play.card} small={isMobile} medium={!isMobile} />
                  <span className={`text-xs mt-1 ${
                    resolvedInfo?.winner === play.player ? 'text-amber-400 font-bold' : 'text-felt-muted'
                  }`}>{play.player}</span>
                </div>
              ))}
            </div>
            {resolvedInfo && (
              <div className={`mt-2 sm:mt-3 text-xs sm:text-sm font-medium ${resolvedInfo.suitBroken ? 'text-red-400' : 'text-emerald-400'}`}>
                {resolvedInfo.suitBroken
                  ? `${resolvedInfo.winner} picks up the pile!`
                  : `Cards discarded - ${resolvedInfo.winner} leads next!`}
              </div>
            )}
          </div>
        ) : takenHandDisplay ? (
          <div className="flex flex-col items-center">
            <div className="text-amber-400 font-bold text-xs sm:text-sm mb-2 sm:mb-3">
              {takenHandDisplay.by} took {takenHandDisplay.from}'s hand! ({takenHandDisplay.cards.length} cards)
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center max-h-[200px] sm:max-h-[545px] overflow-y-auto">
              {takenHandDisplay.cards.map((card, idx) => (
                <Card key={`taken-${card.suit}-${card.rank}-${idx}`} card={card} small={isMobile} medium={!isMobile} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-felt-dim text-sm text-center">
            {isMyTurn
              ? (!hasFinePointer
                  ? (selectedCard ? 'Tap here to play the selected card' : 'Tap a card to select it')
                  : 'Your turn - drag a card here to play')
              : `Waiting for ${gameData?.current_player}...`}
          </div>
        )}
      </div>

      {/* Your Hand */}
      <div className="game-card p-3 sm:p-4 game-hand-area">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-white font-medium text-sm sm:text-base">Your Hand</h2>
          <span className="text-felt-muted text-xs sm:text-sm">{sortedHand.length} cards</span>
        </div>

        <div className={`flex flex-wrap gap-1.5 sm:gap-2 justify-start ${isMobile ? 'max-h-[280px] overflow-y-auto' : ''}`}>
          {sortedHand.map((card, idx) => (
            <Card
              key={`${card.suit}-${card.rank}-${idx}`}
              card={card}
              small={isMobile}
              draggable={isMyTurn && hasFinePointer}
              onDragStart={(card) => setDraggedCard(card)}
              onDragEnd={() => setDraggedCard(null)}
              onClick={isMyTurn ? () => {
                if (isCardEqual(selectedCard, card)) {
                  setSelectedCard(null);
                } else {
                  setSelectedCard(card);
                }
              } : undefined}
              disabled={!isMyTurn}
              selected={isCardEqual(selectedCard, card)}
            />
          ))}
          {sortedHand.length === 0 && (
            <div className="text-felt-dim py-8 w-full text-center">
              {myPlayer?.is_winner ? "You've won!" : "No cards"}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div aria-live="polite" className="fixed left-1/2 transform -translate-x-1/2 z-50" style={{ bottom: 'max(3.5rem, calc(env(safe-area-inset-bottom) + 2.5rem))' }}>
        {notification && (
          <div className="px-4 py-2 bg-emerald-700 text-white rounded-lg shadow-lg text-sm">
            {notification}
          </div>
        )}
      </div>

      <div aria-live="assertive" className="fixed left-1/2 transform -translate-x-1/2 z-50" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {error && (
          <div className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
};

export default KazhuthaGame;
