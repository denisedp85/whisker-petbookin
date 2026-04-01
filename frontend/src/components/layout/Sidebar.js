import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Search, PawPrint, Shield, Settings, LogOut,
  Users, Store, Gamepad2, Crown, MessageCircle, ChevronDown
} from 'lucide-react';
import { Badge } from '../ui/badge';

const navGroups = [
  {
    label: 'Feeds',
    items: [
      { to: '/feed', icon: Home, label: 'Home Feed' },
      { to: '/search', icon: Search, label: 'Explore' },
    ]
  },
  {
    label: 'My Pets',
    items: [
      { to: '/my-pets', icon: PawPrint, label: 'My Pets' },
      { to: '/messages', icon: MessageCircle, label: 'Messages', badge: 'Soon' },
    ]
  },
  {
    label: 'Registry',
    items: [
      { to: '/breeder-registry', icon: Shield, label: 'Breeder Registry' },
      { to: '/breeder-directory', icon: Users, label: 'Breeder Directory' },
    ]
  },
  {
    label: 'Market & Play',
    items: [
      { to: '/marketplace', icon: Store, label: 'Marketplace', badge: 'Soon' },
      { to: '/games', icon: Gamepad2, label: 'Games', badge: 'Soon' },
    ]
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const tierColors = {
    free: 'bg-muted text-muted-foreground',
    prime: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    ultra: 'bg-amber-100 text-amber-700',
    mega: 'bg-gradient-to-r from-primary to-secondary text-white',
  };

  return (
    <aside className="w-72 flex-shrink-0 hidden lg:flex flex-col border-r border-border bg-card/50 backdrop-blur-sm h-screen sticky top-0" data-testid="sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <NavLink to="/feed" className="flex items-center gap-2" data-testid="sidebar-logo">
          <PawPrint className="w-8 h-8 text-primary" strokeWidth={2.5} />
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Pet<span className="text-primary">bookin</span>
          </span>
        </NavLink>
      </div>

      {/* User quick card */}
      <div className="p-4 mx-3 mt-4 rounded-2xl bg-muted/50 border border-border" data-testid="sidebar-user-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <Badge className={`text-[10px] px-1.5 py-0 ${tierColors[user?.membership_tier] || tierColors.free}`}>
              {(user?.membership_tier || 'free').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" data-testid="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground px-4 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:text-foreground hover:bg-muted/80'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* VIP */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground px-4 mb-2">Premium</p>
          <NavLink
            to="/membership"
            data-testid="nav-membership"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-secondary/10 text-secondary' : 'text-foreground/70 hover:text-foreground hover:bg-muted/80'
              }`
            }
          >
            <Crown className="w-[18px] h-[18px]" />
            <span>Membership</span>
          </NavLink>
        </div>

        {/* Admin link */}
        {user?.is_admin && (
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground px-4 mb-2">Admin</p>
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-destructive/10 text-destructive' : 'text-foreground/70 hover:text-foreground hover:bg-muted/80'
                }`
              }
            >
              <Shield className="w-[18px] h-[18px]" />
              <span>Dashboard</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-0.5">
        <NavLink
          to="/settings"
          data-testid="nav-settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:text-foreground hover:bg-muted/80'
            }`
          }
        >
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
