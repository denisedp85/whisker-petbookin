import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';

const PET_EMOJIS = [
  { id: 'dog', emoji: '🐕', name: 'Dog' },
  { id: 'cat', emoji: '🐈', name: 'Cat' },
  { id: 'bird', emoji: '🐦', name: 'Bird' },
  { id: 'fish', emoji: '🐠', name: 'Fish' },
  { id: 'rabbit', emoji: '🐇', name: 'Rabbit' },
  { id: 'hamster', emoji: '🐹', name: 'Hamster' },
  { id: 'turtle', emoji: '🐢', name: 'Turtle' },
  { id: 'parrot', emoji: '🦜', name: 'Parrot' },
];

export default function PetMemory({ API, authHeaders, onDone, onBack }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef(null);

  const init = useCallback(() => {
    const selected = [...PET_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 6);
    const pairs = [...selected, ...selected].sort(() => Math.random() - 0.5).map((pet, idx) => ({
      ...pet, cardId: idx, key: `${pet.id}-${idx}`,
    }));
    setCards(pairs);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setTime(0);
    setStarted(false);
    setComplete(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => { init(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [init]);

  useEffect(() => {
    if (started && !complete) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [started, complete]);

  const flipCard = (idx) => {
    if (flipped.length >= 2 || matched.has(idx) || flipped.includes(idx)) return;
    if (!started) setStarted(true);
    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = next;
      if (cards[a].id === cards[b].id) {
        const newMatched = new Set([...matched, a, b]);
        setMatched(newMatched);
        setFlipped([]);
        if (newMatched.size === cards.length) {
          setComplete(true);
          clearInterval(timerRef.current);
          import('axios').then(({ default: axios }) => {
            axios.post(`${API}/games/memory/submit`, { moves: moves + 1, time: time, pairs: 6 }, { headers: authHeaders() })
              .then(res => onDone(res.data))
              .catch(console.error);
          });
        }
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  return (
    <div className="space-y-4" data-testid="pet-memory-game">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex gap-4 text-sm">
          <span className="font-medium">Moves: <strong>{moves}</strong></span>
          <span className="font-medium">Time: <strong>{time}s</strong></span>
          <span className="font-medium">Pairs: <strong>{matched.size / 2}/6</strong></span>
        </div>
        <Button variant="ghost" size="sm" onClick={init} className="rounded-full"><RotateCcw className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.has(idx);
          return (
            <button
              key={card.key}
              onClick={() => flipCard(idx)}
              className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 border-2 ${
                isFlipped
                  ? matched.has(idx)
                    ? 'bg-green-50 border-green-300 scale-95'
                    : 'bg-white border-primary shadow-md'
                  : 'bg-gradient-to-br from-primary/20 to-secondary/20 border-border hover:border-primary/50 hover:shadow-sm cursor-pointer'
              }`}
              disabled={isFlipped}
              data-testid={`memory-card-${idx}`}
            >
              {isFlipped ? card.emoji : '?'}
            </button>
          );
        })}
      </div>

      {complete && (
        <div className="text-center py-4 animate-fade-in-up">
          <p className="text-lg font-bold text-primary">All Pairs Found!</p>
          <p className="text-sm text-muted-foreground">{moves} moves in {time}s</p>
        </div>
      )}
    </div>
  );
}
