import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Button, Chip, ChipRow, Stepper, Row, Muted, money } from '../components/ui';
import { useWorkerFilters, DEFAULT_WORKER_FILTERS } from '../context/WorkerFilterContext';
import { TRADES } from '../constants';
import { colors } from '../theme';

const RATINGS = [[0, 'Any'], [3, '3.0+'], [4, '4.0+'], [4.5, '4.5+']];

export default function WorkerFiltersScreen() {
  const router = useRouter();
  const { filters, setFilters } = useWorkerFilters();
  const [f, setF] = useState(filters);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleSkill = (t) => set('skills', f.skills.includes(t) ? f.skills.filter((x) => x !== t) : [...f.skills, t]);

  const apply = () => {
    setFilters(f);
    router.back();
  };
  const reset = () => setF(DEFAULT_WORKER_FILTERS);

  return (
    <Screen
      footer={
        <Row>
          <Button title="Reset" variant="outline" onPress={reset} style={{ flex: 1, marginRight: 8 }} />
          <Button title="Show Workers" onPress={apply} style={{ flex: 2 }} />
        </Row>
      }
    >
      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 8 }}>Skill Category</Text>
        <ChipRow>{TRADES.map((t) => <Chip key={t} label={t} selected={f.skills.includes(t)} onPress={() => toggleSkill(t)} />)}</ChipRow>
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 8 }}>Distance (from your job site)</Text>
        <Stepper value={f.maxDistance || 0} onChange={(v) => set('maxDistance', v || null)} step={5} min={0} max={100} format={(v) => (v ? `${v} km` : 'Any')} />
        <Text style={{ fontWeight: '800', marginTop: 14, marginBottom: 8 }}>Minimum Experience</Text>
        <Stepper value={f.minExp} onChange={(v) => set('minExp', v)} step={1} min={0} max={30} suffix=" yrs" />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '800' }}>Available Today</Text><Muted>Only workers who marked themselves free</Muted></View>
          <Switch value={f.availableToday} onValueChange={(v) => set('availableToday', v)} trackColor={{ true: colors.primary }} />
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '800' }}>Verified Workers</Text><Muted>NIC verified only</Muted></View>
          <Switch value={f.verified} onValueChange={(v) => set('verified', v)} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 8 }}>Minimum Rating</Text>
        <ChipRow>{RATINGS.map(([v, l]) => <Chip key={l} label={`${l}${v ? ' ★' : ''}`} selected={f.minRating === v} onPress={() => set('minRating', v)} />)}</ChipRow>
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 8 }}>Daily Wage Range</Text>
        <Muted style={{ marginBottom: 4 }}>Minimum</Muted>
        <Stepper value={f.minWage || 0} onChange={(v) => set('minWage', v || null)} step={250} min={0} max={20000} format={(v) => (v ? money(v) : 'Any')} />
        <Muted style={{ marginTop: 10, marginBottom: 4 }}>Maximum</Muted>
        <Stepper value={f.maxWage || 0} onChange={(v) => set('maxWage', v || null)} step={250} min={0} max={20000} format={(v) => (v ? money(v) : 'Any')} />
      </Card>
    </Screen>
  );
}
