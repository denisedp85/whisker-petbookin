import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import axios from 'axios';

const TILES = ['🦴', '🐾', '🎾', '🐟', '🥩', '🧶'];
const GRID_SIZE = 7;
const GAME_TIME = 60;

function createBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => TILES[Math.floor(Math.random() * TILES.length)])
  );
}

function findMatches(board) {
  const matches = new Set();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE - 2; c++) {
      if (board[r][c] && board[r][c] === board[r][c + 1] && board[r][c] === board[r][c + 2]) {
        matches.add(`${r},${c}`); matches.add(`${r},${c + 1}`); matches.add(`${r},${c + 2}`);
      }
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE - 2; r++) {
      if (board[r][c] && board[r][c] === board[r + 1][c] && board[r][c] === board[r + 2][c]) {
        matches.add(`${r},${c}`); matches.add(`${r + 1},${c}`); matches.add(`${r + 2},${c}`);
      }
    }
  }
  return matches;
}

function removeAndDrop(board) {
  const newBoard = board.map(r => [...r]);
  const matches = findMatches(newBoard);
  if (matches.size === 0) return { board: newBoard, cleared: 0 };
  for (const key of matches) {
    const [r, c] = key.split(',').map(Number);
    newBoard[r][c] = null;
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let writeRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (newBoard[r][c] !== null) {
        newBoard[writeRow][c] = newBoard[r][c];
        if (writeRow !== r) newBoard[r][c] = null;
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      newBoard[r][c] = TILES[Math.floor(Math.random() * TILES.length)];
    }
  }
  return { board: newBoard, cleared: matches.size };
}

function initBoard() {
  let board = createBoard();
  let safety = 0;
  while (findMatches(board).size > 0 && safety < 50) {
    const result = removeAndDrop(board);
    board = result.board;
    safety++;
  }
  return board;
}

export default function PawMatch({ API, authHeaders, onDone, onBack }) {
  const [board, setBoard] = useState(() => initBoard());
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [time, setTime] = useState(GAME_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (gameOver) {
      axios.post(`${API}/games/paw-match/submit`, { score, level }, { headers: authHeaders() })
        .then(res => onDone(res.data))
        .catch(console.error);
    }
  }, [gameOver, API, authHeaders, score, level, onDone]);

  const swap = useCallback((r1, c1, r2, c2) => {
    const newBoard = board.map(r => [...r]);
    [newBoard[r1][c1], newBoard[r2][c2]] = [newBoard[r2][c2], newBoard[r1][c1]];
    return newBoard;
  }, [board]);

  const processMatches = useCallback((b) => {
    setAnimating(true);
    let currentBoard = b;
    let totalCleared = 0;
    let chain = 0;

    const process = () => {
      const { board: newBoard, cleared } = removeAndDrop(currentBoard);
      if (cleared > 0) {
        totalCleared += cleared;
        chain++;
        currentBoard = newBoard;
        setBoard(newBoard);
        setScore(s => s + cleared * 10 * chain);
        setTimeout(process, 300);
      } else {
        setAnimating(false);
        if (totalCleared >= 30) setLevel(l => l + 1);
      }
    };
    process();
  }, []);

  const handleClick = (r, c) => {
    if (gameOver || animating) return;
    if (!selected) {
      setSelected({ r, c });
      return;
    }
    const dr = Math.abs(selected.r - r);
    const dc = Math.abs(selected.c - c);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      const newBoard = swap(selected.r, selected.c, r, c);
      if (findMatches(newBoard).size > 0) {
        setBoard(newBoard);
        processMatches(newBoard);
      }
    }
    setSelected(null);
  };

  const restart = () => {
    setBoard(initBoard());
    setScore(0);
    setLevel(1);
    setTime(GAME_TIME);
    setGameOver(false);
    setSelected(null);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(timerRef.current); setGameOver(true); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  return (
    <div className="space-y-4" data-testid="paw-match-game">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex gap-4 text-sm font-medium">
          <span>Score: <strong className="text-primary">{score}</strong></span>
          <span>Level: <strong>{level}</strong></span>
          <span className={`${time <= 10 ? 'text-red-500 animate-pulse' : ''}`}>Time: <strong>{time}s</strong></span>
        </div>
        <Button variant="ghost" size="sm" onClick={restart} className="rounded-full"><RotateCcw className="w-4 h-4" /></Button>
      </div>

      <div className="flex justify-center">
        <div className="inline-grid gap-1 p-3 bg-card rounded-2xl border border-border" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {board.map((row, r) => row.map((tile, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-xl flex items-center justify-center transition-all duration-200 ${
                selected?.r === r && selected?.c === c
                  ? 'bg-primary/20 border-2 border-primary scale-110 shadow-md'
                  : 'bg-muted/50 border border-border hover:bg-muted hover:scale-105'
              }`}
              disabled={gameOver || animating}
              data-testid={`paw-tile-${r}-${c}`}
            >
              {tile}
            </button>
          )))}
        </div>
      </div>

      {gameOver && (
        <div className="text-center py-4 animate-fade-in-up">
          <p className="text-lg font-bold text-primary">Time's Up!</p>
          <p className="text-sm text-muted-foreground">Score: {score} &middot; Level {level}</p>
        </div>
      )}

      <div className="w-full bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(time / GAME_TIME) * 100}%` }} />
      </div>
    </div>
  );
}
