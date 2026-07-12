import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [manufacturer, setManufacturer] = useState(() => {
    const stored = localStorage.getItem('ft_manufacturer');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ft_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setManufacturer(res.data))
        .catch(() => { localStorage.removeItem('ft_token'); setManufacturer(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, mfrData) => {
    localStorage.setItem('ft_token', token);
    localStorage.setItem('ft_manufacturer', JSON.stringify(mfrData));
    setManufacturer(mfrData);
  };

  const logout = () => {
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_manufacturer');
    setManufacturer(null);
  };

  return (
    <AuthContext.Provider value={{ manufacturer, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
