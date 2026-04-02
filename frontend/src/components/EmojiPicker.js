import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Pets': ['🐾', '🦴', '🐕', '🐈', '🐰', '🐦', '🐠', '🐢', '🐹', '🦎', '🐍', '🐴', '🐷', '🐸', '🦜', '🦋', '🐝', '🐞', '🐙', '🦈', '🐘', '🦁', '🐯', '🐻', '🐼', '🐨', '🦊', '🐺', '🦄', '🐧'],
  'Love': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🥰', '😍', '😘', '😻', '💑'],
  'Fun': ['😂', '🤣', '😆', '😁', '🥳', '🤩', '😎', '🤗', '🫶', '👏', '🎉', '🎊', '🥇', '🏆', '⭐', '🌟', '✨', '💫', '🔥', '💯'],
  'Nature': ['🌸', '🌺', '🌻', '🌹', '🌷', '🌈', '☀️', '🌙', '⭐', '🍀', '🌿', '🌴', '🍁', '🍂', '🌊', '❄️', '🌵', '🌾', '🍄', '🪻'],
  'Food': ['🍖', '🦴', '🐟', '🍗', '🥩', '🥕', '🍎', '🫐', '🍌', '🥜', '🧀', '🍕', '🎂', '🍩', '🍪', '🍿', '🧁', '🍫', '🍬', '🍭'],
  'Faces': ['😀', '😃', '😄', '😊', '🙂', '😉', '😌', '😋', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😢', '😭', '😤', '😠', '🤯'],
};

const LIVE_EMOJIS = ['🐾', '❤️', '🔥', '⭐', '✨', '💯', '🎉', '😂', '🥳', '💕'];

export default function EmojiPicker({ onSelect, triggerClassName = '', compact = false }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Pets');
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pbk_recent_emojis') || '[]'); } catch { return []; }
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
    setRecentEmojis(updated);
    localStorage.setItem('pbk_recent_emojis', JSON.stringify(updated));
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={triggerClassName || 'p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors'}
        data-testid="emoji-picker-trigger"
      >
        <Smile className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 w-[320px] bg-card border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          data-testid="emoji-picker-panel"
        >
          {/* Quick reactions bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30">
            {LIVE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="text-xl p-1 rounded-lg hover:bg-primary/10 transition-all hover:scale-125 active:scale-90 emoji-bounce"
                data-testid={`quick-emoji-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Category tabs */}
          <div className="flex gap-0.5 px-2 py-1.5 border-b border-border overflow-x-auto scrollbar-none">
            {recentEmojis.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory('Recent')}
                className={`text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === 'Recent' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Recent
              </button>
            )}
            {Object.keys(EMOJI_CATEGORIES).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 h-[180px] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-8 gap-0.5">
              {(activeCategory === 'Recent' ? recentEmojis : EMOJI_CATEGORIES[activeCategory] || []).map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className="text-xl p-1.5 rounded-lg hover:bg-primary/10 transition-all hover:scale-110 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .emoji-bounce:hover {
          animation: emojiBounce 0.4s ease;
        }
        @keyframes emojiBounce {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.3) rotate(-5deg); }
          50% { transform: scale(1.1) rotate(5deg); }
          75% { transform: scale(1.25) rotate(-3deg); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
