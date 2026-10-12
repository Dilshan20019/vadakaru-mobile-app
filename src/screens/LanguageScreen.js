import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, Card, Button, Muted } from '../components/ui';
import { useLang } from '../context/LanguageContext';
import { colors } from '../theme';

const OPTIONS = [
  { key: 'en', badge: 'EN', title: 'English', sub: 'Default interface & worksite summaries' },
  { key: 'si', badge: 'සි', title: 'සිංහල (Sinhala)', sub: 'දෛනික වැටුප් සහ විශ්වාසවන්ත කාර්මිකයන්' },
  { key: 'ta', badge: 'த', title: 'தமிழ் (Tamil)', sub: 'தினசரி ஊதியம் மற்றும் நம்பகமான தொழிலாளர்கள்' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();

  return (
    <Screen footer={<Button title={t('continue')} variant="accent" onPress={() => router.navigate('/RoleSelect')} />}>
      <Text style={{ fontSize: 24, fontWeight: '900', textAlign: 'center', color: colors.text, marginTop: 4 }}>{t('chooseLanguage')}</Text>
      <Muted style={{ textAlign: 'center', marginBottom: 16, marginTop: 4 }}>You can change this anytime in account settings</Muted>

      {OPTIONS.map((o) => {
        const selected = lang === o.key;
        return (
          <TouchableOpacity key={o.key} activeOpacity={0.85} onPress={() => setLang(o.key)}>
            <Card style={selected ? { borderColor: colors.primary, borderWidth: 2 } : null}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontWeight: '900', color: '#B45309', fontSize: 16 }}>{o.badge}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{o.title}</Text>
                  <Muted>{o.sub}</Muted>
                </View>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? colors.primary : colors.border} />
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}

      <Card tone="orange">
        <Text style={{ fontWeight: '800', color: colors.text }}>Need Voice Assistance?</Text>
        <Muted style={{ marginTop: 4 }}>All job postings, daily wage estimates and site routes are read out loud clearly in your native language.</Muted>
        <Text style={{ marginTop: 8, fontWeight: '700', color: colors.primary }}>Toll-Free Hotline: 1388</Text>
      </Card>
    </Screen>
  );
}
