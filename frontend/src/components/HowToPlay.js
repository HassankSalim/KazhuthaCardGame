import React, { useState, useRef } from 'react';

const DISPLAY_FONT = { fontFamily: "'Playfair Display', serif" };

// Simple inline SVG icons to avoid loading Material Symbols font
const InfoIcon = () => (
  <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-14 h-14 text-brand-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const TABS = [
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'suits', label: 'Suits' },
  { id: 'penalty', label: 'Penalty' },
  { id: 'winning', label: 'Winning' },
];

const HowToPlay = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('gameplay');
  const mainRef = useRef(null);

  const scrollToSection = (tabId) => {
    setActiveTab(tabId);
    const section = document.getElementById(`section-${tabId}`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-20 py-4 border-b border-brand-gold/20 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 transition-colors border border-brand-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            aria-label="Back to menu"
          >
            <ArrowLeftIcon />
          </button>
          <h2 className="text-white text-xl font-bold leading-tight tracking-tight" style={DISPLAY_FONT}>Kazhutha</h2>
        </div>
      </header>

      <main ref={mainRef} className="flex flex-1 justify-center py-8">
        <div className="flex flex-col max-w-[800px] flex-1 px-4">
          {/* Title */}
          <div className="text-center mb-8 animate-entrance">
            <h1 className="text-brand-gold text-4xl md:text-5xl font-bold leading-tight pb-2" style={DISPLAY_FONT}>How to Play</h1>
            <p className="text-felt-muted text-sm uppercase tracking-widest font-bold">The Classic Card Game</p>
          </div>

          {/* Tabs */}
          <nav className="mb-8 overflow-x-auto animate-entrance-1" aria-label="How to play sections">
            <div className="flex border-b border-brand-gold/20 gap-8 min-w-max justify-center">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.id)}
                  className={`text-sm font-bold tracking-wide pb-3 pt-4 px-2 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:rounded ${
                    activeTab === tab.id
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-felt-muted hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Basic Gameplay */}
          <section id="section-gameplay" className="mb-10 animate-entrance-2">
            <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-3" style={DISPLAY_FONT}>
              <span className="text-brand-gold text-3xl" aria-hidden="true">♠</span> Basic Gameplay
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/20 bg-surface-card p-5 hover:border-brand-gold/40 transition-colors">
                <span className="text-brand-gold text-3xl" aria-hidden="true">♠♣♥♦</span>
                <div>
                  <h3 className="text-white text-lg font-bold">52-Card Deck</h3>
                  <p className="text-felt-muted text-sm mt-1">Standard deck used without any jokers.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/20 bg-surface-card p-5 hover:border-brand-gold/40 transition-colors">
                <span className="text-brand-gold text-3xl font-bold" aria-hidden="true">A♠</span>
                <div>
                  <h3 className="text-white text-lg font-bold">Ace of Spades</h3>
                  <p className="text-felt-muted text-sm mt-1">The player holding this card always starts the game.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-brand-gold/20 bg-surface-card p-5 hover:border-brand-gold/40 transition-colors">
                <span className="text-brand-gold text-3xl" aria-hidden="true">↻</span>
                <div>
                  <h3 className="text-white text-lg font-bold">Clockwise</h3>
                  <p className="text-felt-muted text-sm mt-1">Turns move to the player on the left in a circle.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Following Suit */}
          <section id="section-suits" className="mb-10">
            <div className="bg-surface-card/50 rounded-2xl border border-brand-gold/10 p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <h2 className="text-white text-2xl font-bold mb-4" style={DISPLAY_FONT}>Following Suit</h2>
                  <p className="text-felt-light leading-relaxed mb-4">
                    Every player must play a card of the same suit as the lead card if they have one in their hand.
                  </p>
                  <div className="flex items-start gap-3 bg-brand-dark/50 p-4 rounded-lg border-l-4 border-emerald-500">
                    <InfoIcon />
                    <p className="text-sm text-white/80">The player who plays the highest card of the lead suit wins the round and leads the next one.</p>
                  </div>
                </div>
                <div className="w-full md:w-48 aspect-square bg-brand-gold/5 rounded-xl border border-brand-gold/20 flex items-center justify-center">
                  <span className="text-6xl text-brand-gold" aria-hidden="true">♠</span>
                </div>
              </div>
            </div>
          </section>

          {/* Breaking Suit */}
          <section id="section-penalty" className="mb-10">
            <h2 className="text-white text-2xl font-bold leading-tight mb-6 flex items-center gap-2" style={DISPLAY_FONT}>
              <WarningIcon /> Breaking Suit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden border border-brand-gold/20 bg-surface-card">
                <div className="h-32 w-full bg-gradient-to-br from-amber-500/20 to-surface-card flex items-center justify-center">
                  <span className="text-5xl" aria-hidden="true">✋</span>
                </div>
                <div className="p-5">
                  <h3 className="text-white text-lg font-bold mb-2">When you can't follow</h3>
                  <p className="text-felt-muted text-sm">If a player cannot follow the lead suit, they can play any other card from their hand. This "breaks" the round.</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-brand-gold/20 bg-surface-card">
                <div className="h-32 w-full bg-gradient-to-br from-brand-gold/20 to-surface-card flex items-center justify-center">
                  <span className="text-5xl" aria-hidden="true">📥</span>
                </div>
                <div className="p-5">
                  <h3 className="text-white text-lg font-bold mb-2">The Penalty</h3>
                  <p className="text-felt-muted text-sm">The player who played the highest card of the led suit must pick up all cards played in that round.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Winning */}
          <section id="section-winning" className="mb-12">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-brand-gold p-1">
              <div className="bg-surface-card rounded-[calc(1rem-2px)] p-6 md:p-10 text-center relative z-10">
                <div className="flex justify-center mb-4" aria-hidden="true">
                  <TrophyIcon />
                </div>
                <h2 className="text-white text-3xl font-bold mb-4" style={DISPLAY_FONT}>Winning &amp; The Kazhutha</h2>
                <p className="text-felt-light max-w-lg mx-auto mb-8">
                  The objective is simple: be the first to get rid of all your cards. The game continues until only one person is left with cards.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <div className="bg-emerald-500/20 rounded-full px-6 py-3 border border-emerald-500/30 flex items-center justify-center gap-2">
                    <span className="text-lg" aria-hidden="true">🏆</span>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Winner: First to Empty Hand</span>
                  </div>
                  <div className="bg-brand-gold/20 rounded-full px-6 py-3 border border-brand-gold/30 flex items-center justify-center gap-2">
                    <span className="text-lg" aria-hidden="true">😵</span>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Kazhutha: Last with Cards</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Action */}
          <div className="flex justify-center mt-4 mb-8">
            <button
              onClick={onBack}
              className="text-felt-muted hover:text-brand-gold text-sm font-bold uppercase tracking-widest py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:rounded"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </main>

      <footer className="py-10 text-center border-t border-brand-gold/10">
        <p className="text-emerald-600 text-xs tracking-widest uppercase">Kazhutha — A classic card game</p>
      </footer>
    </div>
  );
};

export default HowToPlay;
