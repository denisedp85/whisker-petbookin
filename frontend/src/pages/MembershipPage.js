import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Crown, Check, Sparkles, Loader2, Clock, XCircle, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

const tiers = [
  {
    id: 'prime',
    name: 'Prime',
    price: '$4.99/week',
    color: 'from-blue-500 to-blue-600',
    features: ['10 AI Bio Generations', 'View Video/Audio Previews', 'Basic Breeder Badge', 'Priority Feed Placement', 'Avatar Customization'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$14.99/month',
    color: 'from-purple-500 to-purple-600',
    popular: true,
    features: ['50 AI Bio Generations', 'Enhanced Bio Styles', 'View Full Videos/Audio', 'Breeder Verification Eligible', 'Enhanced Search', 'Avatar Customization'],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '$24.99/month',
    color: 'from-amber-500 to-amber-600',
    features: ['250 AI Bio Generations', 'Premium Bio Styles + Taglines', 'Create Video/Audio Content', 'Verified Breeder Badge', '1 Free Promotion/month', 'Premium Avatars'],
  },
  {
    id: 'mega',
    name: 'Mega',
    price: '$39.99/month',
    color: 'from-primary to-secondary',
    features: ['Unlimited AI Generations', 'All Bio Styles + Origin Stories', 'Create & Share All Content', 'Premium Verified Badge', '3 Free Promotions/month', 'Bonus Points', 'VIP Event Access', 'All Avatars + Exclusive Frames'],
  },
];

const CANCELLATION_FEES = {
  prime: '$1.99',
  pro: '$4.99',
  ultra: '$9.99',
  mega: '$14.99',
};

const TIER_ORDER = ['free', 'prime', 'pro', 'ultra', 'mega'];

export default function MembershipPage() {
  const { user, API, authHeaders, refreshUser } = useAuth();
  const currentTier = user?.membership_tier || 'free';
  const isOnTrial = user?.membership_status === 'trial';
  const [loadingTier, setLoadingTier] = useState(null);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(null);

  const pollPaymentStatus = useCallback(async (sessionId, attempt = 0) => {
    const maxAttempts = 8;
    if (attempt >= maxAttempts) {
      setPollingStatus(null);
      toast.error('Payment verification timed out. If you were charged, your tier will update shortly.');
      return;
    }
    try {
      const res = await fetch(`${API}/stripe/checkout-status/${sessionId}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.payment_status === 'paid') {
        setPollingStatus(null);
        toast.success(`Upgraded to ${data.tier_name}!`);
        await refreshUser();
        window.history.replaceState({}, '', '/membership');
        return;
      }
      if (data.status === 'expired') {
        setPollingStatus(null);
        toast.error('Payment session expired. Please try again.');
        window.history.replaceState({}, '', '/membership');
        return;
      }
      setPollingStatus(`Verifying payment... (attempt ${attempt + 1})`);
      setTimeout(() => pollPaymentStatus(sessionId, attempt + 1), 2500);
    } catch (e) {
      setPollingStatus(null);
      toast.error('Error checking payment status.');
    }
  }, [API, authHeaders, refreshUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const type = params.get('type');
    if (sessionId) {
      if (type === 'cancellation') {
        setPollingStatus('Processing cancellation...');
        const pollCancel = async (attempt = 0) => {
          if (attempt >= 8) { setPollingStatus(null); return; }
          try {
            await refreshUser();
            setPollingStatus(null);
            toast.success('Subscription cancelled successfully');
            window.history.replaceState({}, '', '/membership');
          } catch (e) {
            setTimeout(() => pollCancel(attempt + 1), 2500);
          }
        };
        setTimeout(() => pollCancel(), 2000);
      } else {
        setPollingStatus('Verifying your payment...');
        pollPaymentStatus(sessionId);
      }
    }
  }, [pollPaymentStatus, refreshUser]);

  useEffect(() => {
    const fetchTrial = async () => {
      try {
        const res = await fetch(`${API}/stripe/trial-status`, { headers: authHeaders() });
        const data = await res.json();
        setTrialStatus(data);
      } catch (e) { console.error(e); }
    };
    fetchTrial();
  }, [API, authHeaders]);

  const handleSubscribe = async (tierId) => {
    setLoadingTier(tierId);
    try {
      const res = await fetch(`${API}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_id: tierId, origin_url: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create checkout session');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.message || 'Payment error');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleStartTrial = async (tierId) => {
    setTrialLoading(tierId);
    try {
      const res = await fetch(`${API}/stripe/start-trial`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_id: tierId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start trial');
      toast.success(data.message);
      await refreshUser();
      setTrialStatus({ ...trialStatus, has_used_trial: true, is_on_trial: true, trial_end: data.trial_end });
    } catch (err) {
      toast.error(err.message || 'Trial error');
    } finally {
      setTrialLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(`Are you sure you want to cancel your ${currentTier.toUpperCase()} subscription?\n\nA cancellation fee of ${CANCELLATION_FEES[currentTier]} will be charged.`)) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${API}/stripe/cancel-subscription`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin_url: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to cancel');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.message || 'Cancellation error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePurchasePack = async (packId) => {
    setLoadingTier(packId);
    try {
      const res = await fetch(`${API}/stripe/purchase-pack`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, origin_url: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create checkout');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.message || 'Purchase error');
    } finally {
      setLoadingTier(null);
    }
  };

  const currentTierIndex = TIER_ORDER.indexOf(currentTier);
  const canTrial = !trialStatus?.has_used_trial && currentTier === 'free';
  const trialDaysLeft = isOnTrial && trialStatus?.trial_end
    ? Math.max(0, Math.ceil((new Date(trialStatus.trial_end) - Date.now()) / 86400000))
    : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8" data-testid="membership-page">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'Outfit' }}>
            Upgrade Your <span className="text-primary">Petbookin</span> Experience
          </h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Unlock AI-powered bios, video creation, promotions, premium avatars, and exclusive breeder features.
          </p>
        </div>

        {/* Current tier + trial info */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Badge className="text-sm px-4 py-1" data-testid="current-tier-badge">
            Current Plan: <span className="font-bold ml-1 uppercase">{currentTier}</span>
          </Badge>
          {isOnTrial && (
            <Badge className="text-sm px-4 py-1 bg-amber-100 text-amber-800" data-testid="trial-badge">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
            </Badge>
          )}
          {currentTier !== 'free' && (
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              data-testid="cancel-subscription-btn"
            >
              {cancelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Cancel Subscription ({CANCELLATION_FEES[currentTier]} fee)
            </button>
          )}
        </div>

        {/* Polling banner */}
        {pollingStatus && (
          <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-secondary/10 border border-secondary/30" data-testid="payment-polling-banner">
            <Loader2 className="w-5 h-5 animate-spin text-secondary" />
            <span className="font-medium text-sm">{pollingStatus}</span>
          </div>
        )}

        {/* Free Trial Banner */}
        {canTrial && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 text-center" data-testid="trial-banner">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm" style={{ fontFamily: 'Outfit' }}>7-Day Free Trial Available!</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Try any plan free for 7 days. No credit card required. Experience all premium features.
            </p>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => {
            const isActive = currentTier === tier.id;
            const tierIndex = TIER_ORDER.indexOf(tier.id);
            const isDowngrade = tierIndex <= currentTierIndex && currentTier !== 'free';
            const loading = loadingTier === tier.id;

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg ${
                  tier.popular ? 'border-primary shadow-md' : 'border-border'
                } ${isActive ? 'ring-2 ring-primary' : ''}`}
                data-testid={`tier-${tier.id}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white text-[10px] px-3">Most Popular</Badge>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}>
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>{tier.name}</h3>
                <p className="text-2xl font-bold mt-2" style={{ fontFamily: 'Outfit' }}>{tier.price}</p>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => handleSubscribe(tier.id)}
                    className={`w-full py-2.5 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-muted text-muted-foreground cursor-default'
                        : isDowngrade
                          ? 'bg-muted/60 text-muted-foreground cursor-not-allowed'
                          : `bg-gradient-to-r ${tier.color} text-white hover:opacity-90 hover:-translate-y-0.5`
                    }`}
                    disabled={isActive || isDowngrade || loading || !!pollingStatus}
                    data-testid={`subscribe-${tier.id}`}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isActive ? 'Current Plan' : isDowngrade ? 'Current or Lower' : loading ? 'Redirecting...' : 'Subscribe'}
                  </button>

                  {canTrial && !isActive && !isDowngrade && (
                    <button
                      onClick={() => handleStartTrial(tier.id)}
                      disabled={trialLoading === tier.id}
                      className="w-full py-2 rounded-full text-xs font-medium border border-primary/30 text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
                      data-testid={`trial-${tier.id}`}
                    >
                      {trialLoading === tier.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                      7-Day Free Trial
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* A la carte */}
        <div className="rounded-2xl border border-border bg-card p-8" data-testid="ala-carte-section">
          <div className="text-center mb-6">
            <Sparkles className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>A La Carte Purchases</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Buy individual features without a full subscription upgrade.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { id: 'ai_10', name: '10 AI Generations', price: '$2.99', desc: 'Generate 10 more AI-powered pet bios', color: 'from-blue-500 to-cyan-500' },
              { id: 'ai_50', name: '50 AI Generations', price: '$9.99', desc: 'Bulk pack of 50 AI bio generations', color: 'from-purple-500 to-pink-500' },
              { id: 'promo_1', name: 'Post Promotion', price: '$4.99', desc: 'Promote one post for 1 week', color: 'from-amber-500 to-orange-500' },
              { id: 'live_30', name: '30 Min Live Pass', price: '$1.99', desc: 'Extra 30 minutes of live streaming', color: 'from-red-500 to-rose-500' },
              { id: 'live_60', name: '60 Min Live Pass', price: '$3.99', desc: 'Extra 60 minutes of live streaming', color: 'from-red-600 to-pink-500' },
            ].map((pack) => (
              <div key={pack.id} className="rounded-xl border border-border p-5 hover:shadow-md transition-all" data-testid={`pack-${pack.id}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pack.color} flex items-center justify-center mb-3`}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm">{pack.name}</h3>
                <p className="text-xl font-bold mt-1" style={{ fontFamily: 'Outfit' }}>{pack.price}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{pack.desc}</p>
                <button
                  onClick={() => handlePurchasePack(pack.id)}
                  disabled={!!pollingStatus || loadingTier === pack.id}
                  className={`w-full py-2 rounded-full text-xs font-medium bg-gradient-to-r ${pack.color} text-white hover:opacity-90 transition-all disabled:opacity-50`}
                  data-testid={`buy-${pack.id}`}
                >
                  {loadingTier === pack.id ? 'Redirecting...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cancellation fee info */}
        {currentTier !== 'free' && (
          <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center" data-testid="cancellation-info">
            <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Cancellation fees: Prime $1.99 | Pro $4.99 | Ultra $9.99 | Mega $14.99
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
