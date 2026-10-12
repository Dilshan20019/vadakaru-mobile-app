import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Field, Button, Muted, SectionTitle, Chip, ChipRow, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { DISTRICTS } from '../constants';
import { errMsg } from '../api/client';

const NIC_RE = /^(\d{9}[vVxX]|\d{12})$/;
const PHONE_RE = /^(\+94|0)?7\d{8}$/;

export default function RegisterScreen() {
  const { role: requestedRole } = useLocalSearchParams();
  const role = requestedRole === 'employer' ? 'employer' : 'worker';
  const { register } = useAuth();
  const { lang } = useLang();

  const [f, setF] = useState({ fullName: '', phone: '', password: '', nic: '', nearestTown: '', homeDistrict: '', companyName: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (f.fullName.trim().length < 3) e.fullName = 'Enter your full name as on your NIC';
    if (!PHONE_RE.test(f.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Sri Lankan mobile (e.g. 077 123 4567)';
    if (f.password.length < 6) e.password = 'At least 6 characters';
    if (role === 'worker' && !NIC_RE.test(f.nic.trim())) e.nic = 'NIC must be 9 digits + V/X, or 12 digits';
    if (role === 'worker' && !f.homeDistrict) e.homeDistrict = 'Select your home district';
    if (role === 'employer' && !f.companyName.trim()) e.companyName = 'Enter your company or household name';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await register({ ...f, role, language: lang });
    } catch (e) {
      Alert.alert('Registration failed', errMsg(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title={role === 'worker' ? 'Complete Registration & Set Location' : 'Create Employer Account'} variant="accent" onPress={submit} loading={busy} />}>
      <Card tone="orange"><Muted style={{ color: '#92400E' }}>Free registration • No agency commission • 100% fair pay</Muted></Card>

      <SectionTitle icon="person-outline">Personal Information</SectionTitle>
      <Field label="Full Name (as per NIC)" value={f.fullName} onChangeText={set('fullName')} placeholder="Kasun Chamara Perera" error={errors.fullName} />
      <Field label="Mobile Number" value={f.phone} onChangeText={set('phone')} placeholder="077 123 4567" keyboardType="phone-pad" error={errors.phone} />
      <Field label="Password" value={f.password} onChangeText={set('password')} placeholder="Create a password" secureTextEntry error={errors.password} />

      {role === 'employer' ? (
        <Field label="Company / Household Name" value={f.companyName} onChangeText={set('companyName')} placeholder="Dileepa Contractors" error={errors.companyName} />
      ) : (
        <>
          <Field label="NIC Number" value={f.nic} onChangeText={set('nic')} placeholder="892451234V or 12 digits" autoCapitalize="characters" error={errors.nic} />
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Home District</Text>
          <ChipRow scroll>
            {DISTRICTS.map((d) => <Chip key={d} label={d} selected={f.homeDistrict === d} onPress={() => set('homeDistrict')(d)} />)}
          </ChipRow>
          {errors.homeDistrict ? <Text style={{ color: '#DC2626', fontSize: 12 }}>{errors.homeDistrict}</Text> : null}
          <Field style={{ marginTop: 10 }} label="Nearest Town / Operating Zone" value={f.nearestTown} onChangeText={set('nearestTown')} placeholder="Negombo / Ja-Ela" />
        </>
      )}
    </Screen>
  );
}
