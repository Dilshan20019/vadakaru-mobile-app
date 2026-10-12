import { Alert, Linking } from 'react-native';

export const callPhone = (phone) =>
  phone ? Linking.openURL(`tel:${phone}`) : Alert.alert('No number', 'A phone number is not available for this contact.');

export const openMaps = (lat, lng) =>
  lat != null && lng != null
    ? Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
    : Alert.alert('No map location', 'This job has no map pin yet.');

// Sri Lanka is UTC+05:30
const colomboDay = (offset = 0) => new Date(Date.now() + 5.5 * 3600e3 + offset * 86400e3).toISOString().slice(0, 10);

export const startLabel = (d) => {
  if (!d) return 'Start date flexible';
  if (d === colomboDay(0)) return 'Starts Today';
  if (d === colomboDay(1)) return 'Starts Tomorrow';
  return `Starts ${d}`;
};

export const timeLabel = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '—';

export const dateTimeLabel = (iso) =>
  iso ? new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }) : '—';

export const todayStr = () => colomboDay(0);
export const dayStr = colomboDay;

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
