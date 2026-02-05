import React from 'react';

const SUIT_CONFIG = {
  HEARTS: { symbol: '\u2665', color: '#dc2626', name: 'Hearts' },
  DIAMONDS: { symbol: '\u2666', color: '#dc2626', name: 'Diamonds' },
  CLUBS: { symbol: '\u2663', color: '#1a1a1a', name: 'Clubs' },
  SPADES: { symbol: '\u2660', color: '#1a1a1a', name: 'Spades' },
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

const Card = ({ card, onClick, disabled, small, medium, draggable, onDragStart, onDragEnd }) => {
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
        ${small ? 'w-[58px] h-[77px] sm:w-[68px] sm:h-[97px]' : medium ? 'w-[65px] h-[94px] sm:w-[74px] sm:h-[113px] md:w-[84px] md:h-[116px]' : 'w-[68px] h-[97px] sm:w-[77px] sm:h-[117px] md:w-[87px] md:h-[121px]'}
        ${isDraggable ? 'card-draggable' : ''}
        ${!disabled && onClick && !draggable ? 'card-playable' : ''}
        ${disabled ? 'card-disabled' : ''}
        select-none relative
      `}
      style={{ color: suit.color }}
    >
      {/* Top left corner */}
      <div
        className="absolute top-2 left-2 flex flex-col items-center leading-none"
        style={{ fontSize: small ? '14px' : medium ? '17px' : '18px', fontWeight: 600 }}
      >
        <span>{rank}</span>
        <span style={{ fontSize: small ? '12px' : medium ? '15px' : '16px', marginTop: '1px' }}>{suit.symbol}</span>
      </div>

      {/* Center suit */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: small ? '32px' : medium ? '44px' : '48px' }}>{suit.symbol}</span>
      </div>

      {/* Bottom right corner */}
      <div
        className="absolute bottom-2 right-2 flex flex-col items-center leading-none rotate-180"
        style={{ fontSize: small ? '14px' : medium ? '17px' : '18px', fontWeight: 600 }}
      >
        <span>{rank}</span>
        <span style={{ fontSize: small ? '12px' : medium ? '15px' : '16px', marginTop: '1px' }}>{suit.symbol}</span>
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
    <div
      className={`
        ${small ? 'w-[58px] h-[77px] sm:w-[68px] sm:h-[97px]' : 'w-[68px] h-[97px] sm:w-[77px] sm:h-[117px] md:w-[87px] md:h-[121px]'}
        rounded-xl flex items-center justify-center overflow-hidden
      `}
      style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 0 0 2px rgba(255, 255, 255, 0.2)'
      }}
    >
      <div
        className="w-3/4 h-3/4 rounded-lg flex items-center justify-center"
        style={{
          border: '2px solid rgba(255, 255, 255, 0.2)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: small ? '16px' : '24px' }}>♠♥♦♣</span>
      </div>
    </div>
  );
};

export default Card;
