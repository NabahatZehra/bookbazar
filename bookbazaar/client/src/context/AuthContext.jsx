import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  return useContext(AuthContext);
};

const LEGACY_KEYS = ['adminToken', 'adminUser'];

function readStoredAuth() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { token: null, user: null };
    const raw = localStorage.getItem('user');
    if (!raw) return { token, user: null };
    return { token, user: JSON.parse(raw) };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { token: null, user: null };
  }
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return user;
  const id = user.id ?? user._id;
  if (id == null) return user;
  return { ...user, id: String(id), _id: id };
}

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
  const initial = readStoredAuth();
  const [user, setUser] = useState(() => normalizeUser(initial.user));
  const [token, setToken] = useState(() => initial.token);
  /** Brief bootstrap so guards can show a spinner instead of flashing redirects */
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      if (token) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(normalizeUser(JSON.parse(storedUser)));
        else setUser(null);
      } else {
        setUser(null);
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    }
  }, [token]);

  /**
   * Accepts API shape: login({ token, user })
   */
  const login = ({ token: nextToken, user: nextUser }) => {
    if (!nextToken || !nextUser) return;
    const normalized = normalizeUser(nextUser);
    setToken(nextToken);
    setUser(normalized);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  };

  const isAuthenticated = Boolean(user && token);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
