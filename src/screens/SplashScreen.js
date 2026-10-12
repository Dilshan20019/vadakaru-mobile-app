import React, { useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../theme';
import { useLang } from '../context/LanguageContext';

export default function SplashScreen() {
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    const id = setTimeout(() => router.replace('/Language'), 1800);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <SafeAreaView style={s.wrap}>
      <View style={s.top}>
        <Text style={s.pill}>SRI LANKA</Text>
        <Text style={s.pill}>Secure Network</Text>
      </View>
      <View style={s.center}>
        <View style={s.logo}><Ionicons name="people" size={52} color={colors.primary} /></View>
        <Text style={s.brand}>Vedakaru<Text style={{ color: colors.primary }}>.</Text></Text>
        <Text style={s.tag}>{t('tagline')}</Text>
        <Text style={s.sub}>Connecting skills with opportunities across Sri Lanka.</Text>
      </View>
      <Text style={s.foot}>Fair Pay • Reliable Support • Direct Connect</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F8F8FF', padding: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: { fontSize: 11, fontWeight: '700', color: colors.muted, backgroundColor: '#E8EEF9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)' },
      default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    }),
  },
  brand: { fontSize: 34, fontWeight: '900', color: colors.text, marginTop: 18 },
  tag: { marginTop: 10, backgroundColor: colors.primarySoft, color: colors.primary, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
  sub: { color: colors.muted, textAlign: 'center', marginTop: 14, width: 240 },
  foot: { textAlign: 'center', color: colors.muted, fontSize: 12, marginBottom: 8 },
});
