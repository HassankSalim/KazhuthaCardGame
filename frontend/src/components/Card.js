import React from 'react';

const SUIT_RED = '#c0392b';
const SUIT_BLACK = '#1a1a1a';

const SUIT_CONFIG = {
  HEARTS: { symbol: '\u2665', color: SUIT_RED, name: 'Hearts' },
  DIAMONDS: { symbol: '\u2666', color: SUIT_RED, name: 'Diamonds' },
  CLUBS: { symbol: '\u2663', color: SUIT_BLACK, name: 'Clubs' },
  SPADES: { symbol: '\u2660', color: SUIT_BLACK, name: 'Spades' },
};

const RANK_DISPLAY = {
  ACE: 'A', KING: 'K', QUEEN: 'Q', JACK: 'J',
  '10': '10', '9': '9', '8': '8', '7': '7',
  '6': '6', '5': '5', '4': '4', '3': '3', '2': '2',
};

// Pre-computed style objects — never re-created
const SUIT_COLOR_STYLES = {
  [SUIT_RED]: { color: SUIT_RED },
  [SUIT_BLACK]: { color: SUIT_BLACK },
};

const RANK_STYLE = { fontSize: 'var(--card-rank-size)', fontWeight: 700, lineHeight: 1 };
const SUIT_STYLE = { fontSize: 'var(--card-suit-size)', lineHeight: 1, marginTop: '-1px' };
const CENTER_STYLE = { fontSize: 'var(--card-center-size)', opacity: 0.8 };

const Card = React.memo(({ card, onClick, disabled, draggable, onDragStart, onDragEnd, selected, overlap }) => {
  const suit = SUIT_CONFIG[card?.suit] || SUIT_CONFIG.SPADES;
  const rank = RANK_DISPLAY[card?.rank] || '?';
  const cardLabel = `${card?.rank || 'Unknown'} of ${suit.name}`;

  const isDraggable = draggable && !disabled;
  const isInteractive = !disabled && (onClick || isDraggable);

  const handleDragStart = (e) => {
    if (isDraggable && onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(card);
    }
  };

  const handleDragEnd = () => {
    if (onDragEnd) onDragEnd();
  };

  const handleKeyDown = (e) => {
    if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(card);
    }
  };

  return (
    <div
      onClick={disabled ? undefined : onClick ? () => onClick(card) : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={cardLabel}
      aria-pressed={selected || undefined}
      aria-disabled={disabled || undefined}
      className={`
        card-base
        ${overlap ? 'card-overlap' : ''}
        ${isDraggable ? 'card-draggable' : ''}
        ${!disabled && onClick && !draggable ? 'card-playable' : ''}
        ${disabled ? 'card-disabled' : ''}
        ${selected ? 'card-selected' : ''}
        select-none relative
      `}
      style={SUIT_COLOR_STYLES[suit.color]}
    >
      {/* Top left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center">
        <span style={RANK_STYLE}>{rank}</span>
        <span style={SUIT_STYLE}>{suit.symbol}</span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={CENTER_STYLE}>{suit.symbol}</span>
      </div>

      {/* Bottom right corner */}
      <div className="absolute bottom-1 right-1.5 rotate-180 flex flex-col items-center">
        <span style={RANK_STYLE}>{rank}</span>
        <span style={SUIT_STYLE}>{suit.symbol}</span>
      </div>
    </div>
  );
});

export { SUIT_CONFIG };
export default Card;
