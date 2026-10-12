import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken } from '../api';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setToken(token);
          const { data } = await api.get('/auth/me');
          setUser(data.user);
        }
      } catch (e) {
        if (e?.response?.status === 401) {
          setToken(null);
          await AsyncStorage.removeItem('token');
        } else {
          console.warn('Could not restore the saved session:', e?.message || 'Unknown error');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSession = async ({ token, user: u }) => {
    await AsyncStorage.setItem('token', token);
    setToken(token);
    setUser(u);
    return u;
  };

  const login = async (phone, password) => saveSession((await api.post('/auth/login', { phone, password })).data);
  const register = async (payload) => saveSession((await api.post('/auth/register', payload)).data);

  const logout = async () => {
    setToken(null);
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  const refresh = useCallback(async () => {
    const { data } = await api.get('/profile');
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
