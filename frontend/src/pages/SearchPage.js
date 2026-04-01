import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search as SearchIcon, PawPrint, Users, FileText } from 'lucide-react';
import axios from 'axios';

export default function SearchPage() {
  const { authHeaders, API } = useAuth();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}&type=${type}`, { headers: authHeaders() });
      setResults(res.data);
    } catch {}
    setLoading(false);
  };

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'pets', label: 'Pets' },
    { value: 'users', label: 'People' },
    { value: 'breeders', label: 'Breeders' },
    { value: 'posts', label: 'Posts' },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="search-page">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Explore</h1>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search pets, breeders, people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-xl pl-10"
              data-testid="search-input"
            />
          </div>
          <Button type="submit" className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="search-submit-btn">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => { setType(t.value); if (query) handleSearch(); }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                type === t.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              data-testid={`search-tab-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        )}

        {results && !loading && (
          <div className="space-y-6">
            {(type === 'all' || type === 'pets') && results.pets?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><PawPrint className="w-4 h-4" /> Pets</h3>
                <div className="space-y-2">
                  {results.pets.map(p => (
                    <div key={p.pet_id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors" data-testid={`search-pet-${p.pet_id}`}>
                      <PawPrint className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.breed || p.species}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(type === 'all' || type === 'users') && results.users?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> People</h3>
                <div className="space-y-2">
                  {results.users.map(u => (
                    <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors" data-testid={`search-user-${u.user_id}`}>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden">
                        {u.picture ? <img src={u.picture} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.membership_tier?.toUpperCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(type === 'all' || type === 'posts') && results.posts?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Posts</h3>
                <div className="space-y-2">
                  {results.posts.map(p => (
                    <div key={p.post_id} className="p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors" data-testid={`search-post-${p.post_id}`}>
                      <p className="text-sm line-clamp-2">{p.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">by {p.author_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.values(results).every(arr => !arr?.length) && (
              <p className="text-center py-8 text-muted-foreground">No results found</p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
