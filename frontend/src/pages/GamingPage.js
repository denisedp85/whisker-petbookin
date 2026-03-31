import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Gamepad2, Trophy, Puzzle, Target, Zap, Star } from 'lucide-react';

export default function GamingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-8 w-16 h-16 bg-white/10 rounded-full blur-xl" />
              <div className="absolute bottom-4 right-12 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            </div>
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold font-['Archivo_Narrow'] text-white">
                Pet Games
              </h1>
              <p className="text-white/80 mt-2 text-base">
                Fun games for you and your furry friends
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full px-4 py-1.5 mt-4 text-sm font-medium">
                <Zap className="w-4 h-4 text-amber-300" />
                Coming Soon
              </div>
            </div>
          </div>

          {/* Game Previews */}
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 font-['Archivo_Narrow'] mb-4">
              What's Coming
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <GamePreviewCard
                icon={<Puzzle className="w-6 h-6" />}
                title="Pet Puzzle"
                desc="Match cute pet photos in this addictive puzzle game"
                color="from-amber-400 to-orange-500"
                badge="Free"
              />
              <GamePreviewCard
                icon={<Target className="w-6 h-6" />}
                title="Treat Catcher"
                desc="Help your pet catch falling treats before they hit the ground"
                color="from-rose-400 to-pink-500"
                badge="Free"
              />
              <GamePreviewCard
                icon={<Trophy className="w-6 h-6" />}
                title="Pet Show Champion"
                desc="Train and compete your pet in virtual dog shows"
                color="from-teal-400 to-emerald-500"
                badge="Premium"
              />
              <GamePreviewCard
                icon={<Star className="w-6 h-6" />}
                title="Breed Quiz"
                desc="Test your knowledge of pet breeds from around the world"
                color="from-violet-400 to-purple-500"
                badge="Free"
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-4">
                We're working hard to bring you pet-themed games with leaderboards, achievements, and rewards. Stay tuned!
              </p>
              <Button
                data-testid="gaming-back-to-feed"
                onClick={() => navigate('/feed')}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl shadow-md"
              >
                Back to Feed
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GamePreviewCard({ icon, title, desc, color, badge }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group opacity-75 hover:opacity-100" data-testid={`game-preview-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              badge === 'Premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200'
            }`}>{badge}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}
