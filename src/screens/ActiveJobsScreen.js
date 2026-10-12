// Prototype screen: Active Jobs
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Screen, Card, Muted, Row, Btn, Chip, Badge, Avatar, Empty, useLoad, money } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function ActiveJobsScreen({ navigation }) {
  const { data, loading, error, reload } = useLoad(() => api.get('/jobs?status=published,in_progress'));
  const [cat, setCat] = useState('All');
  const cats = ['All', ...new Set((data || []).map((j) => j.category))];
  const list = (data || []).filter((j) => cat === 'All' || j.category === cat);
  const workers = list.reduce((n, j) => n + j.roster.length, 0);
  const locked = list.reduce((n, j) => n + (j.escrowLocked || 0), 0);

  return (
    <Screen title="Active Jobs" loading={loading} error={error} onRefresh={reload} noBack>
      <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{list.length} Jobs Active Now</Text>
          <Badge text="LIVE OPERATIONS" color="#fff" bg="rgba(255,255,255,0.2)" />
        </Row>
        <Row style={{ marginTop: 10, gap: 20 }}>
          <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Workers</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{workers} on duty</Text></View>
          <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Escrow Locked</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{money(locked)}</Text></View>
        </Row>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>{cats.map((c) => <Chip key={c} label={c === 'All' ? 'All Active' : c} active={cat === c} onPress={() => setCat(c)} />)}</ScrollView>

      {list.length ? list.map((j) => {
        const inn = j.roster.filter((r) => r.checkedIn).length;
        return (
          <Card key={j._id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge text={j.status === 'published' ? 'OPEN' : 'IN PROGRESS'} color={j.status === 'published' ? C.primary : C.amber} bg={j.status === 'published' ? C.blueBg : C.amberBg} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.primary }}>{money(j.dailyWage)}<Muted> /day</Muted></Text>
            </Row>
            <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 6 }}>{j.title}</Text>
            <Muted>{j.location} • {j.startTime} - {j.endTime}</Muted>
            <Card style={{ backgroundColor: C.bg, marginTop: 8, marginBottom: 6 }}>
              <Muted>On-site crew ({inn}/{j.roster.length} checked in)</Muted>
              {j.roster.length ? j.roster.map((r) => (
                <Row key={r.worker._id} style={{ marginTop: 6 }}>
                  <Avatar name={r.worker.name} size={28} />
                  <Text style={{ flex: 1, marginLeft: 8, fontWeight: '600' }}>{r.worker.name}</Text>
                  <Badge text={r.checkedIn ? 'ON SITE' : 'PENDING'} color={r.checkedIn ? C.green : C.muted} bg={r.checkedIn ? C.greenBg : '#E5E7EB'} />
                </Row>
              )) : <Muted style={{ marginTop: 4 }}>No workers assigned yet</Muted>}
            </Card>
            <Btn title="Manage Shift & Tasks" variant="amber" onPress={() => navigation.navigate('Shifts')} />
            {j.status === 'in_progress' && <Btn title="Review Punch-out & Release Wages" onPress={() => navigation.navigate('JobCompleted', { id: j._id })} />}
            <Btn title="View Site Geofence Map" variant="soft" icon="map-outline" onPress={() => navigation.navigate('WorksiteLocation', { id: j._id })} />
          </Card>
        );
      }) : <Empty text="No active jobs in this category" />}

      <Btn title="Open Job History & Ledger" icon="receipt-outline" variant="outline" onPress={() => navigation.navigate('JobHistory')} />
      <Btn title="Browse Job Categories" icon="grid-outline" variant="soft" onPress={() => navigation.navigate('JobCategories')} />
    </Screen>
  );
}
