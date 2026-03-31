import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PawPrint, Users, Heart, Camera, Star, Sparkles, ArrowRight } from 'lucide-react';

const COMIC_DOG = "https://static.prod-images.emergentagent.com/jobs/00053c5a-2e92-46ed-9162-341ee8e949e6/images/75b3023a903033d916ccfcdc3b05160e3b54ec33e41b40f40f8c25aa4da9392c.png";
const COMIC_CAT = "https://static.prod-images.emergentagent.com/jobs/00053c5a-2e92-46ed-9162-341ee8e949e6/images/06e01d3bfe8f1fb91efd291205eae8e00e98231e48dcf4536e0a583033717f0d.png";
const COMIC_PARROT = "https://static.prod-images.emergentagent.com/jobs/00053c5a-2e92-46ed-9162-341ee8e949e6/images/2e96dc874912a3647e81241c7a2cd9be50094a9a8d65afece4a9e6de7a07de3e.png";
const COMIC_BUNNY = "https://static.prod-images.emergentagent.com/jobs/00053c5a-2e92-46ed-9162-341ee8e949e6/images/bef6b6d48e08d59b5858f1269c2290403e6c5f8daee5221f0b1c02a1cc36b25a.png";

const REAL_PUPPIES = "https://images.unsplash.com/photo-1769117319103-ea3ade5c4749?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcGV0cyUyMGRpdmVyc2UlMjBhbmltYWxzJTIwZG9ncyUyMGNhdHN8ZW58MHx8fHwxNzc0MTkwMTIxfDA&ixlib=rb-4.1.0&q=85";
const REAL_CAT_DOG = "https://images.pexels.com/photos/46024/pexels-photo-46024.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const REAL_GUINEA_PIG = "https://images.pexels.com/photos/4327887/pexels-photo-4327887.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const REAL_BIRD = "https://images.unsplash.com/photo-1628496920588-ddcbc5ddf51b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTF8MHwxfHNlYXJjaHw0fHxjdXRlJTIwaGFtc3RlciUyMGd1aW5lYSUyMHBpZyUyMGJpcmQlMjBwYXJyb3QlMjBwZXR8ZW58MHx8fHwxNzc0MTkwMTM0fDA&ixlib=rb-4.1.0&q=85";
const REAL_IGUANA = "https://images.unsplash.com/photo-1770211162779-b652d331b363?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwzfHxoYW1zdGVyJTIwZmlzaCUyMHR1cnRsZSUyMHJlcHRpbGUlMjBwZXQlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NzQxOTAxMjd8MA&ixlib=rb-4.1.0&q=85";
const REAL_TURTLE = "https://images.unsplash.com/photo-1695636537910-1f4deba51a2b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxoYW1zdGVyJTIwZmlzaCUyMHR1cnRsZSUyMHJlcHRpbGUlMjBwZXQlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NzQxOTAxMjd8MA&ixlib=rb-4.1.0&q=85";

