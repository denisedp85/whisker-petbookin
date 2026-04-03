import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Trophy, Star, Clock, Users, ThumbsUp, Camera, Brain, Heart,
  Plus, ArrowRight, Medal, Crown, Flame, ChevronDown, ChevronUp,
  Sparkles, Award
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const TYPE_ICONS = { breed_show: Camera, pet_show: Heart, breed_quiz: Brain };
const TYPE_COLORS = {
  breed_show: 'from-amber-500/10 to-orange-500/10 border-amber-300/40',
  pet_show: 'from-pink-500/10 to-rose-500/10 border-pink-300/40',
  breed_quiz: 'from-blue-500/10 to-indigo-500/10 border-blue-300/40',
};

function CountdownTimer({ endDate }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endDate) - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
      <Clock className="w-3 h-3" /> {timeLeft}
    </span>
  );
}

function TopContributorBanner({ API, authHeaders }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/tournaments/top-contributor`, { headers: authHeaders() });
        if (res.data.top_contributor) setData(res.data);
      } catch (e) { console.error(e); }
    })();
  }, [API, authHeaders]);

  if (!data?.top_contributor) return null;
  const tc = data.top_contributor;

  return (
    <div className="rounded-2xl border-2 border-amber-300/50 bg-gradient-to-r from-amber-50 via-white to-yellow-50 p-5 animate-fade-in-up" data-testid="top-contributor-banner">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-amber-500" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-amber-600">Top Contributor of the Week</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-amber-300">
          {tc.picture ? (
            <img src={tc.picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <Crown className="w-7 h-7 text-amber-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>{tc.name}</h3>
            {tc.membership_tier && tc.membership_tier !== 'free' && (
              <Badge variant="outline" className="text-[10px]">{tc.membership_tier.toUpperCase()}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{tc.weekly_score} points earned this week</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 text-amber-600">
            <Star className="w-5 h-5 fill-current" />
            <span className="text-lg font-bold">#1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntryForm({ tournament, pets, API, authHeaders, onSubmitted }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedPet, setSelectedPet] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() && tournament.tournament_type !== 'breed_quiz') {
      toast.error('Entry title is required');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/tournaments/enter`, {
        tournament_id: tournament.tournament_id,
        title,
        description,
        media_url: mediaUrl,
        pet_id: selectedPet,
      }, { headers: authHeaders() });
      toast.success('Entry submitted!');
      onSubmitted();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit entry');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-3 mt-4 p-4 rounded-xl bg-muted/30 border border-border" data-testid="entry-form">
      <h4 className="text-sm font-semibold">Submit Your Entry</h4>
      <Input
        placeholder="Entry title (e.g., 'My Golden at Sunset')"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="entry-title-input"
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-[60px] resize-none"
        data-testid="entry-description-input"
      />
      {tournament.tournament_type !== 'breed_quiz' && (
        <Input
          placeholder="Photo/Media URL (optional)"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          data-testid="entry-media-input"
        />
      )}
      {pets.length > 0 && (
        <select
          value={selectedPet}
          onChange={(e) => setSelectedPet(e.target.value)}
          className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background"
          data-testid="entry-pet-select"
        >
          <option value="">Tag a pet (optional)</option>
          {pets.map(p => <option key={p.pet_id} value={p.pet_id}>{p.name}</option>)}
        </select>
      )}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-full bg-primary text-white hover:bg-primary/90 text-xs"
        data-testid="entry-submit-btn"
      >
        {submitting ? 'Submitting...' : 'Submit Entry'}
      </Button>
    </div>
  );
}

