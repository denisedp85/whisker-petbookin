import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { PawPrint, Home, Users, Search, Bell, Settings, LogOut, ChevronDown, Shield, Gamepad2, Crown, Heart } from 'lucide-react';

export default function Navbar() {
  const { user, pets, activePet, setActivePet, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { path: '/feed', icon: Home, label: 'Feed' },
    { path: '/friends', icon: Users, label: 'Friends' },
    { path: '/membership', icon: Crown, label: 'Membership' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
  ];

  return (
    <nav className="bg-[#3b5998] shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Left: Logo + Search */}
          <div className="flex items-center gap-3">
            <Link to="/feed" className="flex items-center gap-1.5 text-white hover:opacity-90" data-testid="navbar-logo">
              <PawPrint className="w-6 h-6" />
              <span className="text-lg font-bold font-['Archivo_Narrow'] hidden sm:inline">Petbookin</span>
            </Link>
            <form onSubmit={handleSearch} className="hidden sm:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  data-testid="navbar-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Petbookin"
                  className="pl-8 h-8 w-52 bg-white/90 border-0 text-sm focus:ring-2 focus:ring-white/30 rounded-full"
                />
              </div>
            </form>
          </div>

          {/* Center: Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
            <Link
              to="/search"
              data-testid="nav-search-mobile"
              className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-white/80 hover:bg-white/10"
            >
              <Search className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: Pet switcher + User menu */}
          <div className="flex items-center gap-2">
            {/* Pet Switcher */}
            {pets.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="pet-switcher"
                    variant="ghost"
                    className="text-white hover:bg-white/10 gap-1 h-8 px-2 text-sm"
                  >
                    <PawPrint className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-[80px] truncate">{activePet?.name || 'Pet'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {pets.map(pet => (
                    <DropdownMenuItem
                      key={pet.pet_id}
                      data-testid={`switch-pet-${pet.pet_id}`}
                      onClick={() => setActivePet(pet)}
                      className={activePet?.pet_id === pet.pet_id ? 'bg-blue-50' : ''}
                    >
                      <PawPrint className="w-4 h-4 mr-2 text-[#4080ff]" />
                      <span className="truncate">{pet.name}</span>
                      {pet.is_breeder_profile && (
                        <span className="ml-auto text-xs text-blue-600 bg-blue-50 px-1 rounded">Breeder</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Notifications placeholder */}
            <Button variant="ghost" className="text-white hover:bg-white/10 h-8 w-8 p-0 relative" data-testid="navbar-notifications">
              <Bell className="w-4 h-4" />
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-testid="user-menu"
                  variant="ghost"
                  className="text-white hover:bg-white/10 h-8 w-8 p-0 rounded-full"
                >
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-7 h-7 rounded-full object-cover border border-white/30" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-[#1c1e21]">{user?.name}</p>
                  <p className="text-xs text-[#65676b]">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                {activePet && (
                  <DropdownMenuItem data-testid="menu-my-profile" onClick={() => navigate(`/profile/${activePet.pet_id}`)}>
                    <PawPrint className="w-4 h-4 mr-2" /> My Pet Profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem data-testid="menu-settings" onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                {user?.is_admin && (
                  <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate('/admin')}>
                    <Shield className="w-4 h-4 mr-2 text-amber-500" /> Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-logout" onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
