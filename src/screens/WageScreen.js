import React, { useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Button, Stepper, Muted, Row, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { PAYOUT_METHODS } from '../constants';
import { colors } from '../theme';

const ADDONS = [
  { key: 'masterTools', title: 'Provide Own Master Tools', sub: 'Levels, aluminium floats, trowels, electric angle grinders', bonus: '+ LKR 300/day' },
  { key: 'siteTravel', title: 'Site Travel Allowance (>10km)', sub: 'Reimbursement for motorcycle fuel or 3-wheeler fare', bonus: '+ LKR 500/day' },
  { key: 'leadBaas', title: 'Lead Baas Supervisory Fee', sub: 'Applied when managing 3+ helpers on site', bonus: '+ LKR 800/day' },
];

export default function WageScreen() {
  const router = useRouter();
  const { onboarding: onboardingParam } = useLocalSearchParams();
  const onboarding = Array.isArray(onboardingParam)
    ? onboardingParam.includes('true')
    : onboardingParam === 'true';
  const { user, setUser } = useAuth();
  const [w, setW] = useState({ ...user.wage, addOns: { ...user.wage.addOns } });
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setW((p) => ({ ...p, [k]: v }));
  const setAddon = (k) => (v) => setW((p) => ({ ...p, addOns: { ...p.addOns, [k]: v } }));

  // UPDATE wage preferences
  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put('/profile/wage', w);
      let updated = { ...user, wage: data.wage };
      if (onboarding) {
        const res = await api.put('/profile', { onboardingComplete: true });
        updated = res.data.user;
      }
      setUser(updated);
      if (onboarding) {
        router.replace('/(worker)/Jobs');
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // DELETE custom wage settings -> back to district average
  const reset = () =>
    Alert.alert('Reset wages', 'Reset all wage settings to the district average?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await api.delete('/profile/wage');
            setW({ ...data.wage, addOns: { ...data.wage.addOns } });
            setUser({ ...user, wage: data.wage });
          } catch (e) {
            Alert.alert('Reset failed', errMsg(e));
          }
        },
      },
    ]);

  return (
    <Screen footer={<Button title={onboarding ? 'Save Wages & Finish' : 'Save Wage Preferences'} variant="accent" onPress={save} loading={busy} />}>
      {onboarding ? <Muted style={{ fontWeight: '700' }}>STEP 4 OF 5 • Wage Preferences</Muted> : null}
      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginVertical: 6 }}>Set Your Daily Wage & Payouts</Text>

      <Card tone="blue">
        <Muted>Your base expected shift wage</Muted>
        <Text style={{ fontSize: 30, fontWeight: '900', color: colors.primary, marginVertical: 8 }}>{money(w.fullDay)} <Text style={{ fontSize: 14 }}>/ day</Text></Text>
        <Stepper value={w.fullDay} onChange={set('fullDay')} step={100} min={1000} max={20000} format={(v) => v.toLocaleString('en-US')} />
        <Muted style={{ marginTop: 8 }}>Regional average in {user.homeDistrict || 'your district'}: LKR 4,200 – 4,800</Muted>
      </Card>

      <Card>
        <SectionTitle icon="time-outline">Shift Variations & Overtime</SectionTitle>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Half-Day (4 hrs)</Text>
        <Stepper value={w.halfDay} onChange={set('halfDay')} step={100} min={500} max={10000} format={(v) => v.toLocaleString('en-US')} />
        <Text style={{ fontWeight: '700', marginTop: 12, marginBottom: 6 }}>Overtime (per hour)</Text>
        <Stepper value={w.overtimeRate} onChange={set('overtimeRate')} step={50} min={100} max={3000} format={(v) => v.toLocaleString('en-US')} />
      </Card>

      <Card>
        <SectionTitle icon="add-circle-outline">Add-ons & Tool Allowances</SectionTitle>
        {ADDONS.map((a) => (
          <Row key={a.key} style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontWeight: '700' }}>{a.title}</Text>
              <Muted>{a.sub}</Muted>
              <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>{a.bonus}</Text>
            </View>
            <Switch value={!!w.addOns[a.key]} onValueChange={setAddon(a.key)} trackColor={{ true: colors.primary }} />
          </Row>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="wallet-outline">Preferred Payout Schedule</SectionTitle>
        {PAYOUT_METHODS.map((m) => {
          const selected = w.payoutMethod === m.key;
          return (
            <TouchableOpacity key={m.key} onPress={() => set('payoutMethod')(m.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.muted} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{m.title}</Text>
                <Muted>{m.sub}</Muted>
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>

      <Card tone="orange">
        <Text style={{ fontWeight: '800' }}>100% Escrow Wage Guarantee</Text>
        <Muted style={{ marginTop: 4 }}>Every employer deposits your shift wage into escrow before work starts. Report issues to our hotline: 1388.</Muted>
      </Card>

      <Button title="Reset to District Average" variant="outline" small onPress={reset} />
    </Screen>
  );
}
