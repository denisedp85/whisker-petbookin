import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ErrorBoundary from '../ErrorBoundary';

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="flex-1 min-w-0 lg:pl-0 pt-14 lg:pt-0 pb-16 lg:pb-0">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
