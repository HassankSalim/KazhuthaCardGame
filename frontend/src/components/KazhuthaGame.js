import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Card, { SUIT_CONFIG } from './Card';
import HowToPlay from './HowToPlay';

// In production (HTTPS), use the same host. In development, use localhost:8000
const IS_SECURE = window.location.protocol === 'https:';
const SERVER_URL = IS_SECURE ? window.location.host : (process.env.REACT_APP_SERVER_URL || 'localhost:8000');
const BACKEND_URL = `${IS_SECURE ? 'https' : 'http'}://${SERVER_URL}`;
const WS_URL = `${IS_SECURE ? 'wss' : 'ws'}://${SERVER_URL}`;

// Pre-computed style objects
const DISPLAY_FONT_STYLE = { fontFamily: "'Playfair Display', serif" };
const APP_HEIGHT_STYLE = { minHeight: 'var(--app-height, 100vh)' };
const NOTIF_BOTTOM_STYLE = { bottom: 'max(3.5rem, calc(env(safe-area-inset-bottom) + 2.5rem))' };
const ERROR_BOTTOM_STYLE = { bottom: 'max(1rem, env(safe-area-inset-bottom))' };
const MAIN_HEIGHT_STYLE = { height: 'var(--app-height, 100vh)' };
const SUIT_INDICATOR_STYLE = { fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 };
const HAND_LABEL_STYLE = { fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 700, color: 'var(--color-gold)' };
const CARD_COUNT_STYLE = { fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 };
const EMPTY_TEXT_STYLE = { color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500, textAlign: 'center' };
const MOBILE_TABLE_STYLE = { width: '95%', maxHeight: '100%', aspectRatio: 'auto', flex: 1 };
const PLAYER_NAME_STYLE = { maxWidth: '120px' };
const DIM_TEXT_STYLE = { opacity: 0.6 };
const CARD_COUNT_CHIP_STYLE = { opacity: 0.4, fontSize: '11px' };

// Suit indicator symbol styles for play area (use light color for black suits on dark bg)
const SUIT_SYMBOL_STYLES = {
  '#c0392b': { fontSize: '22px', color: 'var(--color-suit-red)' },
  '#1a1a1a': { fontSize: '22px', color: 'var(--color-cream)' },
};
const SUIT_NAME_STYLE = { color: 'var(--color-cream)' };
const AVATAR_YOU_STYLE = { background: 'var(--color-teal)', color: 'var(--color-felt)' };
const AVATAR_OTHER_STYLE = { background: 'var(--color-gold-dim)', color: 'var(--color-cream)' };

