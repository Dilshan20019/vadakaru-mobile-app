import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Chip, ChipRow, Button, Stepper, Muted, Row } from '../components/ui';
import { useFilters, DEFAULT_FILTERS } from '../context/FilterContext';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { TRADES, PERKS } from '../constants';
import { colors } from '../theme';

const DISTANCES = [3, 5, 10, 25];
const STARTS = [[null, 'Any Time'], ['today', 'Starts Today'], ['tomorrow', 'Tomorrow'], ['3days', 'Within 3 days']];
const DURATIONS = [[null, 'Any Duration'], ['1', '1 Day'], ['2-6', '2-6 Days'], ['7+', '1 Week+']];

export default function SearchFiltersScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { filters, setFilters, toParams, activeCount } = useFilters();
  const { user } = useAuth();
  const [f, setF] = useState(filters);
  const [preview, setPreview] = useState(null);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const toggleIn = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setF(DEFAULT_FILTERS)}><Text style={{ color: colors.primary, fontWeight: '800' }}>Reset</Text></TouchableOpacity>
      ),
    });
  }, [navigation]);

  // READ: live count of matching jobs for the chosen filters
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const { data } = await api.get('/jobs', { params: toParams(f) });
        setPreview(data.jobs.length);
      } catch (e) { setPreview(null); }
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  const apply = () => {
    setFilters(f);
    router.back();
  };

  // CREATE: turn the current filters into a saved SMS job alert
  const saveAlert = async () => {
    try {
      await api.post('/alerts', { trade: f.trades[0] || '', district: user.homeDistrict || '', minWage: f.minWage || 0 });
      Alert.alert('Alert created', 'We will SMS you when a matching job is posted.', [
        { text: 'OK' },
        { text: 'View alerts', onPress: () => router.push('/Alerts') },
      ]);
    } catch (e) {
      Alert.alert('Could not create alert', errMsg(e));
    }
  };

  const wageOn = f.minWage != null || f.maxWage != null;

  return (
    <Screen footer={<Button title={preview == null ? 'Show Jobs' : `Show ${preview} Job${preview === 1 ? '' : 's'}`} icon="arrow-forward" onPress={apply} />}>
      <Muted style={{ marginBottom: 8 }}>{activeCount(f)} filter(s) active</Muted>

      <Card>
        <SectionTitle icon="construct-outline">Trade & Skill Category</SectionTitle>
        <ChipRow>{TRADES.map((t) => <Chip key={t} label={t} selected={f.trades.includes(t)} onPress={() => toggleIn('trades', t)} />)}</ChipRow>
      </Card>

      <Card>
        <SectionTitle icon="cash-outline" right={wageOn ? <TouchableOpacity onPress={() => setF((p) => ({ ...p, minWage: null, maxWage: null }))}><Text style={{ color: colors.primary, fontWeight: '700' }}>Any wage</Text></TouchableOpacity> : null}>Daily Wage Range</SectionTitle>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Minimum (LKR / day)</Text>
        <Stepper value={f.minWage ?? 3500} onChange={(v) => setF((p) => ({ ...p, minWage: v }))} step={500} min={1000} max={20000} format={(v) => v.toLocaleString('en-US')} />
        <Text style={{ fontWeight: '700', marginTop: 10, marginBottom: 6 }}>Maximum (LKR / day)</Text>
        <Stepper value={f.maxWage ?? 6500} onChange={(v) => setF((p) => ({ ...p, maxWage: v }))} step={500} min={1000} max={30000} format={(v) => v.toLocaleString('en-US')} />
      </Card>

      <Card>
        <SectionTitle icon="navigate-outline">Location & Radius</SectionTitle>
        <ChipRow>
          <Chip label="Any distance" selected={!f.maxDistance} onPress={() => set('maxDistance')(null)} />
          {DISTANCES.map((d) => <Chip key={d} label={`${d} km`} selected={f.maxDistance === d} onPress={() => set('maxDistance')(d)} />)}
        </ChipRow>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontWeight: '700', flex: 1 }}>Closest jobs first</Text>
          <Switch value={f.closestFirst} onValueChange={set('closestFirst')} trackColor={{ true: colors.primary }} />
        </Row>
        <Muted>Distances use the GPS location saved in Location Setup.</Muted>
      </Card>

      <Card>
        <SectionTitle icon="calendar-outline">Duration & Start Time</SectionTitle>
        <ChipRow>{STARTS.map(([k, l]) => <Chip key={l} label={l} selected={f.startWithin === k} onPress={() => set('startWithin')(k)} />)}</ChipRow>
        <ChipRow>{DURATIONS.map(([k, l]) => <Chip key={l} label={l} selected={f.duration === k} onPress={() => set('duration')(k)} />)}</ChipRow>
      </Card>

      <Card>
        <SectionTitle icon="gift-outline">Worker Perks & Inclusions</SectionTitle>
        {PERKS.map((p) => {
          const on = f.perks.includes(p.key);
          return (
            <TouchableOpacity key={p.key} onPress={() => toggleIn('perks', p.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Ionicons name={p.icon} size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{p.label}</Text>{'\n'}<Text style={{ color: colors.muted, fontSize: 12 }}>{p.sub}</Text></Text>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.primary : colors.muted} />
            </TouchableOpacity>
          );
        })}
      </Card>

      <Card tone="blue">
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', flex: 1 }}>Verified Employers Only</Text>
          <Switch value={f.verified} onValueChange={set('verified')} trackColor={{ true: colors.primary }} />
        </Row>
        <Muted>Only show contractors with a verified business registration.</Muted>
      </Card>

      <Card>
        <SectionTitle icon="notifications-outline">Can't find your exact match?</SectionTitle>
        <Muted>Save these filters as an SMS alert and be first to know when a matching job is posted.</Muted>
        <Row style={{ marginTop: 10 }}>
          <Button title="Save as Job Alert" icon="notifications-outline" variant="soft" small onPress={saveAlert} style={{ marginRight: 8 }} />
          <Button title="My Alerts" variant="outline" small onPress={() => router.push('/Alerts')} />
        </Row>
      </Card>
    </Screen>
  );
}
