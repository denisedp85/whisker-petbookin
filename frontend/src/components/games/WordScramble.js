import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Check, X, SkipForward } from 'lucide-react';
import axios from 'axios';

const BREEDS = [
  'LABRADOR', 'POODLE', 'BULLDOG', 'BEAGLE', 'HUSKY', 'CORGI', 'DALMATIAN',
  'TERRIER', 'SPANIEL', 'COLLIE', 'RETRIEVER', 'SHEPHERD', 'CHIHUAHUA',
  'PERSIAN', 'SIAMESE', 'BENGAL', 'RAGDOLL', 'SPHYNX', 'MAINE COON',
  'SHIBA INU', 'AKITA', 'ROTTWEILER', 'DOBERMAN', 'MALTESE', 'POMERANIAN',
  'BOXER', 'GREYHOUND', 'WHIPPET', 'MALAMUTE', 'SAMOYED',
];

function scramble(word) {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const scrambled = letters.join('');
  return scrambled === word ? scramble(word) : scrambled;
}

export default function WordScramble({ API, authHeaders, onDone, onBack }) {
  const [words, setWords] = useState([]);
  const [current, setCurrent] = useState(0);
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [time, setTime] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const TOTAL = 5;

  const init = useCallback(() => {
    const picked = [...BREEDS].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    setWords(picked.map(w => ({ word: w, scrambled: scramble(w.replace(' ', '')) })));
    setCurrent(0);
    setGuess('');
    setResults([]);
    setDone(false);
    setTime(0);
    setShowAnswer(false);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  }, []);

  useEffect(() => { init(); return () => clearInterval(timerRef.current); }, [init]);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [current]);

  const checkAnswer = () => {
    const correct = guess.toUpperCase().replace(/\s/g, '') === words[current].word.replace(/\s/g, '');
    const newResults = [...results, { word: words[current].word, guess: guess.toUpperCase(), correct }];
    setResults(newResults);
    setGuess('');
    setShowAnswer(false);

    if (current + 1 >= TOTAL) {
      setDone(true);
      clearInterval(timerRef.current);
      const correctCount = newResults.filter(r => r.correct).length;
      axios.post(`${API}/games/word-scramble/submit`, { correct: correctCount, total: TOTAL, time }, { headers: authHeaders() })
        .then(res => onDone(res.data))
        .catch(console.error);
    } else {
      setCurrent(c => c + 1);
    }
  };

  const skipWord = () => {
    setResults([...results, { word: words[current].word, guess: '', correct: false }]);
    setGuess('');
    setShowAnswer(false);
    if (current + 1 >= TOTAL) {
      setDone(true);
      clearInterval(timerRef.current);
      const correctCount = results.filter(r => r.correct).length;
      axios.post(`${API}/games/word-scramble/submit`, { correct: correctCount, total: TOTAL, time }, { headers: authHeaders() })
        .then(res => onDone(res.data))
        .catch(console.error);
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (words.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="word-scramble-game">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex gap-4 text-sm">
          <span>Word <strong>{Math.min(current + 1, TOTAL)}/{TOTAL}</strong></span>
          <span>Time: <strong>{time}s</strong></span>
          <span>Correct: <strong>{results.filter(r => r.correct).length}</strong></span>
        </div>
      </div>

      {!done && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-xs text-muted-foreground mb-2">Unscramble this pet breed:</p>
          <div className="flex justify-center gap-2 mb-6">
            {words[current].scrambled.split('').map((letter, i) => (
              <span key={`letter-${current}-${i}`} className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20">
                {letter}
              </span>
            ))}
          </div>

          {showAnswer && (
            <p className="text-sm text-muted-foreground mb-3">Hint: <strong>{words[current].word}</strong></p>
          )}

          <form onSubmit={(e) => { e.preventDefault(); checkAnswer(); }} className="flex gap-2 max-w-sm mx-auto">
            <Input
              ref={inputRef}
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              placeholder="Type your answer..."
              className="rounded-xl text-center font-bold tracking-wider uppercase"
              data-testid="scramble-input"
            />
            <Button type="submit" className="rounded-full bg-primary text-white" data-testid="scramble-submit">
              <Check className="w-4 h-4" />
            </Button>
          </form>

          <div className="flex justify-center gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowAnswer(true)} className="text-xs rounded-full">Show Hint</Button>
            <Button variant="ghost" size="sm" onClick={skipWord} className="text-xs rounded-full"><SkipForward className="w-3 h-3 mr-1" /> Skip</Button>
          </div>
        </div>
      )}

      {done && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center animate-fade-in-up">
          <p className="text-lg font-bold text-primary">{results.filter(r => r.correct).length}/{TOTAL} Correct!</p>
          <div className="mt-4 space-y-2 max-w-sm mx-auto text-left">
            {results.map((r, i) => (
              <div key={`result-${r.word}`} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${r.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {r.correct ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-500" />}
                <span>{r.word}</span>
                {!r.correct && r.guess && <span className="text-muted-foreground ml-auto text-xs">You: {r.guess}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(Math.min(current + 1, TOTAL) / TOTAL) * 100}%` }} />
      </div>
    </div>
  );
}
