import React, { useState } from 'react';
import { Alert, Switch, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Field, Button, Chip, ChipRow, Muted, Row, Stepper } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { INDUSTRIES, FACILITIES } from '../constants';
import { colors } from '../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmployerEditScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [f, setF] = useState({
    companyName: user.companyName || '',
    brNumber: user.brNumber || '',
    industry: user.industry || '',
    authorizedRep: user.authorizedRep || '',
    phone: user.phone || '',
    invoiceEmail: user.invoiceEmail || '',
    yardLocation: user.yardLocation || '',
    establishedYear: user.establishedYear || 2015,
    about: user.about || '',
    facilities: { dailyPayout: false, transport: false, ppe: false, teaSnack: false, overtime: false, ...(user.facilities || {}) },
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setFacility = (k) => (v) => setF((p) => ({ ...p, facilities: { ...p.facilities, [k]: v } }));

  // UPDATE employer profile
  const save = async () => {
    if (!f.companyName.trim()) return Alert.alert('Business name required', 'Enter your registered business name.');
    if (f.invoiceEmail && !EMAIL_RE.test(f.invoiceEmail.trim())) return Alert.alert('Invalid email', 'Enter a valid invoicing email address.');
    setBusy(true);
    try {
      const { data } = await api.put('/profile', { ...f, companyName: f.companyName.trim(), invoiceEmail: f.invoiceEmail.trim() });
      setUser(data.user);
      router.back();
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Row><Button title="Cancel" variant="outline" onPress={() => router.back()} style={{ flex: 1, marginRight: 8 }} /><Button title="Save Changes" variant="accent" onPress={save} loading={busy} style={{ flex: 1.4 }} /></Row>}>
      <Card tone="orange">
        <Muted style={{ color: '#92400E' }}>Profile adheres to the Wages Board guidelines. Changes to legal entities require re-verification within 48 hours.</Muted>
      </Card>

      <SectionTitle icon="business-outline">Business Details</SectionTitle>
      <Field label="Registered Business Name" value={f.companyName} onChangeText={set('companyName')} hint="Must match your Registrar of Companies (ROC) certificate" />
      <Field label="Business Registration No. (BR)" value={f.brNumber} onChangeText={set('brNumber')} autoCapitalize="characters" hint={user.brVerified ? 'Currently verified. Changing this number resets verification.' : 'Not verified yet'} />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Primary Industry / Trade</Text>
      <ChipRow>{INDUSTRIES.map((i) => <Chip key={i} label={i} selected={f.industry === i} onPress={() => set('industry')(i)} />)}</ChipRow>
      <Text style={{ fontWeight: '700', marginVertical: 6 }}>Established</Text>
      <Stepper value={f.establishedYear} onChange={set('establishedYear')} min={1950} max={2026} />

      <SectionTitle icon="person-outline">Contacts</SectionTitle>
      <Field label="Authorized Representative" value={f.authorizedRep} onChangeText={set('authorizedRep')} hint="Person authorized to dispatch workers and release daily wages" />
      <Field label="Primary Contact Hotline" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" hint="Workers see this number for instant dispatch calls" />
      <Field label="Official Invoicing Email" value={f.invoiceEmail} onChangeText={set('invoiceEmail')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Operational Base / Yard Location" value={f.yardLocation} onChangeText={set('yardLocation')} placeholder="Nawala, Rajagiriya (Colombo District)" />

      <SectionTitle icon="document-text-outline">About the Company / Work Scope</SectionTitle>
      <Field value={f.about} onChangeText={set('about')} multiline maxLength={500} placeholder="What kind of work do you hire for?" hint={`${f.about.length} / 500`} />

      <Card>
        <SectionTitle icon="people-outline">On-Site Employer Facilities</SectionTitle>
        {FACILITIES.map((fac) => (
          <Row key={fac.key} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontWeight: '600', flex: 1 }}>{fac.label}</Text>
            <Switch value={!!f.facilities[fac.key]} onValueChange={setFacility(fac.key)} trackColor={{ true: colors.primary }} />
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
