import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  user: { name: string; role: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TODO: Replace with real JWT/Session check
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const user = isAuthenticated ? { name: '행정팀 관리자', role: 'Super Admin' } : null;

  useEffect(() => {
    // Check local storage for persisted session (Mock)
    const storedAuth = localStorage.getItem('erica_admin_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem('erica_admin_auth', 'true');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('erica_admin_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};