function EntriesList({ tournament, API, authHeaders, refreshParent }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tournaments/${tournament.tournament_id}/entries`, { headers: authHeaders() });
      setEntries(res.data.entries || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [API, authHeaders, tournament.tournament_id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleVote = async (entryId) => {
    try {
      const res = await axios.post(
        `${API}/tournaments/${tournament.tournament_id}/vote/${entryId}`,
        {},
        { headers: authHeaders() }
      );
      setEntries(prev => prev.map(e => {
        if (e.entry_id !== entryId) return e;
        return { ...e, votes_count: res.data.votes_count, user_voted: res.data.voted };
      }));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to vote');
    }
  };

  if (loading) return <div className="py-4 text-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>;

  if (entries.length === 0) return (
    <p className="text-center text-sm text-muted-foreground py-4">No entries yet. Be the first!</p>
  );

  return (
    <div className="space-y-3 mt-4" data-testid="entries-list">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Users className="w-4 h-4" /> {entries.length} Entries
      </h4>
      {entries.map((entry, idx) => (
        <div key={entry.entry_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border" data-testid={`entry-${entry.entry_id}`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
            idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
          }`}>{idx + 1}</span>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden flex-shrink-0">
            {entry.user_picture ? <img src={entry.user_picture} alt="" className="w-full h-full object-cover" /> : entry.user_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{entry.title}</p>
            <p className="text-xs text-muted-foreground">{entry.user_name}{entry.pet_name ? ` with ${entry.pet_name}` : ''}</p>
          </div>
          {entry.media_url && (
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
              <img src={entry.media_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}
          <button
            onClick={() => handleVote(entry.entry_id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              entry.user_voted
                ? 'bg-primary text-white'
                : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'
            }`}
            data-testid={`vote-btn-${entry.entry_id}`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{entry.votes_count || 0}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function WeeklyLeaderboard({ API, authHeaders }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/tournaments/top-contributor`, { headers: authHeaders() });
        setData(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [API, authHeaders]);

  if (loading) return <div className="py-8 text-center"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>;

  const topList = data?.top_10 || [];

  if (topList.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <Flame className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No activity this week yet. Play games, post, and check in to earn points!</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" data-testid="weekly-leaderboard">
      {topList.map((p, i) => (
        <div key={p.user_id} className={`flex items-center gap-4 px-5 py-3.5 ${i < topList.length - 1 ? 'border-b border-border' : ''}`} data-testid={`weekly-rank-${i + 1}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
          }`}>{i + 1}</span>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden">
            {p.picture ? <img src={p.picture} alt="" className="w-full h-full object-cover" /> : p.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{p.name}</p>
              {p.badges?.length > 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
            </div>
            {p.membership_tier && p.membership_tier !== 'free' && (
              <Badge variant="outline" className="text-[9px] mt-0.5">{p.membership_tier.toUpperCase()}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-sm">{p.weekly_score}</span>
            <span className="text-[10px] text-muted-foreground">pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TournamentsPage() {
  const { user, pets, authHeaders, API } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [tournaments, setTournaments] = useState([]);
  const [pastTournaments, setPastTournaments] = useState([]);
  const [hallOfFame, setHallOfFame] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTournament, setExpandedTournament] = useState(null);
  const [showEntryForm, setShowEntryForm] = useState(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tournaments/active`, { headers: authHeaders() });
      setTournaments(res.data.tournaments || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [API, authHeaders]);

  const fetchPast = useCallback(async () => {
    try {
      const [pastRes, hofRes] = await Promise.all([
        axios.get(`${API}/tournaments/past`, { headers: authHeaders() }),
        axios.get(`${API}/tournaments/hall-of-fame`, { headers: authHeaders() }),
      ]);
      setPastTournaments(pastRes.data.tournaments || []);
      setHallOfFame(hofRes.data.champions || []);
    } catch (e) { console.error(e); }
  }, [API, authHeaders]);

  useEffect(() => {
    fetchActive();
    fetchPast();
  }, [fetchActive, fetchPast]);

  const toggleExpand = (tid) => {
    setExpandedTournament(prev => prev === tid ? null : tid);
    setShowEntryForm(null);
  };

  const tabs = [
    { id: 'active', label: 'Active', icon: Trophy },
    { id: 'leaderboard', label: 'Weekly Top 10', icon: Flame },
    { id: 'hall-of-fame', label: 'Hall of Fame', icon: Medal },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="tournaments-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Tournaments</h1>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>{user?.points || 0}</span>
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
        </div>

        {/* Top Contributor Banner */}
        <TopContributorBanner API={API} authHeaders={authHeaders} />

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`tab-${t.id}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <>
            {/* Active Tournaments */}
            {activeTab === 'active' && (
              <div className="space-y-4" data-testid="active-tournaments">
                {tournaments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No active tournaments right now. Check back soon!</p>
                  </div>
                ) : (
                  tournaments.map(t => {
                    const Icon = TYPE_ICONS[t.tournament_type] || Trophy;
                    const colorClass = TYPE_COLORS[t.tournament_type] || TYPE_COLORS.pet_show;
                    const isExpanded = expandedTournament === t.tournament_id;

                    return (
                      <div key={t.tournament_id} className={`rounded-2xl border bg-gradient-to-br ${colorClass} overflow-hidden transition-all`} data-testid={`tournament-${t.tournament_id}`}>
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center flex-shrink-0 border border-white/50">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-base" style={{ fontFamily: 'Outfit' }}>{t.title}</h3>
                                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                              <div className="flex items-center gap-4 mt-3">
                                <CountdownTimer endDate={t.end_date} />
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="w-3 h-3" /> {t.entry_count || 0} entries
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Trophy className="w-3 h-3" /> 500 pts + tier upgrade
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            {t.user_entered ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">Entered</Badge>
                            ) : (
                              <Button
                                onClick={() => setShowEntryForm(showEntryForm === t.tournament_id ? null : t.tournament_id)}
                                className="rounded-full bg-primary text-white hover:bg-primary/90 text-xs"
                                data-testid={`enter-tournament-${t.tournament_id}`}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Enter Now
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              onClick={() => toggleExpand(t.tournament_id)}
                              className="rounded-full text-xs ml-auto"
                              data-testid={`expand-tournament-${t.tournament_id}`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {isExpanded ? 'Hide' : 'View'} Entries
                            </Button>
                          </div>

                          {/* Entry Form */}
                          {showEntryForm === t.tournament_id && !t.user_entered && (
                            <EntryForm
                              tournament={t}
                              pets={pets}
                              API={API}
                              authHeaders={authHeaders}
                              onSubmitted={() => { setShowEntryForm(null); fetchActive(); }}
                            />
                          )}

                          {/* Entries */}
                          {isExpanded && (
                            <EntriesList
                              tournament={t}
                              API={API}
                              authHeaders={authHeaders}
                              refreshParent={fetchActive}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Weekly Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Outfit' }}>This Week's Top Contributors</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Earn points by playing games, posting, getting likes, daily check-ins, and winning tournaments.
                </p>
                <WeeklyLeaderboard API={API} authHeaders={authHeaders} />
              </div>
            )}

            {/* Hall of Fame */}
            {activeTab === 'hall-of-fame' && (
              <div className="space-y-4" data-testid="hall-of-fame">
                <div className="flex items-center gap-2 mb-2">
                  <Medal className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold" style={{ fontFamily: 'Outfit' }}>Tournament Champions</h2>
                </div>
                {hallOfFame.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No champions yet. Tournaments are just getting started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hallOfFame.map((champ, i) => (
                      <div key={c?.user_id || `champ-${i}`} className="rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-white p-4 flex items-center gap-4" data-testid={`champion-${i}`}>
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-amber-300">
                          {champ.winner_picture ? (
                            <img src={champ.winner_picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Crown className="w-6 h-6 text-amber-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">{champ.winner_name}</p>
                            {champ.winner_tier && champ.winner_tier !== 'free' && (
                              <Badge variant="outline" className="text-[9px]">{champ.winner_tier.toUpperCase()}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{champ.tournament_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className="text-[9px] bg-amber-100 text-amber-700">{champ.category}</Badge>
                            <span className="text-[10px] text-muted-foreground">{champ.votes} votes</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Trophy className="w-4 h-4" />
                            <span className="text-sm font-bold">+{champ.points_awarded}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past Tournaments Summary */}
                {pastTournaments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Past Tournaments</h3>
                    <div className="space-y-2">
                      {pastTournaments.map(t => (
                        <div key={t.tournament_id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 text-sm" data-testid={`past-tournament-${t.tournament_id}`}>
                          <Trophy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate">{t.title}</span>
                          <Badge variant="outline" className="text-[9px]">{t.entry_count || 0} entries</Badge>
                          {t.winners?.[0] && (
                            <span className="text-xs text-amber-600 font-medium">Won by {t.winners[0].user_name}</span>
                          )}
                        </div>
                      ))}
                    </div>
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
