import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Gamepad2, Trophy, Brain, Target, Puzzle, Calendar, Flame, Star, ArrowRight, Check, X, Heart, Coins, ShoppingCart, Award, Crown } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import PetMemory from '../components/games/PetMemory';
import WordScramble from '../components/games/WordScramble';
import PawMatch from '../components/games/PawMatch';

const GAME_ICONS = { brain: Brain, target: Target, puzzle: Puzzle, trophy: Trophy };

/* ─── TREAT CATCHER GAME ─── */
function TreatCatcher({ API, authHeaders, onDone, onBack }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [treats, setTreats] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const treatId = useRef(0);

  useEffect(() => {
    if (timeLeft <= 0) {
      setGameOver(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (gameOver) return;
    const spawner = setInterval(() => {
      treatId.current++;
      setTreats(prev => [...prev.filter(t => Date.now() - t.spawn < 2500), {
        id: treatId.current,
        x: 5 + Math.random() * 85,
        emoji: ['🦴', '🐟', '🥕', '🍖', '🧀'][Math.floor(Math.random() * 5)],
        spawn: Date.now(),
      }]);
    }, 700);
    return () => clearInterval(spawner);
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    (async () => {
      try {
        const res = await fetch(`${API}/games/treat-catcher/submit`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ score }),
        });
        if (res.ok) onDone(await res.json());
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const catchTreat = (id) => {
    setTreats(prev => prev.filter(t => t.id !== id));
    setScore(s => s + 1);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6" data-testid="treat-catcher-game">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">&larr; Back</button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold">Score: {score}</span>
          <span className={`text-sm font-bold ${timeLeft <= 5 ? 'text-red-500' : ''}`}>Time: {timeLeft}s</span>
        </div>
      </div>
      <div className="relative h-[300px] bg-gradient-to-b from-sky-100 to-green-50 rounded-xl overflow-hidden border border-border select-none" style={{ touchAction: 'manipulation' }}>
        {treats.map(t => (
          <button
            key={t.id}
            onClick={() => catchTreat(t.id)}
            className="absolute text-2xl animate-bounce cursor-pointer hover:scale-125 transition-transform"
            style={{ left: `${t.x}%`, top: `${Math.min(80, ((Date.now() - t.spawn) / 2500) * 100)}%` }}
          >
            {t.emoji}
          </button>
        ))}
        {gameOver && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-6 text-center shadow-lg">
              <p className="text-lg font-bold">Time's Up!</p>
              <p className="text-2xl font-bold text-primary mt-1">{score} treats caught</p>
              <p className="text-sm text-muted-foreground mt-1">Submitting score...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PET PUZZLE GAME (Sliding tile) ─── */
function PetPuzzle({ API, authHeaders, onDone, onBack }) {
  const size = 3;
  const initTiles = () => {
    let tiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1).concat([0]);
    // Shuffle
    for (let i = tiles.length - 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles;
  };

  const [tiles, setTiles] = useState(initTiles);
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(Date.now());
  const [solved, setSolved] = useState(false);

  const EMOJIS = ['', '🐕', '🐈', '🐦', '🐴', '🐰', '🐍', '🐟', '🐹'];

  const emptyIdx = tiles.indexOf(0);
  const row = Math.floor(emptyIdx / size);
  const col = emptyIdx % size;

  const canMove = (idx) => {
    const r = Math.floor(idx / size);
    const c = idx % size;
    return (Math.abs(r - row) + Math.abs(c - col)) === 1;
  };

  const moveTile = (idx) => {
    if (!canMove(idx) || solved) return;
    const newTiles = [...tiles];
    [newTiles[idx], newTiles[emptyIdx]] = [newTiles[emptyIdx], newTiles[idx]];
    setTiles(newTiles);
    setMoves(m => m + 1);

    // Check solved
    const isSolved = newTiles.every((t, i) => i === newTiles.length - 1 ? t === 0 : t === i + 1);
    if (isSolved) setSolved(true);
  };

  useEffect(() => {
    if (!solved) return;
    const time = Math.floor((Date.now() - startTime) / 1000);
    (async () => {
      try {
        const res = await fetch(`${API}/games/pet-puzzle/submit`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ moves, time }),
        });
        if (res.ok) onDone(await res.json());
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6" data-testid="pet-puzzle-game">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">&larr; Back</button>
        <span className="text-sm font-bold">Moves: {moves}</span>
      </div>
      <p className="text-xs text-muted-foreground text-center mb-3">Arrange tiles 1-8 in order. Click a tile next to the empty space to move it.</p>
      <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
        {tiles.map((tile, idx) => (
          <button
            key={idx}
            onClick={() => moveTile(idx)}
            disabled={tile === 0 || solved}
            className={`aspect-square rounded-xl text-lg font-bold flex items-center justify-center transition-all ${
              tile === 0 ? 'bg-transparent' : canMove(idx) ? 'bg-primary/10 border-2 border-primary/30 hover:bg-primary/20 cursor-pointer' : 'bg-muted border border-border'
            }`}
          >
            {tile !== 0 && <span>{EMOJIS[tile] || tile}</span>}
          </button>
        ))}
      </div>
      {solved && (
        <div className="text-center mt-4 animate-fade-in-up">
          <p className="text-lg font-bold text-primary">Puzzle Solved!</p>
          <p className="text-sm text-muted-foreground">{moves} moves &middot; Submitting...</p>
        </div>
      )}
    </div>
  );
}

/* ─── PET SHOW CHAMPION GAME ─── */
function PetShow({ API, authHeaders, onDone, onBack }) {
  const PETS = [
    { name: 'Golden Retriever', trait: 'Friendliness', emoji: '🐕' },
    { name: 'Persian Cat', trait: 'Elegance', emoji: '🐈' },
    { name: 'Macaw', trait: 'Color', emoji: '🦜' },
    { name: 'Corgi', trait: 'Cuteness', emoji: '🐕' },
    { name: 'Maine Coon', trait: 'Size', emoji: '🐈' },
    { name: 'Husky', trait: 'Energy', emoji: '🐕' },
    { name: 'Bengal Cat', trait: 'Pattern', emoji: '🐈' },
    { name: 'Pomeranian', trait: 'Fluffiness', emoji: '🐕' },
  ];

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [pair, setPair] = useState([]);
  const [done, setDone] = useState(false);
  const totalRounds = 5;

  useEffect(() => {
    if (round < totalRounds) {
      const shuffled = [...PETS].sort(() => Math.random() - 0.5);
      setPair([shuffled[0], shuffled[1]]);
    } else {
      setDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (!done) return;
    (async () => {
      try {
        const res = await fetch(`${API}/games/pet-show/submit`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: score * 20 }), // scale to 100
        });
        if (res.ok) onDone(await res.json());
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const pick = (idx) => {
    // "Correct" answer is randomized (50/50 chance, simulates judging)
    const correct = Math.random() > 0.4;
    if (correct) setScore(s => s + 1);
    setRound(r => r + 1);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6" data-testid="pet-show-game">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">&larr; Back</button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold">Score: {score}/{totalRounds}</span>
          <Badge className="text-xs">Round {Math.min(round + 1, totalRounds)}/{totalRounds}</Badge>
        </div>
      </div>
      {!done && pair.length === 2 && (
        <>
          <p className="text-center text-sm font-medium mb-4">Which pet wins for <span className="text-primary font-bold">{pair[0].trait}</span>?</p>
          <div className="grid grid-cols-2 gap-4">
            {pair.map((pet, idx) => (
              <button
                key={idx}
                onClick={() => pick(idx)}
                className="p-6 rounded-2xl border-2 border-border hover:border-primary hover:shadow-md transition-all text-center"
                data-testid={`show-pick-${idx}`}
              >
                <span className="text-4xl mb-2 block">{pet.emoji}</span>
                <p className="font-bold text-sm">{pet.name}</p>
              </button>
            ))}
          </div>
        </>
      )}
      {done && (
        <div className="text-center py-4 animate-fade-in-up">
          <p className="text-lg font-bold text-primary">Show Complete!</p>
          <p className="text-sm text-muted-foreground">{score}/{totalRounds} correct &middot; Submitting...</p>
        </div>
      )}
    </div>
  );
}

export default function GamesPage() {
  const { user, authHeaders, API, refreshUser } = useAuth();
  const [games, setGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('games');
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [quizState, setQuizState] = useState(null);
  const [activeGame, setActiveGame] = useState(null); // 'treat_catcher', 'pet_puzzle', 'pet_show'
  const [gameResult, setGameResult] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [gamesRes, lbRes, checkinRes] = await Promise.all([
        axios.get(`${API}/games/available`, { headers: authHeaders() }),
        axios.get(`${API}/games/leaderboard`, { headers: authHeaders() }),
        axios.get(`${API}/games/daily-checkin`, { headers: authHeaders() }),
      ]);
      setGames(gamesRes.data.games || []);
      setLeaderboard(lbRes.data.leaderboard || []);
      setCheckinStatus(checkinRes.data);
    } catch {}
    setLoading(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckin = async () => {
    try {
      const res = await axios.post(`${API}/games/daily-checkin`, {}, { headers: authHeaders() });
      toast.success(res.data.message);
      setCheckinStatus({ checked_in_today: true, streak: res.data.streak });
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Already checked in today');
    }
  };

  const startQuiz = async () => {
    try {
      const res = await axios.post(`${API}/games/breed-quiz/start`, {}, { headers: authHeaders() });
      setQuizState({
        sessionId: res.data.session_id,
        questions: res.data.questions,
        current: 0,
        answers: [],
        results: null,
      });
    } catch (e) {
      toast.error('Failed to start quiz');
    }
  };

  const answerQuestion = (answerIdx) => {
    setQuizState(prev => ({
      ...prev,
      answers: [...prev.answers, answerIdx],
      current: prev.current + 1,
    }));
  };

  const submitQuiz = async () => {
    try {
      const res = await axios.post(`${API}/games/breed-quiz/submit`, {
        session_id: quizState.sessionId,
        answers: quizState.answers,
      }, { headers: authHeaders() });
      setQuizState(prev => ({ ...prev, results: res.data }));
      refreshUser();
      fetchData();
    } catch (e) {
      toast.error('Failed to submit quiz');
    }
  };

  useEffect(() => {
    if (quizState && quizState.current >= quizState.questions?.length && !quizState.results) {
      submitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizState?.current]);

  const tabs = [
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'awards', label: 'Weekly Awards', icon: Award },
    { id: 'shop', label: 'Coin Shop', icon: Coins },
  ];

  // Lives & coins state
  const [livesData, setLivesData] = useState(null);
  const [coinPackages, setCoinPackages] = useState([]);
  const [weeklyAwards, setWeeklyAwards] = useState(null);

  const fetchLives = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/lives`, { headers: authHeaders() });
      setLivesData(res.data);
    } catch (e) { console.error(e); }
  }, [API, authHeaders]);

  const fetchCoinPackages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/coin-packages`, { headers: authHeaders() });
      setCoinPackages(res.data.packages || []);
    } catch (e) { console.error(e); }
  }, [API, authHeaders]);

  const fetchWeeklyAwards = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/games/weekly-awards`, { headers: authHeaders() });
      setWeeklyAwards(res.data);
    } catch (e) { console.error(e); }
  }, [API, authHeaders]);

  useEffect(() => { fetchLives(); fetchCoinPackages(); fetchWeeklyAwards(); }, [fetchLives, fetchCoinPackages, fetchWeeklyAwards]);

  const consumeLife = async () => {
    try {
      const res = await axios.post(`${API}/games/use-life`, {}, { headers: authHeaders() });
      setLivesData(prev => ({ ...prev, lives: res.data.lives }));
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'No lives remaining!');
      return false;
    }
  };

  const buyLife = async () => {
    try {
      const res = await axios.post(`${API}/games/buy-life`, {}, { headers: authHeaders() });
      setLivesData(prev => ({ ...prev, lives: res.data.lives }));
      toast.success(`Life purchased! (${res.data.coins} coins left)`);
      refreshUser();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Not enough coins');
    }
  };

  const buyCoins = async (packageId) => {
    try {
      const res = await axios.post(`${API}/games/buy-coins/${packageId}`, {}, { headers: authHeaders() });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (e) {
      toast.error('Checkout failed');
    }
  };

  const startGameWithLife = async (gameId) => {
    const ok = await consumeLife();
    if (ok) {
      if (gameId === 'breed_quiz') { startQuiz(); }
      else { setActiveGame(gameId); setGameResult(null); }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="games-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Games & Points</h1>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-secondary fill-secondary" />
            <span className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>{user?.points || 0}</span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
        </div>

        {/* Lives & Coins Bar */}
        {livesData && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between flex-wrap gap-3" data-testid="lives-bar">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <div className="flex gap-0.5">
                  {Array.from({ length: livesData.max_lives }).map((_, i) => (
                    <div key={`life-${i}`} className={`w-3 h-3 rounded-full transition-all ${i < livesData.lives ? 'bg-red-500' : 'bg-muted'}`} />
                  ))}
                </div>
                <span className="text-xs font-medium">{livesData.lives}/{livesData.max_lives}</span>
                {livesData.lives < livesData.max_lives && livesData.minutes_until_next > 0 && (
                  <span className="text-[10px] text-muted-foreground">Next in {livesData.minutes_until_next}m</span>
                )}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-sm">{user?.coins || 0}</span>
                <span className="text-[10px] text-muted-foreground">coins</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {livesData.lives === 0 && (
                <Button onClick={buyLife} size="sm" variant="outline" className="rounded-full text-xs gap-1.5" data-testid="buy-life-btn">
                  <Heart className="w-3 h-3" /> Buy Life (20 coins)
                </Button>
              )}
              <Button onClick={() => setActiveTab('shop')} size="sm" variant="outline" className="rounded-full text-xs gap-1.5" data-testid="go-to-shop-btn">
                <ShoppingCart className="w-3 h-3" /> Coin Shop
              </Button>
            </div>
          </div>
        )}

        {/* Daily Check-in */}
        {checkinStatus && (
          <div className="rounded-2xl border border-border bg-gradient-to-r from-secondary/5 via-card to-primary/5 p-5" data-testid="daily-checkin">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Daily Check-in</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs text-muted-foreground">{checkinStatus.streak || 0} day streak</span>
                  </div>
                </div>
              </div>
              {checkinStatus.checked_in_today ? (
                <Badge className="bg-green-100 text-green-700">Checked In</Badge>
              ) : (
                <Button onClick={handleCheckin} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs" data-testid="checkin-btn">
                  Check In (+{Math.min((checkinStatus.streak || 0) * 5 + 5, 50)} pts)
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`games-tab-${t.id}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <>
            {/* Games grid */}
            {activeTab === 'games' && !quizState && (
              <div className="grid sm:grid-cols-2 gap-4" data-testid="games-grid">
                {games.map(g => {
                  const Icon = GAME_ICONS[g.icon] || Gamepad2;
                  return (
                    <div key={g.game_id} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-all" data-testid={`game-${g.game_id}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>{g.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <Badge variant="outline" className="text-[10px]">{g.category}</Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Star className="w-3 h-3 text-secondary fill-secondary" /> {g.points_per_win} pts/win
                            </span>
                          </div>
                        </div>
                      </div>
                      {g.game_id === 'breed_quiz' ? (
                        <Button onClick={() => startGameWithLife('breed_quiz')} className="w-full mt-4 rounded-full bg-primary text-white hover:bg-primary/90 text-xs" data-testid="play-breed-quiz">
                          Play Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button onClick={() => startGameWithLife(g.game_id)} className="w-full mt-4 rounded-full bg-primary text-white hover:bg-primary/90 text-xs" data-testid={`play-${g.game_id}`}>
                          Play Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quiz game */}
            {activeTab === 'games' && quizState && !quizState.results && quizState.current < quizState.questions.length && (
              <div className="rounded-2xl border border-border bg-card p-8" data-testid="breed-quiz-active">
                <div className="text-center mb-6">
                  <Badge className="text-xs mb-2">Question {quizState.current + 1} of {quizState.questions.length}</Badge>
                  <h2 className="text-lg font-bold mt-2" style={{ fontFamily: 'Outfit' }}>
                    {quizState.questions[quizState.current].question}
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {quizState.questions[quizState.current].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => answerQuestion(idx)}
                      className="p-4 rounded-xl border border-border text-left text-sm font-medium hover:bg-primary/5 hover:border-primary transition-all"
                      data-testid={`quiz-option-${idx}`}
                    >
                      <span className="text-primary font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-6">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${((quizState.current) / quizState.questions.length) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Quiz results */}
            {quizState?.results && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center" data-testid="breed-quiz-results">
                <Trophy className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>
                  {quizState.results.score}/{quizState.results.total} Correct!
                </h2>
                <p className="text-primary font-bold text-lg mt-1">+{quizState.results.points_earned} points</p>
                <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                  {quizState.results.results.map((r, i) => (
                    <div key={`result-${i}-${r.question?.slice(0,10)}`} className={`flex items-center gap-2 p-3 rounded-xl text-sm ${r.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {r.is_correct ? <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> : <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span className="truncate">{r.question}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={() => setQuizState(null)} className="mt-6 rounded-full bg-primary text-white hover:bg-primary/90" data-testid="quiz-done-btn">
                  Back to Games
                </Button>
              </div>
            )}

            {/* Treat Catcher Game */}
            {activeTab === 'games' && activeGame === 'treat_catcher' && <TreatCatcher API={API} authHeaders={authHeaders} onDone={(result) => { setGameResult(result); setActiveGame(null); refreshUser(); fetchData(); }} onBack={() => setActiveGame(null)} />}

            {/* Pet Puzzle Game */}
            {activeTab === 'games' && activeGame === 'pet_puzzle' && <PetPuzzle API={API} authHeaders={authHeaders} onDone={(result) => { setGameResult(result); setActiveGame(null); refreshUser(); fetchData(); }} onBack={() => setActiveGame(null)} />}

            {/* Pet Show Game */}
            {activeTab === 'games' && activeGame === 'pet_show' && <PetShow API={API} authHeaders={authHeaders} onDone={(result) => { setGameResult(result); setActiveGame(null); refreshUser(); fetchData(); fetchLives(); }} onBack={() => setActiveGame(null)} />}

            {/* Paw Match Game */}
            {activeTab === 'games' && activeGame === 'paw_match' && <PawMatch API={API} authHeaders={authHeaders} onDone={(result) => { setGameResult(result); setActiveGame(null); refreshUser(); fetchData(); fetchLives(); }} onBack={() => setActiveGame(null)} />}

            {/* Pet Memory Game */}
            {activeTab === 'games' && activeGame === 'pet_memory' && <PetMemory API={API} authHeaders={authHeaders} onDone={(result) => { setGameResult(result); setActiveGame(null); refreshUser(); fetchData(); fetchLives(); }} onBack={() => setActiveGame(null)} />}

            {/* Word Scramble Game */}
            {activeTab === 'games' && activeGame === 'word_scramble' && <WordScramble API={API} authHeaders={authHeaders} onDone={(result) => { setGameResult(result); setActiveGame(null); refreshUser(); fetchData(); fetchLives(); }} onBack={() => setActiveGame(null)} />}

            {/* Game Result */}
            {gameResult && !activeGame && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center animate-fade-in-up" data-testid="game-result">
                <Trophy className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>Game Complete!</h2>
                <p className="text-primary font-bold text-lg mt-1">+{gameResult.points_earned} points</p>
                <Button onClick={() => setGameResult(null)} className="mt-4 rounded-full bg-primary text-white hover:bg-primary/90 text-xs" data-testid="game-result-back">
                  Back to Games
                </Button>
              </div>
            )}

            {/* Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden" data-testid="leaderboard">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-12">No one on the leaderboard yet. Play some games!</p>
                ) : (
                  <div>
                    {leaderboard.map((p, i) => (
                      <div key={p.user_id} className={`flex items-center gap-4 px-6 py-4 ${i < leaderboard.length - 1 ? 'border-b border-border' : ''}`} data-testid={`lb-rank-${i + 1}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-secondary text-secondary-foreground' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                        }`}>{i + 1}</span>
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden">
                          {p.picture ? <img src={p.picture} alt="" className="w-full h-full object-cover" /> : p.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{p.name}</p>
                          {p.membership_tier && p.membership_tier !== 'free' && (
                            <Badge variant="outline" className="text-[9px] mt-0.5">{p.membership_tier.toUpperCase()}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-secondary fill-secondary" />
                          <span className="font-bold">{p.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Weekly Awards */}
            {activeTab === 'awards' && (
              <div className="space-y-6" data-testid="weekly-awards">
                <div className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 to-primary/5 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Crown className="w-6 h-6 text-secondary" />
                    <h2 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>This Week's Champions</h2>
                  </div>
                  {weeklyAwards?.current_week?.length > 0 ? (
                    <div className="space-y-3">
                      {weeklyAwards.current_week.map((w, i) => (
                        <div key={w.user_id} className={`flex items-center gap-4 p-4 rounded-xl ${
                          i === 0 ? 'bg-secondary/10 border-2 border-secondary/30' : i === 1 ? 'bg-gray-100 border border-gray-200' : i === 2 ? 'bg-amber-50 border border-amber-200' : 'bg-card border border-border'
                        }`} data-testid={`award-rank-${i + 1}`}>
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            i === 0 ? 'bg-secondary text-white text-lg' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-200 text-amber-800' : 'bg-muted text-muted-foreground text-sm'
                          }`}>
                            {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{w.name}</p>
                            <p className="text-[10px] text-muted-foreground">{w.games_played} games played</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{w.weekly_points} pts</p>
                            {i < 3 && <Badge className="text-[9px] bg-secondary/10 text-secondary mt-0.5">Champion</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">No games played this week yet. Be the first!</p>
                  )}
                </div>

                {weeklyAwards?.previous_awards?.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Previous Winners</h3>
                    <div className="space-y-3">
                      {weeklyAwards.previous_awards.map((a, i) => (
                        <div key={a.week_ending || `prev-${i}`} className="flex items-center justify-between p-3 rounded-xl border border-border text-sm">
                          <span className="text-muted-foreground">{a.week_ending}</span>
                          <span className="font-medium">{a.winner_name}</span>
                          <Badge variant="outline">{a.points} pts</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coin Shop */}
            {activeTab === 'shop' && (
              <div className="space-y-6" data-testid="coin-shop">
                <div className="rounded-2xl border border-border bg-card p-6 text-center">
                  <Coins className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{user?.coins || 0} Coins</p>
                  <p className="text-xs text-muted-foreground mt-1">Use coins to buy extra lives and power-ups</p>
                </div>

                <h3 className="font-semibold" style={{ fontFamily: 'Outfit' }}>Buy Coins</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {coinPackages.map(pkg => (
                    <div key={pkg.package_id} className="rounded-2xl border-2 border-border bg-card p-6 text-center hover:border-primary/50 hover:shadow-md transition-all" data-testid={`coin-pkg-${pkg.package_id}`}>
                      <Coins className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <p className="font-bold text-lg">{pkg.label}</p>
                      <p className="text-2xl font-bold text-primary mt-1">${(pkg.stripe_amount / 100).toFixed(2)}</p>
                      <Button onClick={() => buyCoins(pkg.package_id)} className="w-full mt-4 rounded-full bg-primary text-white hover:bg-primary/90 text-xs" data-testid={`buy-${pkg.package_id}`}>
                        Purchase
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>What can coins buy?</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 text-sm">
                      <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> Extra Life</div>
                      <span className="font-bold">20 coins</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
