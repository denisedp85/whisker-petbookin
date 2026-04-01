import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const { processGoogleSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.replace('#', '?')).get('session_id');

    if (!sessionId) {
      navigate('/', { replace: true });
      return;
    }

    processGoogleSession(sessionId)
      .then(() => {
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/feed', { replace: true });
      })
      .catch((err) => {
        console.error('Google auth failed:', err);
        navigate('/', { replace: true });
      });
  }, [processGoogleSession, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
