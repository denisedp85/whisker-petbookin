import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Crown, Star, Sparkles, Gift, Calendar, Users, Trophy, Zap } from 'lucide-react';

export default function VIPComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-6 w-16 h-16 bg-white/10 rounded-full blur-xl" />
              <div className="absolute bottom-2 right-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            </div>
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold font-['Archivo_Narrow'] text-white">
                VIP Lounge
              </h1>
              <p className="text-white/80 mt-2 text-base">
                Exclusive perks for Petbookin supporters
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full px-4 py-1.5 mt-4 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-white" />
                Coming Soon
              </div>
            </div>
          </div>

          {/* VIP Features Preview */}
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 font-['Archivo_Narrow'] mb-2">
              What VIP Members Will Get
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Contribute, donate, or support Petbookin to unlock VIP status — or purchase temporary VIP access.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <VIPFeatureCard
                icon={<Calendar className="w-6 h-6" />}
                title="Events & Meetups"
                desc="Exclusive pet events, gatherings, and virtual meetups"
                color="from-rose-400 to-pink-500"
              />
              <VIPFeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Polls & Trivia"
                desc="Interactive polls, fun trivia, and pet fun facts"
                color="from-blue-400 to-indigo-500"
              />
              <VIPFeatureCard
                icon={<Gift className="w-6 h-6" />}
                title="Pet Care Tips"
                desc="Expert recommendations on food, care, and well-being"
                color="from-emerald-400 to-teal-500"
              />
              <VIPFeatureCard
                icon={<Trophy className="w-6 h-6" />}
                title="Pet-Friendly Locator"
                desc="Find vet stores and pet-friendly locations near you"
                color="from-amber-400 to-orange-500"
              />
            </div>

            {/* VIP Access Types */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">VIP Access Types</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white flex-shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Main VIP</p>
                    <p className="text-xs text-gray-500">For those who contribute, donate, or support Petbookin</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white flex-shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Temporary VIP</p>
                    <p className="text-xs text-gray-500">Short-term paid access for non-contributors — be seen as "Other VIP"</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Want to be the first to access VIP? Support Petbookin today!
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button
                  data-testid="vip-donate-btn"
                  onClick={() => navigate('/donate')}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90 text-white rounded-xl shadow-md gap-1.5"
                >
                  <Gift className="w-4 h-4" /> Donate Now
                </Button>
                <Button
                  data-testid="vip-back-btn"
                  onClick={() => navigate('/feed')}
                  variant="outline"
                  className="border-gray-300 rounded-xl"
                >
                  Back to Feed
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VIPFeatureCard({ icon, title, desc, color }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group opacity-80 hover:opacity-100">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}
