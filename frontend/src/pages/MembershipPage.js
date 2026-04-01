import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Badge } from '../components/ui/badge';
import { Crown, Check, Sparkles, Shield, Zap, Star } from 'lucide-react';

const tiers = [
  {
    id: 'prime',
    name: 'Prime',
    price: '$4.99/week',
    color: 'from-blue-500 to-blue-600',
    features: ['10 AI Bio Generations', 'View Video/Audio Previews', 'Basic Breeder Badge', 'Priority Feed Placement'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$14.99/month',
    color: 'from-purple-500 to-purple-600',
    popular: true,
    features: ['50 AI Bio Generations', 'Enhanced Bio Styles', 'View Full Videos/Audio', 'Breeder Verification Eligible', 'Enhanced Search'],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '$24.99/month',
    color: 'from-amber-500 to-amber-600',
    features: ['250 AI Bio Generations', 'Premium Bio Styles + Taglines', 'Create Video/Audio Content', 'Verified Breeder Badge', '1 Free Promotion/month'],
  },
  {
    id: 'mega',
    name: 'Mega',
    price: '$39.99/month',
    color: 'from-primary to-secondary',
    features: ['Unlimited AI Generations', 'All Bio Styles + Origin Stories', 'Create & Share All Content', 'Premium Verified Badge', '3 Free Promotions/month', 'Bonus Points', 'VIP Event Access', 'Full Feature Access'],
  },
];

export default function MembershipPage() {
  const { user } = useAuth();
  const currentTier = user?.membership_tier || 'free';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8" data-testid="membership-page">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'Outfit' }}>
            Upgrade Your <span className="text-primary">Petbookin</span> Experience
          </h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Unlock AI-powered bios, video creation, promotions, and exclusive breeder features.
          </p>
        </div>

        {/* Current tier */}
        <div className="text-center">
          <Badge className="text-sm px-4 py-1">
            Current Plan: <span className="font-bold ml-1 uppercase">{currentTier}</span>
          </Badge>
        </div>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => {
            const isActive = currentTier === tier.id;
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

                <button
                  className={`w-full mt-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : `bg-gradient-to-r ${tier.color} text-white hover:opacity-90 hover:-translate-y-0.5`
                  }`}
                  disabled={isActive}
                  data-testid={`subscribe-${tier.id}`}
                >
                  {isActive ? 'Current Plan' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>

        {/* A la carte */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center" data-testid="ala-carte-section">
          <Sparkles className="w-8 h-8 text-secondary mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>A La Carte Purchases</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Don't want a full subscription? Purchase individual features like extra AI generations or post promotions.
          </p>
          <Badge variant="outline" className="text-sm">Coming with Stripe integration</Badge>
        </div>
      </div>
    </AppLayout>
  );
}
