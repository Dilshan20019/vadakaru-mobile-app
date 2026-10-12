import React, { useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, Card, Button, Muted } from '../components/ui';
import { useLang } from '../context/LanguageContext';
import { colors } from '../theme';

const ROLES = [
  {
    key: 'worker', icon: 'hammer', tag: 'High Demand • Daily payouts', title: "I'm Looking for Work",
    desc: 'Find jobs that match my trades & daily rates',
    points: ['Daily wage payouts direct to mobile / cash', 'Verified local household & site employers', 'Instant SMS and call job alerts nearby'],
    foot: 'Average baseline rate: Rs. 3,500 – 6,000 / day',
  },
  {
    key: 'employer', icon: 'business', tag: 'Verified Only • 0% Commission', title: "I'm Hiring Workers",
    desc: 'Find reliable masons, helpers, electricians & painters',
    points: ['National ID & Police checked tradespeople', 'Fast direct calls with zero agency commission', 'Emergency on-demand workers within 1 hour'],
    foot: 'Trust guarantee: 100% Free Worker Contact',
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const { t } = useLang();
  const [role, setRole] = useState('worker');

  return (
    <Screen
      footer={
        <>
          <Button title={role === 'worker' ? 'Continue as Worker' : 'Continue as Employer'} onPress={() => router.navigate({ pathname: '/Onboarding', params: { role } })} />
          <TouchableOpacity onPress={() => router.navigate({ pathname: '/Login', params: { role } })} style={{ marginTop: 10, alignItems: 'center' }}>
            <Text style={{ color: colors.muted }}>Already have a Vedakaru account? <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('login')}</Text></Text>
          </TouchableOpacity>
        </>
      }
    >
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{t('roleTitle')}</Text>
      <Muted style={{ marginVertical: 8, fontSize: 13 }}>Choose your primary role to get tailored jobs and candidate matches. You can switch roles anytime from settings.</Muted>

      {ROLES.map((r) => {
        const selected = role === r.key;
        return (
          <TouchableOpacity key={r.key} activeOpacity={0.9} onPress={() => setRole(r.key)}>
            <Card tone={selected ? 'blue' : undefined} style={selected ? { borderColor: colors.primary, borderWidth: 2 } : null}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={r.icon} size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Muted style={{ color: colors.success, fontWeight: '700' }}>{r.tag}</Muted>
                  <Text style={{ fontWeight: '800', fontSize: 17, color: colors.text }}>{r.title}</Text>
                  <Muted>{r.desc}</Muted>
                </View>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? colors.primary : colors.border} />
              </View>
              {r.points.map((p) => (
                <View key={p} style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{p}</Text>
                </View>
              ))}
              <Muted style={{ marginTop: 8, fontWeight: '700' }}>{r.foot}</Muted>
            </Card>
          </TouchableOpacity>
        );
      })}

      <Card>
        <Text style={{ fontWeight: '800', color: colors.text }}>Dual-Account Flexibility</Text>
        <Muted style={{ marginTop: 4 }}>Need to hire today but offer carpentry tomorrow? You can toggle between "Worker" and "Employer" mode later in your profile.</Muted>
      </Card>
    </Screen>
  );
}
