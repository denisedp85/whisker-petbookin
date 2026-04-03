import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PawPrint, ArrowRight, Shield, Star, Gamepad2, Store, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register({ email: form.email, password: form.password, name: form.name });
      }
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

  const features = [
    { icon: PawPrint, title: 'Pet Profiles', desc: 'Create detailed profiles for your beloved pets' },
    { icon: Shield, title: 'Breeder Registry', desc: 'Official credentials for verified breeders' },
    { icon: Star, title: 'AI-Powered Bios', desc: 'Generate unique bios with AI technology' },
    { icon: Store, title: 'Marketplace', desc: 'Buy and sell pet products and services' },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, hsl(7 100% 71% / 0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsl(43 88% 55% / 0.2) 0%, transparent 50%)'
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-2">
              <PawPrint className="w-8 h-8 text-primary" strokeWidth={2.5} />
              <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>
                Pet<span className="text-primary">bookin</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => { setShowAuth(true); setIsLogin(true); }}
                data-testid="login-btn"
                className="rounded-full"
              >
                Log In
              </Button>
              <Button
                onClick={() => { setShowAuth(true); setIsLogin(false); }}
                data-testid="signup-btn"
                className="rounded-full bg-primary text-white hover:bg-primary/90"
              >
                Sign Up
              </Button>
            </div>
          </nav>

          {/* Hero content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" style={{ fontFamily: 'Outfit' }}>
                The Social Network
                <br />
                <span className="text-primary">For Your Pets</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                Connect with pet lovers, join the breeder registry, showcase your pets, and unlock premium features with AI-powered bios.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => { setShowAuth(true); setIsLogin(false); }}
                  data-testid="get-started-btn"
                  className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => { setShowAuth(true); setIsLogin(true); }}
                  className="rounded-full px-8"
                >
                  I Have an Account
                </Button>
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
                <img
                  src="https://images.pexels.com/photos/13898221/pexels-photo-13898221.jpeg"
                  alt="Golden Retriever"
                  className="relative rounded-3xl shadow-2xl w-full object-cover max-h-[500px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Outfit' }}>Everything Your Pet Needs</h2>
          <p className="text-muted-foreground mt-3">A complete platform for pet owners and breeders</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'Outfit' }}>{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAuth(false)}>
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            data-testid="auth-modal"
          >
            <div className="text-center mb-6">
              <PawPrint className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>
                {isLogin ? 'Welcome Back' : 'Join Petbookin'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isLogin ? 'Log in to your account' : 'Create your free account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  required={!isLogin}
                  data-testid="auth-name-input"
                  className="rounded-xl"
                />
              )}
              <Input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                required
                data-testid="auth-email-input"
                className="rounded-xl"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  required
                  data-testid="auth-password-input"
                  className="rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-primary text-white hover:bg-primary/90"
                disabled={loading}
                data-testid="auth-submit-btn"
              >
                {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-card text-xs text-muted-foreground">or</span></div>
            </div>

            <Button
              variant="outline"
              onClick={loginWithGoogle}
              className="w-full rounded-full"
              data-testid="google-auth-btn"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
                data-testid="auth-toggle-btn"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
