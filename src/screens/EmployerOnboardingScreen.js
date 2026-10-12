import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Screen, Card, Field, Button, Chip, ChipRow, Muted, Row } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { DISTRICTS, INDUSTRIES } from '../constants';
import { colors } from '../theme';

const STEPS = ['Basic Details', 'Logo & Industry', 'Base Location'];

export default function EmployerOnboardingScreen({ navigation }) {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    companyName: user.companyName || '',
    authorizedRep: user.authorizedRep || user.fullName || '',
    avatarUrl: user.avatarUrl || '',
    industry: user.industry || '',
    homeDistrict: user.homeDistrict || '',
    yardLocation: user.yardLocation || '',
    location: user.location || null,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const goMain = () => router.replace('/(employer)/Home');

  // UPDATE employer profile (also used by Skip to just mark onboarding done)
  const save = async (payload) => {
    setBusy(true);
    try {
      const { data } = await api.put('/profile', { ...payload, onboardingComplete: true });
      setUser(data.user);
      goMain();
    } catch (e) {
      Alert.alert('Could not save', errMsg(e));
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 0 && !f.companyName.trim()) return Alert.alert('Company name needed', 'Enter your company or business name.');
    if (step < 2) return setStep(step + 1);
    save({ ...f, location: f.location || undefined });
  };

  const useGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location access or choose a district instead.');
      const pos = await Location.getCurrentPositionAsync({});
      set('location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      Alert.alert('Location saved', 'Your current position will be your base location.');
    } catch (e) {
      Alert.alert('Could not get location', errMsg(e));
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title={step === 2 ? 'Finish Setup' : 'Continue'} onPress={next} loading={busy} />
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            {step > 0 ? <TouchableOpacity onPress={() => setStep(step - 1)}><Text style={{ color: colors.primary, fontWeight: '700' }}>Back</Text></TouchableOpacity> : <View />}
            <TouchableOpacity onPress={() => save({})}><Text style={{ color: colors.muted, fontWeight: '700' }}>Skip</Text></TouchableOpacity>
          </Row>
        </>
      }
    >
      <Muted style={{ fontWeight: '700' }}>STEP {step + 1} OF 3</Muted>
      <Text style={{ fontSize: 22, fontWeight: '900', marginBottom: 10 }}>{STEPS[step]}</Text>
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        {STEPS.map((s, k) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 3, marginRight: 4, backgroundColor: k <= step ? colors.primary : colors.border }} />)}
      </View>

      {step === 0 ? (
        <Card>
          <Field label="Company / Business Name" value={f.companyName} onChangeText={(v) => set('companyName', v)} placeholder="Perera Constructions (Pvt) Ltd" />
          <Field label="Authorized Representative" value={f.authorizedRep} onChangeText={(v) => set('authorizedRep', v)} placeholder="Name and designation" />
        </Card>
      ) : null}

      {step === 1 ? (
        <>
          <Card>
            <Field label="Company Logo (image link)" value={f.avatarUrl} onChangeText={(v) => set('avatarUrl', v)} placeholder="https://…/logo.png" autoCapitalize="none" hint="Optional. You can add or change it later." />
          </Card>
          <Card>
            <Text style={{ fontWeight: '800', marginBottom: 8 }}>Industry</Text>
            <ChipRow>{INDUSTRIES.map((i) => <Chip key={i} label={i} selected={f.industry === i} onPress={() => set('industry', i)} />)}</ChipRow>
          </Card>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Card>
            <Text style={{ fontWeight: '800', marginBottom: 8 }}>District</Text>
            <ChipRow scroll>{DISTRICTS.map((d) => <Chip key={d} label={d} selected={f.homeDistrict === d} onPress={() => set('homeDistrict', d)} />)}</ChipRow>
            <Field label="Yard / Office Address" value={f.yardLocation} onChangeText={(v) => set('yardLocation', v)} placeholder="Nawala, Rajagiriya" style={{ marginTop: 10 }} />
            <Button title={f.location ? 'Update GPS Location' : 'Use My Current Location'} icon="locate-outline" variant="soft" small onPress={useGps} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