export default function LandingPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ===== NAVBAR ===== */}
      <nav className="relative z-20 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-200/50">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-['Archivo_Narrow'] bg-gradient-to-r from-amber-600 via-rose-500 to-violet-600 bg-clip-text text-transparent">
              Petbookin
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Input
              data-testid="login-email-topbar"
              type="email"
              placeholder="Email"
              className="h-9 w-40 text-sm border-gray-200 focus:border-rose-400 focus:ring-rose-300/30 rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              data-testid="login-password-topbar"
              type="password"
              placeholder="Password"
              className="h-9 w-36 text-sm border-gray-200 focus:border-rose-400 focus:ring-rose-300/30 rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              data-testid="login-btn-topbar"
              onClick={handleLogin}
              disabled={loading}
              className="h-9 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-sm px-5 rounded-lg shadow-md shadow-rose-200/50 transition-all active:scale-95"
            >
              Log In
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-amber-200/60 to-orange-200/40 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-32 w-80 h-80 bg-gradient-to-br from-rose-200/50 to-pink-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-br from-violet-200/40 to-indigo-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-teal-200/30 to-emerald-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Column - Text + Images mashup */}
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700">The social network for every pet</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-['Archivo_Narrow'] leading-[1.1] tracking-tight">
                  <span className="text-gray-900">Where Every </span>
                  <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 bg-clip-text text-transparent">Paw</span>
                  <span className="text-gray-900"> Has a </span>
                  <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Voice</span>
                </h1>
                <p className="text-base text-gray-500 mt-4 max-w-md leading-relaxed font-['Public_Sans']">
                  Dogs, cats, parrots, bunnies, turtles, iguanas — all pets deserve a spotlight. Create profiles, share moments, make furry (and scaly) friends.
                </p>
              </div>

              {/* Scattered image collage */}
              <div className="relative h-[320px] sm:h-[360px]">
                {/* 3D Comic Dog - large, tilted */}
                <div className="absolute top-0 left-0 w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-xl shadow-amber-200/40 border-4 border-white rotate-[-4deg] hover:rotate-0 transition-transform duration-500 z-10">
                  <img src={COMIC_DOG} alt="3D Comic Dog" className="w-full h-full object-cover" />
                </div>
                {/* Real cat and dog cuddling */}
                <div className="absolute top-4 right-4 sm:right-8 w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden shadow-lg shadow-rose-200/40 border-3 border-white rotate-[3deg] hover:rotate-0 transition-transform duration-500 z-20">
                  <img src={REAL_CAT_DOG} alt="Cat and dog friends" className="w-full h-full object-cover" />
                </div>
                {/* 3D Comic Cat - medium, tilted other way */}
                <div className="absolute top-32 sm:top-36 left-16 sm:left-24 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl shadow-pink-200/40 border-4 border-white rotate-[5deg] hover:rotate-0 transition-transform duration-500 z-30">
                  <img src={COMIC_CAT} alt="3D Comic Cat" className="w-full h-full object-cover" />
                </div>
                {/* Real bird on hand */}
                <div className="absolute top-20 right-0 sm:right-4 w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden shadow-lg shadow-teal-200/40 border-3 border-white rotate-[-6deg] hover:rotate-0 transition-transform duration-500 z-10">
                  <img src={REAL_BIRD} alt="Bird on hand" className="w-full h-full object-cover" />
                </div>
                {/* Guinea pig with flowers */}
                <div className="absolute bottom-2 left-4 w-28 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shadow-lg shadow-emerald-200/40 border-3 border-white rotate-[2deg] hover:rotate-0 transition-transform duration-500 z-20">
                  <img src={REAL_GUINEA_PIG} alt="Guinea pig in flowers" className="w-full h-full object-cover" />
                </div>
                {/* 3D Comic Parrot - small accent */}
                <div className="absolute bottom-4 right-12 sm:right-20 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xl shadow-violet-200/40 border-4 border-white rotate-[-3deg] hover:rotate-0 transition-transform duration-500 z-30">
                  <img src={COMIC_PARROT} alt="3D Comic Parrot" className="w-full h-full object-cover" />
                </div>
                {/* Decorative dots */}
                <div className="absolute top-16 left-40 w-3 h-3 rounded-full bg-amber-400/60 animate-pulse" />
                <div className="absolute top-48 right-32 w-2 h-2 rounded-full bg-rose-400/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-16 left-52 w-2.5 h-2.5 rounded-full bg-violet-400/60 animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
            </div>

            {/* Right Column - Login Card */}
            <div className="lg:pl-8">
              <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/60 border border-gray-100 p-6 sm:p-8 space-y-5 max-w-md mx-auto lg:mx-0">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 font-['Archivo_Narrow']">
                    Join the Pack
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Sign in or create your pet's profile</p>
                </div>

                {error && (
                  <div data-testid="login-error" className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <Label htmlFor="email" className="text-sm text-gray-500">Email</Label>
                    <Input
                      data-testid="login-email"
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-50/80 border-gray-200 focus:border-rose-400 focus:ring-rose-300/30 rounded-xl h-11"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-sm text-gray-500">Password</Label>
                    <Input
                      data-testid="login-password"
                      id="password"
                      type="password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-50/80 border-gray-200 focus:border-rose-400 focus:ring-rose-300/30 rounded-xl h-11"
                      required
                    />
                  </div>
                  <Button
                    data-testid="login-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold rounded-xl shadow-lg shadow-rose-200/50 transition-all active:scale-[0.98]"
                  >
                    {loading ? 'Logging in...' : 'Log In'}
                  </Button>
                </form>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or</span></div>
                </div>

                <Button
                  data-testid="google-login-btn"
                  onClick={loginWithGoogle}
                  variant="outline"
                  className="w-full h-11 border-gray-200 hover:bg-gray-50 text-gray-700 font-medium gap-2 rounded-xl"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </Button>

                <div className="text-center pt-3 border-t border-gray-100">
                  <Button
                    data-testid="create-account-btn"
                    onClick={() => navigate('/signup')}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold px-8 h-11 rounded-xl shadow-lg shadow-emerald-200/50"
                  >
                    Create New Account <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">It's quick and easy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES STRIP ===== */}
      <section className="relative bg-gradient-to-r from-amber-50 via-rose-50 to-violet-50 border-y border-orange-100/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold font-['Archivo_Narrow'] text-gray-900">
              Built for <span className="text-rose-500">Every</span> Kind of Pet
            </h2>
            <p className="text-sm text-gray-500 mt-1">From tail waggers to wing flappers</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FeatureCard
              icon={<PawPrint className="w-6 h-6" />}
              title="Pet Profiles"
              desc="Showcase personality, breed & more"
              color="from-amber-400 to-orange-500"
              shadow="shadow-amber-200/40"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Pet Friends"
              desc="Connect across species"
              color="from-rose-400 to-pink-500"
              shadow="shadow-rose-200/40"
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="Likes & Comments"
              desc="Share the love with paws up"
              color="from-violet-400 to-purple-500"
              shadow="shadow-violet-200/40"
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Photo Albums"
              desc="Capture every cute moment"
              color="from-teal-400 to-emerald-500"
              shadow="shadow-teal-200/40"
            />
          </div>
        </div>
      </section>

      {/* ===== ANIMAL GALLERY MOSAIC ===== */}
      <section className="relative py-12 bg-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-rose-100/40 to-pink-100/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-56 h-56 bg-gradient-to-br from-amber-100/40 to-yellow-100/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold font-['Archivo_Narrow'] text-gray-900">
              All Creatures <span className="text-teal-500">Welcome</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">A community for every species</p>
          </div>

          {/* Mosaic gallery - tight 4-col layout with varied sizes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Row 1 */}
            <div className="row-span-2 rounded-2xl overflow-hidden shadow-lg shadow-rose-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={COMIC_BUNNY} alt="3D Bunny" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="col-span-2 aspect-[2/1] rounded-2xl overflow-hidden shadow-lg shadow-amber-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={REAL_PUPPIES} alt="Puppies in basket" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="row-span-2 rounded-2xl overflow-hidden shadow-lg shadow-amber-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={COMIC_DOG} alt="3D Comic Dog" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            {/* Row 2 - fills under the wide puppies image */}
            <div className="aspect-square rounded-2xl overflow-hidden shadow-lg shadow-teal-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={REAL_TURTLE} alt="Turtle" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden shadow-lg shadow-emerald-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={REAL_IGUANA} alt="Iguana" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            {/* Row 3 */}
            <div className="col-span-2 aspect-[2/1] rounded-2xl overflow-hidden shadow-lg shadow-violet-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={COMIC_PARROT} alt="3D Comic Parrot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="row-span-2 rounded-2xl overflow-hidden shadow-lg shadow-pink-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={COMIC_CAT} alt="3D Comic Cat" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden shadow-lg shadow-pink-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={REAL_GUINEA_PIG} alt="Guinea pig" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            {/* Row 4 */}
            <div className="col-span-2 aspect-[2/1] rounded-2xl overflow-hidden shadow-lg shadow-rose-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={REAL_CAT_DOG} alt="Cat and dog friends" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg shadow-teal-200/30 border-2 border-white group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <img src={REAL_BIRD} alt="Bird on hand" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="relative py-14 bg-gradient-to-br from-amber-500 via-rose-500 to-violet-600 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
          {/* Floating 3D pets */}
          <img src={COMIC_DOG} alt="" className="absolute -bottom-4 -left-4 w-28 h-28 opacity-20 rotate-[-15deg]" />
          <img src={COMIC_CAT} alt="" className="absolute -top-4 -right-4 w-24 h-24 opacity-20 rotate-[10deg]" />
          <img src={COMIC_BUNNY} alt="" className="absolute top-1/2 right-1/4 w-20 h-20 opacity-15 rotate-[5deg]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold font-['Archivo_Narrow'] text-white leading-tight">
            Your Pet Deserves a Social Life Too
          </h2>
          <p className="text-white/80 mt-3 text-base max-w-lg mx-auto">
            Join thousands of pet parents sharing their furry, feathery, and scaly companions. Every pet is special here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button
              data-testid="cta-signup-btn"
              onClick={() => navigate('/signup')}
              className="h-12 px-8 bg-white text-rose-600 font-bold rounded-xl shadow-xl hover:bg-gray-50 transition-all active:scale-95 text-base gap-2"
            >
              <Star className="w-5 h-5" /> Get Started Free
            </Button>
            <Button
              data-testid="cta-google-btn"
              onClick={loginWithGoogle}
              variant="outline"
              className="h-12 px-8 border-2 border-white/40 text-white hover:bg-white/10 font-medium rounded-xl transition-all gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
              Sign Up with Google
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-50 border-t border-gray-100 py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center">
            <PawPrint className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold font-['Archivo_Narrow'] text-gray-700">Petbookin</span>
        </div>
        <p className="text-xs text-gray-400">Connect your pets with the world</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, shadow }) {
  return (
    <div className={`bg-white rounded-xl p-4 border border-gray-100 shadow-lg ${shadow} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md mb-3 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}
