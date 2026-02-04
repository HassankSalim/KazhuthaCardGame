import React from 'react';

const SUIT_CONFIG = {
  HEARTS: { symbol: '\u2665', color: '#dc2626', name: 'Hearts' },
  DIAMONDS: { symbol: '\u2666', color: '#dc2626', name: 'Diamonds' },
  CLUBS: { symbol: '\u2663', color: '#1f2937', name: 'Clubs' },
  SPADES: { symbol: '\u2660', color: '#1f2937', name: 'Spades' },
};

const RANK_DISPLAY = {
  ACE: 'A',
  KING: 'K',
  QUEEN: 'Q',
  JACK: 'J',
  '10': '10',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2',
};

const Card = ({ card, onClick, disabled, small, draggable, onDragStart, onDragEnd }) => {
  const suit = SUIT_CONFIG[card?.suit] || SUIT_CONFIG.SPADES;
  const rank = RANK_DISPLAY[card?.rank] || '?';

  const isDraggable = draggable && !disabled;

  const handleDragStart = (e) => {
    if (isDraggable && onDragStart) {
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(card);
    }
  };

  const handleDragEnd = (e) => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        card-base
        ${small ? 'w-12 h-16 sm:w-14 sm:h-20' : 'w-14 h-20 sm:w-16 sm:h-24 md:w-[72px] md:h-[100px]'}
        ${isDraggable ? 'card-draggable' : ''}
        ${!disabled && onClick && !draggable ? 'card-playable' : ''}
        ${disabled ? 'card-disabled' : ''}
        select-none relative
      `}
      style={{ color: suit.color }}
    >
      {/* Top left corner */}
      <div
        className="absolute top-1 left-1 flex flex-col items-center leading-none"
        style={{ fontSize: small ? '10px' : '12px' }}
      >
        <span className="font-bold">{rank}</span>
        <span style={{ fontSize: small ? '8px' : '10px', marginTop: '-1px' }}>{suit.symbol}</span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: small ? '20px' : '28px' }}>{suit.symbol}</span>
      </div>

      {/* Bottom right corner */}
      <div
        className="absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180"
        style={{ fontSize: small ? '10px' : '12px' }}
      >
        <span className="font-bold">{rank}</span>
        <span style={{ fontSize: small ? '8px' : '10px', marginTop: '-1px' }}>{suit.symbol}</span>
      </div>
    </div>
  );
};

export const SuitIndicator = ({ suit }) => {
  if (!suit) return null;
  const config = SUIT_CONFIG[suit];
  if (!config) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#2d4a2d]">
      <span className="text-white/70 text-xs sm:text-sm">Current suit:</span>
      <span className="text-xl sm:text-2xl" style={{ color: config.color }}>{config.symbol}</span>
    </div>
  );
};

export const CardBack = ({ small }) => {
  return (
    <div className={`
      ${small ? 'w-12 h-16 sm:w-14 sm:h-20' : 'w-14 h-20 sm:w-16 sm:h-24 md:w-[72px] md:h-[100px]'}
      rounded-lg bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600
      flex items-center justify-center
    `}>
      <div className="w-3/4 h-3/4 rounded border border-blue-400/50 bg-blue-700/30" />
    </div>
  );
};

export default Card;
