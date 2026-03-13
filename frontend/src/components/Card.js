import React from 'react';

// Colors match suit-red and suit-black tokens in tailwind.config.js
const SUIT_RED = '#dc2626';
const SUIT_BLACK = '#1a1a1a';

const SUIT_CONFIG = {
  HEARTS: { symbol: '\u2665', color: SUIT_RED, name: 'Hearts' },
  DIAMONDS: { symbol: '\u2666', color: SUIT_RED, name: 'Diamonds' },
  CLUBS: { symbol: '\u2663', color: SUIT_BLACK, name: 'Clubs' },
  SPADES: { symbol: '\u2660', color: SUIT_BLACK, name: 'Spades' },
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

const Card = ({ card, onClick, disabled, small, medium, draggable, onDragStart, onDragEnd, selected }) => {
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

  const handleDragEnd = (e) => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleKeyDown = (e) => {
    if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={cardLabel}
      aria-disabled={disabled || undefined}
      className={`
        card-base
        ${small ? 'w-[58px] h-[77px] sm:w-[68px] sm:h-[97px]' : medium ? 'w-[65px] h-[94px] sm:w-[74px] sm:h-[113px] md:w-[84px] md:h-[116px]' : 'w-[68px] h-[97px] sm:w-[77px] sm:h-[117px] md:w-[87px] md:h-[121px]'}
        ${isDraggable ? 'card-draggable' : ''}
        ${!disabled && onClick && !draggable ? 'card-playable' : ''}
        ${disabled ? 'card-disabled' : ''}
        ${selected ? 'card-selected' : ''}
        select-none relative
      `}
      style={{ color: suit.color }}
    >
      {/* Top left corner */}
      <div
        className={`absolute flex flex-col items-center ${small ? 'top-1 left-1 gap-0.5' : 'top-1.5 left-1.5 gap-1'}`}
        style={{ fontSize: small ? '11px' : medium ? '17px' : '18px', fontWeight: 600, lineHeight: 1 }}
      >
        <span>{rank}</span>
        <span style={{ fontSize: small ? '10px' : medium ? '14px' : '15px' }}>{suit.symbol}</span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: small ? '22px' : medium ? '36px' : '40px', opacity: 0.8 }}>{suit.symbol}</span>
      </div>

      {/* Bottom right corner */}
      <div
        className={`absolute flex flex-col items-center rotate-180 ${small ? 'bottom-1 right-1 gap-0.5' : 'bottom-1.5 right-1.5 gap-1'}`}
        style={{ fontSize: small ? '11px' : medium ? '17px' : '18px', fontWeight: 600, lineHeight: 1 }}
      >
        <span>{rank}</span>
        <span style={{ fontSize: small ? '10px' : medium ? '14px' : '15px' }}>{suit.symbol}</span>
      </div>
    </div>
  );
};

export const SuitIndicator = ({ suit }) => {
  if (!suit) return null;
  const config = SUIT_CONFIG[suit];
  if (!config) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-surface-raised">
      <span className="text-felt-light text-xs sm:text-sm">Current suit:</span>
      <span className="text-xl sm:text-2xl" style={{ color: config.color }}>{config.symbol}</span>
    </div>
  );
};

export default Card;
