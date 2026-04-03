import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ErrorBoundary from '../ErrorBoundary';
import ChatWidget from '../ChatWidget';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout({ children }) {
  const { user } = useAuth();
  const theme = user?.profile_theme || {};

  const bgStyle = {};
  if (theme.bg_color) bgStyle.backgroundColor = theme.bg_color;
  if (theme.video_bg_url) {
    bgStyle.backgroundImage = `url(${theme.video_bg_url})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
    bgStyle.backgroundAttachment = 'fixed';
  }

  return (
    <div className="flex min-h-screen" style={Object.keys(bgStyle).length > 0 ? bgStyle : undefined}>
      {/* Theme overlay for readability when background image is set */}
      {theme.video_bg_url && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-[2px] pointer-events-none z-0" />
      )}
      <Sidebar />
      <MobileNav />
      <main className="flex-1 min-w-0 lg:pl-0 pt-14 lg:pt-0 pb-16 lg:pb-0 relative z-10">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
