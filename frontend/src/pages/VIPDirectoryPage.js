import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Shield, Search, Lock, Crown, MapPin, Award, Mail, Phone,
  MessageCircle, Star, Filter, ChevronDown, Sparkles, Loader2, Eye, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const SPECIES_FILTERS = ['All', 'Dogs', 'Cats', 'Birds', 'Reptiles', 'Fish', 'Rabbits', 'Horses', 'Other'];

export default function VIPDirectoryPage() {
  const { user, authHeaders, API } = useAuth();
  const [breeders, setBreeders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [selectedBreeder, setSelectedBreeder] = useState(null);
  const [hasVipAccess, setHasVipAccess] = useState(false);
  const [vipExpiry, setVipExpiry] = useState(null);
  const [loadingPass, setLoadingPass] = useState(false);

  const userTier = user?.membership_tier || 'free';
  const isPaidSubscriber = userTier !== 'free';
  const canViewContacts = isPaidSubscriber || hasVipAccess;

  const fetchBreeders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (speciesFilter !== 'All') params.set('species', speciesFilter.toLowerCase());
      const res = await axios.get(`${API}/breeder/vip-directory?${params}`, { headers: authHeaders() });
      setBreeders(res.data.breeders || []);
      setHasVipAccess(res.data.has_vip_access || false);
      setVipExpiry(res.data.vip_expiry || null);
    } catch (e) {
      console.error('Failed to load directory', e);
    }
    setLoading(false);
  }, [API, authHeaders, search, speciesFilter]);

  useEffect(() => { fetchBreeders(); }, [fetchBreeders]);

  const handlePurchasePass = async () => {
    setLoadingPass(true);
    try {
      const res = await axios.post(`${API}/stripe/purchase-vip-pass`, {
        origin_url: window.location.origin
      }, { headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to purchase VIP pass');
    }
    setLoadingPass(false);
  };

  const daysLeft = vipExpiry ? Math.max(0, Math.ceil((new Date(vipExpiry) - Date.now()) / 86400000)) : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6" data-testid="vip-directory-page">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" /> VIP Breeder Directory
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'Outfit' }}>
            Find Your <span className="text-primary">Perfect Breeder</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Browse verified breeders, view their credentials, and connect directly. Premium access unlocks breeder contact info.
          </p>
        </div>

        {/* Access status banner */}
        {!canViewContacts ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60" data-testid="vip-upgrade-banner">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Unlock Breeder Contact Info</p>
                <p className="text-xs text-muted-foreground">Subscribe to any plan or grab a 1-week VIP pass for $4.99</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePurchasePass}
                disabled={loadingPass}
                className="rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs px-5"
                data-testid="buy-vip-pass-btn"
              >
                {loadingPass ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                1-Week Pass — $4.99
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/membership'}
                className="rounded-full text-xs px-5"
                data-testid="upgrade-membership-btn"
              >
                <Crown className="w-4 h-4 mr-1" /> Subscribe
              </Button>
            </div>
          </div>
        ) : hasVipAccess && !isPaidSubscriber ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200/60" data-testid="vip-active-banner">
            <Clock className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              VIP Pass Active — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
            </p>
          </div>
        ) : null}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search breeders, kennels, breeds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
              data-testid="vip-search-input"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SPECIES_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeciesFilter(s)}
                className={`text-xs px-3 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                  speciesFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
                data-testid={`filter-${s.toLowerCase()}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Breeders grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : breeders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="no-breeders">
            <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-lg font-medium">No breeders found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4" data-testid="breeders-grid">
            {breeders.map((b) => (
              <div
                key={b.user_id}
                className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedBreeder(selectedBreeder?.user_id === b.user_id ? null : b)}
                data-testid={`breeder-card-${b.user_id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {b.picture ? (
                      <img src={b.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm" style={{ fontFamily: 'Outfit' }}>{b.name}</h3>
                      {b.breeder_info?.is_verified && (
                        <Badge className="bg-green-100 text-green-700 text-[9px]">Verified</Badge>
                      )}
                      {b.membership_tier && b.membership_tier !== 'free' && (
                        <Badge variant="outline" className="text-[9px]">{b.membership_tier.toUpperCase()}</Badge>
                      )}
                    </div>
                    {b.breeder_info?.kennel_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{b.breeder_info.kennel_name}</p>
                    )}
                    {b.breeder_info?.years_experience > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {b.breeder_info.years_experience}+ years experience
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(b.breeder_info?.specializations || []).slice(0, 4).map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] py-0">{s}</Badge>
                      ))}
                      {(b.breeder_info?.external_credentials || []).slice(0, 2).map((c, i) => (
                        <Badge key={`c-${i}`} className="bg-amber-50 text-amber-700 text-[9px] py-0">
                          <Award className="w-2.5 h-2.5 mr-0.5" /> {c.registry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact Info - Gated */}
                {selectedBreeder?.user_id === b.user_id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {canViewContacts ? (
                      <div className="space-y-2" data-testid="breeder-contact-info">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-primary" />
                          <span>{b.email || 'No email listed'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="rounded-full text-xs bg-primary hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success('Opening chat...');
                            }}
                            data-testid="contact-breeder-btn"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Message Breeder
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50" data-testid="contact-locked">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">Contact info is locked</p>
                          <p className="text-[10px] text-muted-foreground">Subscribe or buy a VIP pass to view</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
