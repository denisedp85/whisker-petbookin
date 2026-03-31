import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pawbook_token'));
  const [loading, setLoading] = useState(true);
  const [pets, setPets] = useState([]);
  const [activePet, setActivePet] = useState(null);

  const authHeaders = useCallback(() => {
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }, [token]);

  const checkAuth = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setUser(res.data);
    } catch {
      localStorage.removeItem('pawbook_token');
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const fetchPets = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/pets/mine`, { headers: authHeaders() });
      setPets(res.data);
      if (res.data.length > 0 && !activePet) {
        setActivePet(res.data[0]);
      }
    } catch (e) {
      console.error('Failed to fetch pets', e);
    }
  }, [token, authHeaders, activePet]);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) fetchPets();
  }, [user, fetchPets]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('pawbook_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('pawbook_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/feed';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleSession = async (sessionId) => {
    const res = await axios.post(`${API}/auth/google-session`, { session_id: sessionId }, { withCredentials: true });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('pawbook_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true, headers: authHeaders() });
    } catch {}
    localStorage.removeItem('pawbook_token');
    setToken(null);
    setUser(null);
    setPets([]);
    setActivePet(null);
  };

  const updateProfile = async (data) => {
    const res = await axios.put(`${API}/auth/profile`, data, { headers: authHeaders() });
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, pets, activePet, setActivePet,
      login, register, loginWithGoogle, processGoogleSession, logout,
      updateProfile, fetchPets, authHeaders, API
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
