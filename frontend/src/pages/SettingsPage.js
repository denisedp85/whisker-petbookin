import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Settings, User, Palette, Shield, Crown } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const PRESET_THEMES = [
  { name: 'Default', bg_color: '#FFFDF9', card_bg: '#FFFFFF', text_color: '#28211E', accent_color: '#FF7A6A' },
  { name: 'Ocean', bg_color: '#F0F7FF', card_bg: '#FFFFFF', text_color: '#1A2332', accent_color: '#3B82F6' },
  { name: 'Forest', bg_color: '#F0F7F0', card_bg: '#FFFFFF', text_color: '#1A2E1A', accent_color: '#22C55E' },
  { name: 'Sunset', bg_color: '#FFF5F0', card_bg: '#FFFFFF', text_color: '#2E1A1A', accent_color: '#F97316' },
  { name: 'Midnight', bg_color: '#1A1B2E', card_bg: '#252640', text_color: '#E0E0F0', accent_color: '#A78BFA' },
  { name: 'Rose Gold', bg_color: '#FFF0F0', card_bg: '#FFFFFF', text_color: '#2E1A1A', accent_color: '#EC4899' },
];

export default function SettingsPage() {
  const { user, updateProfile, authHeaders, API, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(user?.profile_theme || PRESET_THEMES[0]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(profileForm);
      toast.success('Profile updated!');
    } catch {
      toast.error('Update failed');
    }
    setLoading(false);
  };

  const handleThemeUpdate = async (preset) => {
    setTheme(preset);
    try {
      await axios.put(`${API}/auth/theme`, preset, { headers: authHeaders() });
      toast.success('Theme updated!');
      refreshUser();
    } catch {
      toast.error('Theme update failed');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'account', label: 'Account', icon: Settings },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="settings-page">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`settings-tab-${t.id}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="rounded-2xl border border-border bg-card p-6" data-testid="profile-settings">
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Name</label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm({...profileForm, name: e.target.value})} className="rounded-xl" data-testid="profile-name-input" />
              </div>
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1.5 block">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm resize-none min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Tell people about yourself..."
                  data-testid="profile-bio-input"
                />
              </div>
              <Button type="submit" disabled={loading} className="rounded-full bg-primary text-white hover:bg-primary/90" data-testid="save-profile-btn">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>

            {/* Account info */}
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Membership</span>
                <Badge variant="outline">{(user?.membership_tier || 'free').toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize">{user?.role || 'user'} {user?.role_title ? `(${user.role_title})` : ''}</span>
              </div>
              {user?.breeder_info && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Breeder ID</span>
                  <span>{user.breeder_info.petbookin_breeder_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theme Tab (MySpace-style) */}
        {activeTab === 'theme' && (
          <div className="space-y-6" data-testid="theme-settings">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-2" style={{ fontFamily: 'Outfit' }}>Profile Theme</h2>
              <p className="text-sm text-muted-foreground mb-6">Customize how your profile looks to others, just like the good old days.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleThemeUpdate(preset)}
                    className={`relative p-4 rounded-2xl border-2 transition-all hover:scale-105 ${
                      theme.accent_color === preset.accent_color ? 'border-primary shadow-md' : 'border-border'
                    }`}
                    style={{ backgroundColor: preset.bg_color }}
                    data-testid={`theme-${preset.name.toLowerCase()}`}
                  >
                    <div className="w-full h-12 rounded-xl mb-2" style={{ backgroundColor: preset.card_bg, border: `1px solid ${preset.accent_color}30` }} />
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.accent_color }} />
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.text_color }} />
                    </div>
                    <p className="text-xs font-medium mt-2" style={{ color: preset.text_color }}>{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom colors */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Custom Colors</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: 'bg_color', label: 'Background' },
                  { key: 'card_bg', label: 'Card Background' },
                  { key: 'text_color', label: 'Text Color' },
                  { key: 'accent_color', label: 'Accent Color' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme[key] || '#FFFFFF'}
                      onChange={(e) => {
                        const newTheme = { ...theme, [key]: e.target.value };
                        setTheme(newTheme);
                      }}
                      className="w-10 h-10 rounded-xl border border-border cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{theme[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => handleThemeUpdate(theme)}
                className="rounded-full bg-primary text-white hover:bg-primary/90 mt-4"
                data-testid="save-custom-theme-btn"
              >
                Apply Custom Theme
              </Button>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="rounded-2xl border border-border bg-card p-6" data-testid="account-settings">
            <h2 className="font-semibold mb-4" style={{ fontFamily: 'Outfit' }}>Account Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium">AI Bio Generations</p>
                  <p className="text-xs text-muted-foreground">Used this billing cycle</p>
                </div>
                <span className="text-sm font-medium">{user?.ai_generations_used || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Points Balance</p>
                  <p className="text-xs text-muted-foreground">Earned from activities</p>
                </div>
                <span className="text-sm font-medium">{user?.points || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
