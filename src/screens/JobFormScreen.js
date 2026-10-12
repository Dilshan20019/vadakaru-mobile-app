import React, { useState } from 'react';
import { Alert, Switch, Text } from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Field, Button, Chip, ChipRow, Row, Stepper, Muted } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { DISTRICTS, TRADES, PERKS } from '../constants';
import { dayStr } from '../utils';
import { colors } from '../theme';

const START_OPTIONS = [[0, 'Today'], [1, 'Tomorrow'], [2, 'In 2 days'], [3, 'In 3 days']];
const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function JobFormScreen() {
  const router = useRouter();
  const { job: jobParam } = useLocalSearchParams();
  const serializedJob = Array.isArray(jobParam) ? jobParam[0] : jobParam;
  const existing = serializedJob ? JSON.parse(serializedJob) : null;
  const { user } = useAuth();

  const [f, setF] = useState({
    title: existing?.title || '',
    trade: existing?.trade || '',
    district: existing?.district || user.homeDistrict || '',
    town: existing?.town || '',
    lat: existing?.lat ?? null,
    lng: existing?.lng ?? null,
    dailyWage: existing?.dailyWage || 4500,
    days: existing?.days || 1,
    workersNeeded: existing?.workersNeeded || 1,
    startDate: existing?.startDate || dayStr(1),
    shiftStart: existing?.shiftStart || '07:30',
    urgent: existing?.urgent || false,
    perks: { meals: false, transport: false, cashPayout: false, accommodation: false, fairPay: true, overtime: false, ...(existing?.perks || {}) },
    description: existing?.description || '',
    scope: (existing?.scope || []).join('\n'),
    requirements: (existing?.requirements || []).join('\n'),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setPerk = (k) => (v) => setF((p) => ({ ...p, perks: { ...p.perks, [k]: v } }));

  // Pin the job on the worker map using this phone's GPS
  const useGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location access to pin the job site.');
      const pos = await Location.getCurrentPositionAsync({});
      setF((p) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    } catch (e) {
      Alert.alert('GPS error', errMsg(e));
    }
  };

  // CREATE or UPDATE
  const save = async () => {
    if (!f.title.trim() || !f.trade || !f.district) return Alert.alert('Missing details', 'Title, trade and district are required.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.shiftStart)) return Alert.alert('Invalid time', 'Enter the shift start as HH:MM (e.g. 07:30).');
    setBusy(true);
    try {
      const payload = { ...f, scope: lines(f.scope), requirements: lines(f.requirements) };
      if (existing) await api.put(`/jobs/${existing._id}`, payload);
      else await api.post('/jobs', payload);
      router.back();
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title={existing ? 'Save Changes' : 'Publish Job'} variant="accent" onPress={save} loading={busy} />}>
      <Field label="Job Title" value={f.title} onChangeText={set('title')} placeholder="Master Mason for 2-Storey House Extension" />
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Trade Needed</Text>
      <ChipRow>{TRADES.map((t) => <Chip key={t} label={t} selected={f.trade === t} onPress={() => set('trade')(t)} />)}</ChipRow>

      <SectionTitle icon="location-outline">Location</SectionTitle>
      <ChipRow scroll>{DISTRICTS.map((d) => <Chip key={d} label={d} selected={f.district === d} onPress={() => set('district')(d)} />)}</ChipRow>
      <Field style={{ marginTop: 8 }} label="Town / Site" value={f.town} onChangeText={set('town')} placeholder="Negombo" />
      <Row style={{ marginBottom: 12 }}>
        <Button title={f.lat != null ? 'Map pin set ✓' : 'Pin job site with GPS'} icon="locate-outline" variant={f.lat != null ? 'soft' : 'outline'} small onPress={useGps} />
        {f.lat != null ? <Muted style={{ marginLeft: 8 }}>{f.lat.toFixed(4)}, {f.lng.toFixed(4)}</Muted> : null}
      </Row>

      <SectionTitle icon="cash-outline">Pay & Crew</SectionTitle>
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Daily Wage (LKR)</Text>
      <Stepper value={f.dailyWage} onChange={set('dailyWage')} step={100} min={1000} max={20000} format={(v) => v.toLocaleString('en-US')} />
      <Text style={{ fontWeight: '700', marginTop: 12, marginBottom: 6 }}>Number of Days</Text>
      <Stepper value={f.days} onChange={set('days')} min={1} max={90} suffix=" day(s)" />
      <Text style={{ fontWeight: '700', marginTop: 12, marginBottom: 6 }}>Workers Needed</Text>
      <Stepper value={f.workersNeeded} onChange={set('workersNeeded')} min={1} max={50} />

      <SectionTitle icon="calendar-outline">Start</SectionTitle>
      <ChipRow>{START_OPTIONS.map(([n, l]) => <Chip key={n} label={l} selected={f.startDate === dayStr(n)} onPress={() => set('startDate')(dayStr(n))} />)}</ChipRow>
      <Field label="Shift start (HH:MM)" value={f.shiftStart} onChangeText={set('shiftStart')} placeholder="07:30" keyboardType="numbers-and-punctuation" />
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700' }}>Urgent (same-day start)</Text>
        <Switch value={f.urgent} onValueChange={set('urgent')} trackColor={{ true: colors.primary }} />
      </Row>

      <Card>
        <SectionTitle icon="gift-outline">Worker Perks</SectionTitle>
        {PERKS.map((p) => (
          <Row key={p.key} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
            <Text style={{ fontWeight: '600', flex: 1 }}>{p.label}</Text>
            <Switch value={!!f.perks[p.key]} onValueChange={setPerk(p.key)} trackColor={{ true: colors.primary }} />
          </Row>
        ))}
      </Card>

      <Field label="Description" value={f.description} onChangeText={set('description')} multiline placeholder="Short summary of the job" />
      <Field label="Scope of work (one task per line)" value={f.scope} onChangeText={set('scope')} multiline placeholder={'Lay hollow block walls\nPlaster internal walls'} />
      <Field label="Worker prerequisites (one per line)" value={f.requirements} onChangeText={set('requirements')} multiline placeholder={'NVQ or 3+ years experience\nOwn trowels and level'} />
    </Screen>
  );
}
