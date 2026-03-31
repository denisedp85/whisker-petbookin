import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Heart, Gift, Coffee, Sparkles, Loader2, Users } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const DONATION_OPTIONS = [
  { id: 'donation_5', amount: 5, label: '$5', icon: Coffee, color: 'from-amber-400 to-orange-500' },
  { id: 'donation_10', amount: 10, label: '$10', icon: Heart, color: 'from-rose-400 to-pink-500' },
  { id: 'donation_25', amount: 25, label: '$25', icon: Gift, color: 'from-violet-400 to-purple-500' },
];

export default function DonationPage() {
  const { user, authHeaders, API } = useAuth();
  const [totals, setTotals] = useState({ total: 0, count: 0 });
  const [recentDonations, setRecentDonations] = useState([]);
  const [customAmount, setCustomAmount] = useState('');
  const [checkingOut, setCheckingOut] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [totalRes, recentRes] = await Promise.all([
          axios.get(`${API}/donations/total`),
          axios.get(`${API}/donations/recent`)
        ]);
        setTotals(totalRes.data);
        setRecentDonations(recentRes.data);
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, [API]);

  const handleDonate = async (planId, amount) => {
    if (!user) { toast.error('Please log in to donate'); return; }
    setCheckingOut(planId);
    try {
      const res = await axios.post(`${API}/stripe/create-checkout`, {
        plan_id: planId,
        amount: amount,
        success_url: `${window.location.origin}/donate?payment=success`,
        cancel_url: `${window.location.origin}/donate?payment=cancelled`,
      }, { headers: authHeaders() });
      window.location.href = res.data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Donation failed');
      setCheckingOut('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 rounded-2xl p-8 text-center text-white shadow-xl shadow-rose-200/40 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-8 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <div className="absolute bottom-4 right-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold font-['Archivo_Narrow']">Support Petbookin</h1>
            <p className="text-white/80 mt-2 max-w-md mx-auto">
              Your contributions help us build a better community for pets and their humans. Every dollar makes a difference!
            </p>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mt-4">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-medium">${totals.total.toFixed(2)} raised from {totals.count} supporter{totals.count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Donation Options */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 font-['Archivo_Narrow'] mb-4">Choose an Amount</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {DONATION_OPTIONS.map(opt => (
              <Button
                key={opt.id}
                data-testid={`donate-${opt.amount}`}
                onClick={() => handleDonate(opt.id, opt.amount)}
                disabled={checkingOut === opt.id}
                className={`h-20 flex flex-col items-center justify-center gap-1 bg-gradient-to-br ${opt.color} hover:opacity-90 text-white rounded-xl shadow-md transition-all active:scale-95`}
              >
                {checkingOut === opt.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <opt.icon className="w-5 h-5" />
                    <span className="text-lg font-bold">{opt.label}</span>
                  </>
                )}
              </Button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600 mb-2">Or enter a custom amount:</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  data-testid="custom-donation-input"
                  type="number"
                  min="1"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full h-10 pl-7 pr-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:border-rose-400 focus:ring-rose-300/20 focus:outline-none"
                />
              </div>
              <Button
                data-testid="donate-custom-btn"
                onClick={() => handleDonate('donation_custom', parseFloat(customAmount))}
                disabled={!customAmount || parseFloat(customAmount) < 1 || checkingOut === 'donation_custom'}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90 text-white rounded-xl px-6"
              >
                {checkingOut === 'donation_custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Donate'}
              </Button>
            </div>
          </div>
        </div>

        {/* VIP Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
          <Sparkles className="w-5 h-5 text-amber-500 inline mr-1" />
          <span className="text-sm text-amber-800 font-medium">
            Donors get access to exclusive VIP perks and benefits!
          </span>
        </div>

        {/* Recent Donations */}
        {recentDonations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 font-['Archivo_Narrow'] mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-500" /> Recent Supporters
            </h2>
            <div className="space-y-2">
              {recentDonations.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{d.donor_name}</span>
                  <span className="text-sm font-semibold text-rose-600">${d.amount?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
