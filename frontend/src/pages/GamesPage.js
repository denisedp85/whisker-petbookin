import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Gamepad2, Trophy, Brain, Target, Puzzle, Calendar, Flame, Star, ArrowRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const GAME_ICONS = { brain: Brain, target: Target, puzzle: Puzzle, trophy: Trophy };

export default function GamesPage() {
  const { user, authHeaders, API, refreshUser } = useAuth();
  const [games, setGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('games');
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [quizState, setQuizState] = useState(null); // { sessionId, questions, current, answers, results }

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
  }, [quizState?.current]);

  const tabs = [
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

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
                        <Button onClick={startQuiz} className="w-full mt-4 rounded-full bg-primary text-white hover:bg-primary/90 text-xs" data-testid="play-breed-quiz">
                          Play Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button disabled className="w-full mt-4 rounded-full text-xs" variant="outline" data-testid={`play-${g.game_id}`}>
                          Coming Soon
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
                    <div key={i} className={`flex items-center gap-2 p-3 rounded-xl text-sm ${r.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
