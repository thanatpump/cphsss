'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  hospcode: string | null;
  username: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hospcode, setHospcode] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // ตรวจสอบ authentication state จาก localStorage เมื่อโหลดหน้า
    const authStatus = localStorage.getItem('isAuthenticated');
    const storedHospcode = localStorage.getItem('hospcode');
    const storedUsername = localStorage.getItem('username');
    if (authStatus === 'true' && storedHospcode) {
      setIsAuthenticated(true);
      setHospcode(storedHospcode);
      setUsername(storedUsername);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.hospcode) {
        setIsAuthenticated(true);
        setHospcode(data.hospcode);
        setUsername(username);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('hospcode', data.hospcode);
        localStorage.setItem('username', username);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setHospcode(null);
    setUsername(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('hospcode');
    localStorage.removeItem('username');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading, hospcode, username }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 