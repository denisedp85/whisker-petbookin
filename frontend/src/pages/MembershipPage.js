import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Crown, Star, Zap, Shield, Check, Sparkles, Loader2, PawPrint } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const TIERS = [
  {
    id: 'prime_weekly',
    name: 'PRIME',
    price: '$4.99/week',
    color: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-200/50',
    border: 'border-amber-200',
    icon: Star,
    perks: [
      'Free listing of your pet',
      'Discounted fees on individual pet listings',
      '7-day free trial included',
    ],
    recommended: false,
  },
  {
    id: 'pro_monthly',
    name: 'PRO',
    price: '$14.99/mo',
    color: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-200/50',
    border: 'border-blue-200',
    icon: Shield,
    perks: [
      'All PRIME benefits',
      'Verified Breeder badge & certificate',
      'Up to 5 free AI-generated bios & themes',
      '7-day free trial included',
    ],
    recommended: true,
  },
  {
    id: 'ultra_monthly',
    name: 'ULTRA',
    price: '$24.99/mo',
    color: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-200/50',
    border: 'border-violet-200',
    icon: Zap,
    perks: [
      'Verified Breeder badge & certificate',
      'Photo album storage upgrades',
      'Unlimited AI-generated bios',
      'Priority in search results',
      'First 3 puppy/kitten litter listings free',
      '7-day free trial included',
    ],
    recommended: false,
  },
  {
    id: 'mega_monthly',
    name: 'MEGA',
    price: '$39.99/mo',
    color: 'from-rose-500 to-red-600',
    shadow: 'shadow-rose-200/50',
    border: 'border-rose-200',
    icon: Crown,
    perks: [
      'All ULTRA benefits',
      'Pro Badge + customizable certificate',
      'Pet popularity analytics',
      'Leveling & benefits access',
      'Surprise bonus package for your pet',
      '7-day free trial included',
    ],
    recommended: false,
  },
];

export default function MembershipPage() {
  const { user, authHeaders, API } = useAuth();
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API}/membership/status`, { headers: authHeaders() });
        setMembership(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStatus();
  }, [API, authHeaders]);

  const handleSubscribe = async (planId) => {
    setCheckingOut(planId);
    try {
      const res = await axios.post(`${API}/stripe/create-checkout`, {
        plan_id: planId,
        success_url: `${window.location.origin}/feed?payment=success`,
        cancel_url: `${window.location.origin}/membership?payment=cancelled`,
      }, { headers: authHeaders() });
      window.location.href = res.data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Checkout failed');
      setCheckingOut('');
    }
  };

  const currentTier = membership?.tier || 'free';

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold font-['Archivo_Narrow'] text-gray-900">
            Petbookin Membership
          </h1>
          <p className="text-base text-gray-500 mt-2 max-w-lg mx-auto">
            Unlock premium features for your pet's profile. All plans include a 7-day free trial.
          </p>
          {currentTier !== 'free' && (
            <Badge className="mt-3 bg-gradient-to-r from-amber-400 to-rose-500 text-white border-0 text-sm px-3 py-1">
              Current Plan: {currentTier}
            </Badge>
          )}
        </div>

        {/* Pet Owner vs Breeder note */}
        {membership?.account_type === 'pet_owner' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-amber-800">
              <PawPrint className="w-4 h-4 inline mr-1" />
              As a <strong>Pet Owner</strong>, you can subscribe to <strong>PRIME</strong> or start as a <strong>Hobbyist</strong> — your listing auto-levels to PRO after 2 weeks!
            </p>
          </div>
        )}

        {/* Tier Cards */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TIERS.map(tier => (
              <div
                key={tier.id}
                className={`bg-white rounded-2xl border ${tier.border} shadow-lg ${tier.shadow} overflow-hidden flex flex-col ${
                  tier.recommended ? 'ring-2 ring-blue-400 relative' : ''
                } hover:-translate-y-1 transition-transform duration-300`}
                data-testid={`tier-card-${tier.name.toLowerCase()}`}
              >
                {tier.recommended && (
                  <div className="bg-blue-500 text-white text-xs font-bold text-center py-1">
                    MOST POPULAR
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-white shadow-md mb-3`}>
                    <tier.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-['Archivo_Narrow']">{tier.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{tier.price}</p>
                  <p className="text-xs text-gray-400 mb-4">7-day free trial</p>
                  <ul className="space-y-2 flex-1">
                    {tier.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Button
                    data-testid={`subscribe-${tier.name.toLowerCase()}`}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={checkingOut === tier.id || currentTier === tier.name}
                    className={`w-full mt-4 h-10 bg-gradient-to-r ${tier.color} hover:opacity-90 text-white font-semibold rounded-xl shadow-md transition-all active:scale-95`}
                  >
                    {checkingOut === tier.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : currentTier === tier.name ? (
                      'Current Plan'
                    ) : (
                      'Start Free Trial'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Yearly Plans */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 font-['Archivo_Narrow'] mb-4">
            <Sparkles className="w-5 h-5 inline text-amber-500 mr-1" /> Yearly Plans — Save More
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50">
              <h3 className="text-base font-semibold text-gray-900">PRO Yearly</h3>
              <p className="text-xl font-bold text-gray-900">$305.88<span className="text-sm font-normal text-gray-500">/year</span></p>
              <p className="text-xs text-blue-600 font-medium">That's just $25.49/mo — 36.25% savings!</p>
              <Button
                data-testid="subscribe-pro-yearly"
                onClick={() => handleSubscribe('pro_yearly')}
                disabled={checkingOut === 'pro_yearly'}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                {checkingOut === 'pro_yearly' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe Yearly'}
              </Button>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <h3 className="text-base font-semibold text-gray-900">Promote a Listing</h3>
              <p className="text-xl font-bold text-gray-900">$3.49<span className="text-sm font-normal text-gray-500">/week</span></p>
              <p className="text-xs text-gray-500">Feature up to 2 pets/litters in search results</p>
              <Button
                data-testid="promote-listing-btn"
                onClick={() => handleSubscribe('promote_listing')}
                disabled={checkingOut === 'promote_listing'}
                variant="outline"
                className="mt-3 border-gray-300 rounded-xl"
              >
                {checkingOut === 'promote_listing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Promote Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
