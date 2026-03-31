import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { PawPrint, Search as SearchIcon, Shield } from 'lucide-react';
import axios from 'axios';

export default function SearchPage() {
  const { API } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [species, setSpecies] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q, species);
    }
  }, [searchParams]); // eslint-disable-line

  const performSearch = async (q, sp) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (sp) params.set('species', sp);
      const res = await axios.get(`${API}/pets?${params.toString()}`);
      setResults(res.data);
    } catch (e) {
      console.error('Search failed', e);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
    performSearch(query, species);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#050505] font-['Archivo_Narrow'] mb-4">Search Pets</h1>

        {/* Search Form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6" data-testid="search-form">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                data-testid="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or breed..."
                className="pl-9 bg-gray-50 border-gray-300 focus:border-[#4080ff]"
              />
            </div>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger data-testid="search-species-filter" className="w-40 bg-gray-50 border-gray-300">
                <SelectValue placeholder="All Species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Species</SelectItem>
                <SelectItem value="Dog">Dogs</SelectItem>
                <SelectItem value="Cat">Cats</SelectItem>
                <SelectItem value="Bird">Birds</SelectItem>
                <SelectItem value="Fish">Fish</SelectItem>
                <SelectItem value="Reptile">Reptiles</SelectItem>
                <SelectItem value="Small Animal">Small Animals</SelectItem>
              </SelectContent>
            </Select>
            <Button data-testid="search-submit-btn" type="submit" className="bg-[#4080ff] hover:bg-[#3b5998] text-white gap-1.5">
              <SearchIcon className="w-4 h-4" /> Search
            </Button>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full" />
          </div>
        ) : searched && results.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
            <PawPrint className="w-12 h-12 text-[#bcc0c4] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#050505]">No pets found</h3>
            <p className="text-sm text-[#65676b] mt-1">Try different search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map(pet => (
              <Link key={pet.pet_id} to={`/profile/${pet.pet_id}`} data-testid={`search-result-${pet.pet_id}`}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="h-24 bg-gradient-to-r from-[#3b5998]/10 to-[#4080ff]/10 flex items-center justify-center">
                  <PawPrint className="w-10 h-10 text-[#4080ff]/50" />
                </div>
                <div className="p-4 -mt-8 relative">
                  <div className="w-14 h-14 rounded-md bg-white border-2 border-white shadow-sm flex items-center justify-center mb-2 overflow-hidden">
                    <div className="w-full h-full bg-[#4080ff]/10 flex items-center justify-center">
                      <PawPrint className="w-7 h-7 text-[#4080ff]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#050505]">{pet.name}</h3>
                    {pet.is_breeder_profile && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> Breeder
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#65676b] mt-0.5">
                    {pet.breed && <span>{pet.breed} &middot; </span>}{pet.species}
                    {pet.age && <span> &middot; {pet.age}</span>}
                  </p>
                  {pet.bio && <p className="text-xs text-[#65676b] mt-1.5 line-clamp-2">{pet.bio}</p>}
                  <div className="flex gap-3 mt-2 text-xs text-[#65676b]">
                    <span>{pet.friends_count || 0} friends</span>
                    <span>{pet.posts_count || 0} posts</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
