import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 1) If you set expo.extra.apiUrl in app.json, that wins (use it for a deployed server).
// 2) Otherwise we reuse the IP of the computer running `expo start`, so a real phone
//    on the same Wi-Fi reaches the backend with zero configuration.
function resolveApiUrl() {
  const fixed = Constants.expoConfig?.extra?.apiUrl;
  if (fixed) return fixed;

  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) return `http://${hostUri.split(':')[0]}:3000/api`;

  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
}

export const API_URL = resolveApiUrl();
