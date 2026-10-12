// Prototype screen: Jobs (completed projects / verified payout ledger)
import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, Stat, Segment, Empty, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function JobHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('paid');
  const { data, loading, error, reload } = useLoad(() => api.get('/jobs?status=completed'));
  const all = data || [];
  const paid = all.filter((j) => j.paid);
  const unpaid = all.filter((j) => !j.paid);
  const ledger = paid.reduce((n, j) => n + (j.dailyWage + (j.travelAllowance || 0)) * j.durationDays * j.roster.length, 0);
  const list = tab === 'paid' ? paid : unpaid;

  const receipt = (j) => {
    const each = (j.dailyWage + (j.travelAllowance || 0)) * j.durationDays;
    Alert.alert('Receipt', `${j.title}\n${j.roster.length} worker(s) × ${money(each)}\nTotal: ${money(each * j.roster.length)}\nStatus: ${j.paid ? 'Paid from escrow' : 'Awaiting release'}`);
  };
  const rehire = (j) => run(async () => { await api.post(`/jobs/${j._id}/rehire`); Alert.alert('Draft created', 'A new draft with the same specs is in Saved Drafts.'); });
  const remove = (j) => confirm('Remove from history?', j.title, 'Remove', () => run(async () => { await api.del(`/jobs/${j._id}`); reload(); }));

  return (
    <Screen title="Jobs" loading={loading} error={error} onRefresh={reload}>
      <Card style={{ backgroundColor: C.navy, borderColor: C.navy }}>
        <Text style={{ color: '#BFD0FF', fontSize: 11, fontWeight: '800' }}>VERIFIED PAYOUT LEDGER</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>LKR {Math.round(ledger).toLocaleString('en-US')}</Text>
        <Text style={{ color: '#BFD0FF' }}>{user.businessName}</Text>
      </Card>
      <Row style={{ gap: 10, marginBottom: 14 }}>
        <Stat value={paid.length} label="Paid Projects" icon="checkmark-done" color={C.green} />
        <Stat value={unpaid.length} label="Awaiting Release" icon="time" color={C.amber} />
        <Stat value={user.creditScore ?? '-'} label="Trust Score" icon="shield-checkmark" />
      </Row>
      <Segment value={tab} onChange={setTab} options={[{ key: 'paid', label: `Completed (${paid.length})` }, { key: 'unpaid', label: `Awaiting Payment (${unpaid.length})` }]} />

      {list.length ? list.map((j) => (
        <Card key={j._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge text={j.category} color={C.primary} bg={C.blueBg} />
            <Text style={{ fontWeight: '800', color: C.primary }}>{money((j.dailyWage + (j.travelAllowance || 0)) * j.durationDays * j.roster.length)}</Text>
          </Row>
          <Text style={{ fontWeight: '800', fontSize: 15, marginTop: 6 }}>{j.title}</Text>
          <Muted>{j.location} • {j.roster.length} crew • {j.durationDays} day(s)</Muted>
          <Row style={{ gap: 6, marginTop: 8 }}>
            {j.paid ? <Btn small title="Re-hire Crew" variant="soft" onPress={() => rehire(j)} style={{ flex: 1 }} />
              : <Btn small title="Release" variant="amber" onPress={() => navigation.navigate('ReviewShift', { id: j._id })} style={{ flex: 1 }} />}
            <Btn small title="Receipt" variant="soft" onPress={() => receipt(j)} style={{ flex: 1 }} />
            <Btn small title="Edit Rating" variant="soft" onPress={() => navigation.navigate('ReviewShift', { id: j._id })} style={{ flex: 1 }} />
          </Row>
          <Text onPress={() => remove(j)} style={{ color: C.danger, fontWeight: '700', marginTop: 10, textAlign: 'right' }}>Remove</Text>
        </Card>
      )) : <Empty text="Nothing here yet" />}
    </Screen>
  );
}
