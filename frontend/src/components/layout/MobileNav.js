import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, Search, PawPrint, Shield, Settings, LogOut, Menu, X,
  Users, Store, Gamepad2, Crown, MessageCircle, ScrollText, MapPin
} from 'lucide-react';

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setOpen(false);
  };

  const navItems = [
    { to: '/feed', icon: Home, label: 'Feed' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/map', icon: MapPin, label: 'Map' },
    { to: '/my-pets', icon: PawPrint, label: 'My Pets' },
    { to: '/breeder-registry', icon: Shield, label: 'Registry' },
    { to: '/certificates', icon: ScrollText, label: 'Certificates' },
    { to: '/breeder-directory', icon: Users, label: 'Breeders' },
    { to: '/membership', icon: Crown, label: 'Membership' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (user?.is_admin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between" data-testid="mobile-topbar">
        <NavLink to="/feed" className="flex items-center gap-2">
          <PawPrint className="w-6 h-6 text-primary" strokeWidth={2.5} />
          <span className="text-lg font-bold" style={{ fontFamily: 'Outfit' }}>
            Pet<span className="text-primary">bookin</span>
          </span>
        </NavLink>
        <button
          onClick={() => setOpen(!open)}
          data-testid="mobile-menu-btn"
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-card border-l border-border p-4 pt-16 animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-muted'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:text-destructive hover:bg-destructive/5 transition-colors w-full"
              >
                <LogOut className="w-[18px] h-[18px]" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar for mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around" data-testid="mobile-bottom-bar">
        {[
          { to: '/feed', icon: Home, label: 'Feed' },
          { to: '/search', icon: Search, label: 'Search' },
          { to: '/my-pets', icon: PawPrint, label: 'Pets' },
          { to: '/breeder-registry', icon: Shield, label: 'Registry' },
          { to: '/settings', icon: Settings, label: 'Settings' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
}
