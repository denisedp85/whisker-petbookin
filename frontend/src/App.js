import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import FeedPage from './pages/FeedPage';
import MyPetsPage from './pages/MyPetsPage';
import SearchPage from './pages/SearchPage';
import BreederRegistryPage from './pages/BreederRegistryPage';
import BreederDirectoryPage from './pages/BreederDirectoryPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import MembershipPage from './pages/MembershipPage';
import CertificatesPage from './pages/CertificatesPage';
import MapPage from './pages/MapPage';
import MarketplacePage from './pages/MarketplacePage';
import GamesPage from './pages/GamesPage';
import VIPDirectoryPage from './pages/VIPDirectoryPage';
import LivePage from './pages/LivePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id (Google OAuth callback)
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/my-pets" element={<ProtectedRoute><MyPetsPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/breeder-registry" element={<ProtectedRoute><BreederRegistryPage /></ProtectedRoute>} />
      <Route path="/breeder-directory" element={<ProtectedRoute><BreederDirectoryPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
      <Route path="/games" element={<ProtectedRoute><GamesPage /></ProtectedRoute>} />
      <Route path="/vip-directory" element={<ProtectedRoute><VIPDirectoryPage /></ProtectedRoute>} />
      <Route path="/live" element={<ProtectedRoute><LivePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
