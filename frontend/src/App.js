import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import AuthCallback from './pages/AuthCallback';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import GamingPage from './pages/GamingPage';
import MembershipPage from './pages/MembershipPage';
import DonationPage from './pages/DonationPage';
import VIPComingSoonPage from './pages/VIPComingSoonPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full" />
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
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full" />
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
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/profile/:petId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/games" element={<ProtectedRoute><GamingPage /></ProtectedRoute>} />
      <Route path="/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
      <Route path="/donate" element={<ProtectedRoute><DonationPage /></ProtectedRoute>} />
      <Route path="/vip" element={<ProtectedRoute><VIPComingSoonPage /></ProtectedRoute>} />
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