// Shared clipboard copy icon SVG path
const COPY_ICON_PATH = "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z";

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
  const [displayedPile, setDisplayedPile] = useState(null);
  const [resolvedInfo, setResolvedInfo] = useState(null);
  const [takenHandDisplay, setTakenHandDisplay] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const resolvedPileTimeoutRef = useRef(null);
  const takenHandTimeoutRef = useRef(null);
  const screenRef = useRef('welcome');
  const prevScreenRef = useRef('welcome');
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

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Handle displaying resolved pile with timeout
  useEffect(() => {
    if (resolvedPileTimeoutRef.current) {
      clearTimeout(resolvedPileTimeoutRef.current);
    }

    if (gameData?.current_pile?.length > 0) {
      setDisplayedPile(gameData.current_pile);
      setResolvedInfo(null);
      return;
    }

    if (gameData?.resolved_pile?.length > 0 && !gameData?.current_pile?.length) {
      setDisplayedPile(gameData.resolved_pile);
      setResolvedInfo({
        winner: gameData.resolved_winner,
        suitBroken: gameData.suit_was_broken
      });

      resolvedPileTimeoutRef.current = setTimeout(() => {
        setDisplayedPile(null);
        setResolvedInfo(null);
      }, 3000);
    } else if (!gameData?.resolved_pile?.length) {
      setDisplayedPile(null);
      setResolvedInfo(null);
    }

    return () => {
      if (resolvedPileTimeoutRef.current) {
        clearTimeout(resolvedPileTimeoutRef.current);
      }
    };
  }, [gameData?.current_pile, gameData?.resolved_pile, gameData?.resolved_winner, gameData?.suit_was_broken]);

  // Handle displaying taken hand cards with timeout
  useEffect(() => {
    if (gameData?.taken_hand_cards?.length > 0) {
      if (takenHandTimeoutRef.current) {
        clearTimeout(takenHandTimeoutRef.current);
      }

      setTakenHandDisplay({
        cards: gameData.taken_hand_cards,
        from: gameData.taken_hand_from,
        by: gameData.taken_hand_by
      });

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

  // Stable callbacks for Card drag events (avoids re-creating per render)
  const handleDragStart = useCallback((c) => setDraggedCard(c), []);
  const handleDragEnd = useCallback(() => setDraggedCard(null), []);

  const copyGameCode = useCallback(() => {
    try {
      navigator.clipboard.writeText(gameId);
      setNotification('Copied!');
    } catch {
      setError('Could not copy to clipboard');
    }
  }, [gameId]);

  // Stable card select callback — Card calls onClick(card), so we toggle selection here
  const handleCardSelect = useCallback((card) => {
    setSelectedCard(prev => prev && prev.suit === card.suit && prev.rank === card.rank ? null : card);
  }, []);

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
      } catch {
        // Malformed WebSocket message — ignore silently
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
    if (!playerName.trim()) { setError('Please enter your name'); return; }
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
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const joinGame = async () => {
    if (!playerName.trim()) { setError('Please enter your name'); return; }
    if (!joinCode.trim()) { setError('Please enter game code'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: joinCode.trim().toUpperCase(), player_name: playerName.trim() }),
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
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
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
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
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
    } catch (err) { setError(err.message); }
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
    } catch (err) { setError(err.message); }
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
    } catch (err) { setError(err.message); }
  };

  const isMyTurn = gameData?.current_player === playerName;
  const myPlayer = useMemo(() => gameData?.players?.find(p => p.name === playerName), [gameData?.players, playerName]);
  const isHost = myPlayer?.is_host;

  // Sort hand by suit then by value
  const sortedHand = useMemo(() => {
    return [...(gameData?.your_hand || [])].sort((a, b) => {
      const suitOrder = { SPADES: 0, HEARTS: 1, CLUBS: 2, DIAMONDS: 3 };
      if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      const rankOrder = { ACE: 14, KING: 13, QUEEN: 12, JACK: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
      return rankOrder[b.rank] - rankOrder[a.rank];
    });
  }, [gameData?.your_hand]);

  // Group sorted hand by suit for suit-row layout
  const handBySuit = useMemo(() => {
    const suitOrder = ['SPADES', 'HEARTS', 'CLUBS', 'DIAMONDS'];
    const groups = {};
    suitOrder.forEach(s => { groups[s] = []; });
    sortedHand.forEach(card => {
      if (groups[card.suit]) groups[card.suit].push(card);
    });
    return suitOrder
      .filter(s => groups[s].length > 0)
      .map(s => ({ suit: s, cards: groups[s] }));
  }, [sortedHand]);

  // How to Play Screen
  if (screen === 'howToPlay') {
    return <HowToPlay onBack={() => setScreen(prevScreenRef.current || 'welcome')} />;
  }

  // Welcome Screen
  if (screen === 'welcome') {
    const hasGameCode = joinCode.trim().length > 0;
    const hasName = playerName.trim().length > 0;
    const createActive = hasName && !hasGameCode && !isLoading;
    const joinActive = hasName && hasGameCode && !isLoading;

    return (
      <div className="flex flex-col bg-brand-dark relative overflow-x-hidden" style={APP_HEIGHT_STYLE}>
        {/* Floating suit icons */}
        <div className="floating-icon text-9xl top-20 left-10" aria-hidden="true" style={{ animationDelay: '0s' }}>♠</div>
        <div className="floating-icon text-8xl bottom-20 left-[15%]" aria-hidden="true" style={{ animationDelay: '2s', animationDuration: '15s' }}>♥</div>
        <div className="floating-icon text-9xl top-1/4 right-10" aria-hidden="true" style={{ animationDelay: '4s', animationDuration: '10s' }}>♣</div>
        <div className="floating-icon text-8xl bottom-10 right-[20%]" aria-hidden="true" style={{ animationDelay: '6s' }}>♦</div>
        <div className="floating-icon text-7xl top-1/2 left-5" aria-hidden="true" style={{ animationDelay: '1s', animationDuration: '14s' }}>♦</div>
        <div className="floating-icon text-7xl bottom-1/3 right-5" aria-hidden="true" style={{ animationDelay: '5s', animationDuration: '16s' }}>♠</div>

        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-20 py-4 border-b border-brand-primary/20 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="text-emerald-500 text-2xl" aria-hidden="true">♠</span>
            <h2 className="text-white text-xl font-extrabold tracking-tight">Kazhutha</h2>
          </div>
          <button
            onClick={() => { prevScreenRef.current = screen; setScreen('howToPlay'); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="How to play"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
        </header>

        {/* Main content */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 relative z-10">
          <div className="w-full max-w-md animate-entrance">
            {/* Hero banner */}
            <div className="bg-brand-primary/30 rounded-t-2xl py-10 px-6 text-center border border-brand-primary/40 border-b-0">
              <h1 className="text-brand-gold text-4xl md:text-5xl font-black tracking-wide mb-2" style={DISPLAY_FONT_STYLE}>KAZHUTHA</h1>
              <p className="text-emerald-200/60 text-sm font-bold tracking-[0.3em] uppercase">A Classic Card Game</p>
            </div>

            {/* Form */}
            <form
              className="bg-surface-card rounded-b-2xl p-6 md:p-8 space-y-5 animate-entrance-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (hasName && hasGameCode && !isLoading) joinGame();
                else if (hasName && !hasGameCode && !isLoading) createGame();
              }}
            >
              {/* Name Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-emerald-100/60" htmlFor="player-name">
                  Display Name
                </label>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input
                    type="text"
                    id="player-name"
                    placeholder="e.g. AceOfSpades"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-brand-primary/40 bg-brand-primary/10 text-white placeholder-emerald-600 focus:border-emerald-500 focus:ring-0 transition-colors"
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-brand-primary/30"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                  <span className="bg-surface-card px-4 text-emerald-600">Join an existing lobby</span>
                </div>
              </div>

              {/* Code Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-emerald-100/60" htmlFor="game-code">
                  Game Code
                </label>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 7h3a5 5 0 015 5 5 5 0 01-5 5h-3m-6 0H6a5 5 0 01-5-5 5 5 0 015-5h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  <input
                    type="text"
                    id="game-code"
                    placeholder="— — — — — —"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-brand-primary/40 bg-brand-primary/10 text-white font-mono uppercase text-center text-xl tracking-[0.4em] placeholder-emerald-600 focus:border-emerald-500 focus:ring-0 transition-colors"
                    maxLength={6}
                  />
                </div>
              </div>

              {/* Create Button — gold 3D style matching lobby */}
              <button
                type={createActive ? 'submit' : 'button'}
                onClick={createActive ? createGame : undefined}
                disabled={!createActive}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
                  createActive
                    ? 'bg-brand-gold hover:brightness-110 text-brand-dark shadow-[0_4px_0_0_theme(colors.brand.gold-shadow)] hover:shadow-[0_2px_0_0_theme(colors.brand.gold-shadow)] active:shadow-none active:translate-y-1'
                    : 'bg-brand-gold/40 text-brand-dark/50 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                {isLoading && !hasGameCode ? 'Creating...' : 'Create New Game'}
              </button>

              {/* Join Button — outlined style matching lobby */}
              <button
                type={joinActive ? 'submit' : 'button'}
                onClick={joinActive ? joinGame : undefined}
                disabled={!joinActive}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
                  joinActive
                    ? 'border-brand-gold/60 text-brand-gold hover:bg-brand-gold/10 shadow-[0_4px_0_0_theme(colors.brand.gold-shadow)/30] hover:shadow-[0_2px_0_0_theme(colors.brand.gold-shadow)/30] active:shadow-none active:translate-y-1'
                    : 'border-brand-primary/20 text-emerald-800 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                {isLoading && hasGameCode ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-8 text-emerald-600 text-xs tracking-widest uppercase">Kazhutha Digital &copy; 2024</p>

          {/* Error toast */}
          {error && (
            <div role="alert" className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg text-sm animate-toast" style={ERROR_BOTTOM_STYLE}>
              {error}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Lobby Screen
  if (screen === 'lobby') {
    const players = gameData?.players || [{ name: playerName, is_host: true }];
    const maxPlayers = 8;
    const emptySlots = Math.max(0, Math.min(maxPlayers, 4) - players.length);

    return (
      <div className="flex flex-col bg-brand-dark relative overflow-x-hidden" style={APP_HEIGHT_STYLE}>
        {/* Floating suit icons — same as welcome screen (#2) */}
        <div className="floating-icon text-9xl top-20 left-10" aria-hidden="true" style={{ animationDelay: '0s' }}>♠</div>
        <div className="floating-icon text-8xl bottom-20 left-[15%]" aria-hidden="true" style={{ animationDelay: '2s', animationDuration: '15s' }}>♥</div>
        <div className="floating-icon text-9xl top-1/4 right-10" aria-hidden="true" style={{ animationDelay: '4s', animationDuration: '10s' }}>♣</div>
        <div className="floating-icon text-8xl bottom-10 right-[20%]" aria-hidden="true" style={{ animationDelay: '6s' }}>♦</div>
        <div className="floating-icon text-7xl top-1/2 left-5" aria-hidden="true" style={{ animationDelay: '1s', animationDuration: '14s' }}>♦</div>
        <div className="floating-icon text-7xl bottom-1/3 right-5" aria-hidden="true" style={{ animationDelay: '5s', animationDuration: '16s' }}>♠</div>

        {/* Shared header bar — same as welcome screen (#1) */}
        <header className="flex items-center justify-between px-6 md:px-20 py-4 border-b border-brand-primary/20 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="text-emerald-500 text-2xl" aria-hidden="true">♠</span>
            <h2 className="text-white text-xl font-extrabold tracking-tight">Kazhutha</h2>
          </div>
          <button
            onClick={() => { prevScreenRef.current = screen; setScreen('howToPlay'); }}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="How to play"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
        </header>

        {/* Main content */}
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-8 relative z-10">
          <div className="w-full max-w-md animate-entrance">
            {/* Game Code Section */}
            <section className="bg-brand-primary/30 rounded-t-2xl p-5 md:p-6 border border-brand-primary/40 border-b-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-entrance-1">
              <div>
                <h1 className="text-brand-gold text-xl md:text-2xl font-black tracking-wide mb-1" style={DISPLAY_FONT_STYLE}>GAME LOBBY</h1>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs uppercase tracking-widest">Room Code</span>
                  <span className="text-lg md:text-xl font-bold text-white tracking-[0.2em] font-mono">{gameId}</span>
                </div>
              </div>
              <button
                onClick={copyGameCode}
                className="bg-brand-gold hover:brightness-110 text-brand-dark font-bold py-3 px-6 rounded-lg text-sm uppercase tracking-widest shadow-[0_3px_0_0_theme(colors.brand.gold-shadow)] hover:shadow-[0_1px_0_0_theme(colors.brand.gold-shadow)] active:shadow-none active:translate-y-[2px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark"
                aria-label="Copy game code"
              >
                Copy Code
              </button>
            </section>

            {/* Players + Actions card */}
            <div className="bg-surface-card rounded-b-2xl p-6 md:p-8 animate-entrance-2">
              {/* Player count */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="relative flex h-3 w-3" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-white/70 font-semibold text-sm">{players.length} / {maxPlayers} Players</span>
              </div>

              {/* Players Grid */}
              <section className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8" aria-label="Players in lobby">
                {players.map((player) => {
                  const isYou = player.name === playerName;
                  return (
                    <div key={player.name} className="flex flex-col items-center group">
                      <div className="relative">
                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 ${
                          player.is_host ? 'border-emerald-500' : 'border-white/10'
                        } flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
                          player.is_host ? 'bg-brand-primary/30' : 'bg-white/5'
                        }`}>
                          <span className={`text-2xl md:text-3xl font-bold ${
                            player.is_host ? 'text-emerald-400' : 'text-white/70'
                          }`}>
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {player.is_host && (
                          <span className="absolute -top-2 -right-2 bg-emerald-500 text-brand-dark text-[10px] font-bold px-2 py-1 rounded-full border-2 border-surface-card uppercase">Host</span>
                        )}
                      </div>
                      <span className={`font-semibold text-sm truncate max-w-[100px] ${isYou ? 'text-white' : 'text-white/80'}`}>
                        {player.name}{isYou && ' (You)'}
                      </span>
                    </div>
                  );
                })}

                {/* Empty slots */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex flex-col items-center opacity-30">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-dashed border-white/40 flex items-center justify-center mb-2">
                      <span className="text-white text-3xl" aria-hidden="true">+</span>
                    </div>
                    <span className="text-white/50 text-sm">Waiting...</span>
                  </div>
                ))}
              </section>

              {/* Actions */}
              <footer className="flex flex-col items-center space-y-4">
                {isHost ? (
                  <button
                    onClick={startGame}
                    disabled={(players.length) < 2 || isLoading}
                    className={`bg-brand-gold hover:brightness-110 text-brand-dark font-bold py-4 px-12 rounded-xl text-lg shadow-[0_4px_0_0_theme(colors.brand.gold-shadow)] hover:shadow-[0_2px_0_0_theme(colors.brand.gold-shadow)] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card ${
                      (players.length) < 2 || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Starting...' : (players.length) < 2 ? 'Waiting for players...' : 'Start Game'}
                  </button>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex gap-1" aria-hidden="true">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>
                    <p className="text-white/60 italic text-sm">Waiting for host to start...</p>
                  </div>
                )}
                <button onClick={resetGame} className="btn-text w-full">
                  Leave Lobby
                </button>
              </footer>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-emerald-600 text-xs tracking-widest uppercase">Kazhutha Digital &copy; 2024</p>
        </main>

        {/* Notifications */}
        {notification && (
          <div role="status" className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-700 text-white rounded-lg shadow-lg text-sm animate-toast" style={NOTIF_BOTTOM_STYLE}>
            {notification}
          </div>
        )}
        {error && (
          <div role="alert" className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg text-sm animate-toast" style={ERROR_BOTTOM_STYLE}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Playing / Finished Screen ──
  // New layout: Top Bar → 60/40 split (Play Area | Hand Panel)
  // On mobile: stacked vertically instead of side-by-side

  const currentSuit = gameData?.current_suit;
  const currentSuitConfig = currentSuit ? SUIT_CONFIG[currentSuit] : null;
  const currentSuitName = currentSuitConfig?.name ?? null;
  const currentSuitSymbol = currentSuitConfig?.symbol ?? null;

  return (
    <main className="flex flex-col overflow-hidden bg-brand-dark" style={MAIN_HEIGHT_STYLE}>
      <h1 className="sr-only">Kazhutha Game{isMyTurn ? ' - Your Turn' : ''}</h1>

      {/* Game Over Modal */}
      {screen === 'finished' && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-backdrop"
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
          <div className="game-card p-8 text-center max-w-md w-full animate-modal">
            <h2 id="game-over-title" className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight" style={DISPLAY_FONT_STYLE}>Game Over!</h2>
            {gameData?.kazhutha === playerName ? (
              <div className="mb-6">
                <p className="text-xl text-red-400">You are the Kazhutha!</p>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-xl text-emerald-400">You won!</p>
                <p className="text-felt-muted mt-2">{gameData?.kazhutha} is the Kazhutha</p>
              </div>
            )}
            {isHost ? (
              <div className="space-y-3">
                <button onClick={playAgain} className="btn-primary w-full">Play Again</button>
                <button onClick={resetGame} className="btn-text w-full">Leave Game</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-felt-muted py-2 text-sm">Waiting for host to play again...</div>
                <button onClick={resetGame} className="btn-text w-full">Leave Game</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <header className="top-bar">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="game-code">{gameId}</div>
            <button
              onClick={copyGameCode}
              className="p-2.5 -m-1 text-gold-dim hover:text-gold rounded transition-colors"
              aria-label="Copy game code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={COPY_ICON_PATH} />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {gameData?.players?.map((player) => {
              const isCurrentPlayer = player.name === gameData.current_player;
              const isYou = player.name === playerName;
              const isDisconnected = !player.is_connected && gameData?.game_state === 'PLAYING';

              return (
                <div
                  key={player.name}
                  className={`player-chip ${isYou ? 'you' : ''} ${isCurrentPlayer ? 'player-chip-active' : ''} ${isDisconnected ? 'opacity-50' : ''}`}
                >
                  <div
                    className="player-avatar"
                    style={isYou ? AVATAR_YOU_STYLE : AVATAR_OTHER_STYLE}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate" style={PLAYER_NAME_STYLE}>
                    {player.name}
                    {isYou && <span style={DIM_TEXT_STYLE}> (You)</span>}
                    {isDisconnected && <span className="text-red-400 text-xs ml-1">(DC)</span>}
                  </span>
                  <span style={CARD_COUNT_CHIP_STYLE}>
                    {player.is_winner ? 'Won' : player.is_kazhutha ? 'Lost' : player.card_count}
                  </span>
                  {isCurrentPlayer && <div className="turn-dot" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center flex-shrink-0">
          {/* Take Hand Button */}
          {gameData?.can_take_from_left && !gameData?.round_in_progress && (
            <button onClick={takeHand} className="take-hand-btn">
              Take {gameData.can_take_from_left}'s Hand
            </button>
          )}
        </div>
      </header>

      {/* Waiting for Disconnected Player */}
      {gameData?.waiting_for_player && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 px-4 py-2 text-center">
          <span className="text-amber-300 text-xs sm:text-sm">Waiting for {gameData.waiting_for_player} to reconnect...</span>
        </div>
      )}

      {/* ── Main Game Area: 60/40 split (stacked on mobile) ── */}
      <div className={`flex-1 flex ${isMobile ? 'flex-col' : 'flex-row'} overflow-hidden`}>

        {/* ── Play Area (60%) ── */}
        <div className={`${isMobile ? 'flex-1 min-h-0' : 'flex-[6]'} flex flex-col items-center justify-center p-4 sm:p-6 relative min-w-0`}>
          {/* Suit indicator */}
          {currentSuitSymbol && (
            <div className="flex items-center gap-2 mb-3" style={SUIT_INDICATOR_STYLE}>
              <span>Lead suit:</span>
              <span style={SUIT_SYMBOL_STYLES[SUIT_CONFIG[gameData.current_suit]?.color] || SUIT_SYMBOL_STYLES['#1a1a1a']}>
                {currentSuitSymbol}
              </span>
              <span style={SUIT_NAME_STYLE}>{currentSuitName}</span>
            </div>
          )}

          {/* Table center / drop zone */}
          <div
            role="region"
            aria-label={isMyTurn ? 'Play area - your turn' : `Play area - waiting for ${gameData?.current_player || 'opponent'}`}
            className={`table-center ${isMyTurn ? 'active' : ''} ${isDragOver ? 'drop-zone-active' : ''} ${selectedCard && isMyTurn ? 'drop-zone-ready' : ''}`}
            style={isMobile ? MOBILE_TABLE_STYLE : undefined}
            onClick={() => {
              if (selectedCard && isMyTurn) {
                playCard(selectedCard);
                setSelectedCard(null);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (isMyTurn && draggedCard) setIsDragOver(true);
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
                      <Card card={play.card} />
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
                <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center max-h-[160px] sm:max-h-[300px] overflow-y-auto">
                  {takenHandDisplay.cards.map((card, idx) => (
                    <Card key={`taken-${card.suit}-${card.rank}-${idx}`} card={card} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={EMPTY_TEXT_STYLE}>
                {isMyTurn
                  ? (!hasFinePointer
                      ? (selectedCard ? 'Tap here to play the selected card' : 'Tap a card to select it')
                      : 'Your turn \u2014 drag a card here to play')
                  : `Waiting for ${gameData?.current_player}...`}
              </div>
            )}
          </div>
        </div>

        {/* ── Hand Panel (40%) ── */}
        <div className={`${isMobile ? 'flex-shrink-0' : 'flex-[4]'} flex flex-col items-center justify-center min-w-0 p-3 sm:p-4 game-hand-area`}>
          <div className="flex items-center justify-between w-full px-3 pb-2">
            <div style={HAND_LABEL_STYLE}>
              Your Hand
            </div>
            <div style={CARD_COUNT_STYLE}>
              {sortedHand.length} cards
            </div>
          </div>

          <div className={`suit-rows ${isMobile ? 'max-h-[240px] overflow-y-auto' : ''}`}>
            {handBySuit.map(({ suit, cards }) => {
              const isLed = currentSuit === suit;
              return (
                <div key={suit} className={`suit-row ${isLed ? 'led' : ''}`}>
                  <div className="suit-row-cards">
                    {cards.map((card, idx) => (
                      <Card
                        key={`${card.suit}-${card.rank}-${idx}`}
                        card={card}
                        overlap
                        draggable={isMyTurn && hasFinePointer}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={isMyTurn ? handleCardSelect : undefined}
                        disabled={!isMyTurn}
                        selected={isCardEqual(selectedCard, card)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {sortedHand.length === 0 && (
              <div className="py-8 w-full text-center" style={EMPTY_TEXT_STYLE}>
                {myPlayer?.is_winner ? "You've won!" : "No cards"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div aria-live="polite" className="fixed left-1/2 transform -translate-x-1/2 z-50" style={NOTIF_BOTTOM_STYLE}>
        {notification && (
          <div className="px-4 py-2 bg-emerald-700 text-white rounded-lg shadow-lg text-sm animate-toast">
            {notification}
          </div>
        )}
      </div>

      <div aria-live="assertive" className="fixed left-1/2 transform -translate-x-1/2 z-50" style={ERROR_BOTTOM_STYLE}>
        {error && (
          <div className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg text-sm animate-toast">
            {error}
          </div>
        )}
      </div>
    </main>
  );
};

export default KazhuthaGame;
