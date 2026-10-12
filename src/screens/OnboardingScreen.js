import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Button } from '../components/ui';
import { colors } from '../theme';

const SLIDES = {
  worker: [
    { icon: 'search', title: 'Find Daily Work Near You', text: 'Browse verified jobs by trade, wage and distance. Apply in one tap.' },
    { icon: 'calendar', title: 'Control Your Calendar', text: 'Mark the days you are free. Employers only see you when you are available.' },
    { icon: 'cash', title: 'Get Paid Fairly', text: 'See the daily wage before you apply and rate employers after every job.' },
  ],
  employer: [
    { icon: 'people', title: 'Find Skilled Craftsmen', text: 'Search masons, carpenters, electricians and helpers close to your site.' },
    { icon: 'megaphone', title: 'Post a Job in Minutes', text: 'Set the wage, start date and perks. Matching workers are recommended automatically.' },
    { icon: 'checkmark-done', title: 'Hire with Confidence', text: 'Check ratings and completed jobs, then accept or shortlist applicants.' },
  ],
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { role: requestedRole } = useLocalSearchParams();
  const role = requestedRole === 'employer' ? 'employer' : 'worker';
  const slides = SLIDES[role];
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const done = () => router.replace({ pathname: '/Register', params: { role } });
  const slide = slides[i];

  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button title={last ? 'Get Started' : 'Next'} onPress={() => (last ? done() : setI(i + 1))} />
          {!last ? (
            <TouchableOpacity onPress={done} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Skip</Text>
            </TouchableOpacity>
          ) : null}
        </>
      }
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={slide.icon} size={70} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 28 }}>{slide.title}</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 10, fontSize: 15, paddingHorizontal: 12 }}>{slide.text}</Text>
        <View style={{ flexDirection: 'row', marginTop: 28 }}>
          {slides.map((_, k) => (
            <View key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, marginHorizontal: 3, backgroundColor: k === i ? colors.primary : colors.border }} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
