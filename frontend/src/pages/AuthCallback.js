import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const { processGoogleSession } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const sessionId = params.get('session_id');

    if (sessionId) {
      processGoogleSession(sessionId)
        .then((userData) => {
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/feed', { state: { user: userData } });
        })
        .catch(() => {
          navigate('/');
        });
    } else {
      navigate('/');
    }
  }, [processGoogleSession, navigate]);

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4080ff] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[#65676b]">Signing you in...</p>
      </div>
    </div>
  );
}
