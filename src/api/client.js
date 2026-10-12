import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (e) =>
  e?.response?.data?.message || (e?.message === 'Network Error' ? `Cannot reach the server at ${API_URL}` : e?.message) || 'Something went wrong';

export default api;
