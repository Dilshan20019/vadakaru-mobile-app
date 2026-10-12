// Prototype screen: Manage Shifts (roster, escrow, check-ins, post new shift)
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, Muted, Row, Btn, Badge, Avatar, Segment, Empty, PickerModal, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function ManageShiftsScreen({ navigation }) {
  const { data, loading, error, reload } = useLoad(() => api.get('/jobs?status=published,in_progress,completed'));
  const [tab, setTab] = useState('in_progress');
  const [assign, setAssign] = useState(null); // { job, items }
  const jobs = data || [];
  const list = jobs.filter((j) => j.status === tab && !j.paid);
  const count = (s) => jobs.filter((j) => j.status === s && !j.paid).length;
  const awaiting = jobs.filter((j) => ['published', 'in_progress'].includes(j.status)).reduce((n, j) => n + Math.max(0, j.workersNeeded - j.roster.length), 0);
  const escrow = jobs.filter((j) => !j.paid).reduce((n, j) => n + (j.escrowLocked || 0), 0);

  const toggle = (j, r) => run(async () => { await api.post(`/jobs/${j._id}/checkin`, { workerId: r.worker._id, value: !r.checkedIn }); reload(); });
  const removeW = (j, r) => confirm('Remove from roster?', r.worker.name, 'Remove', () => run(async () => { await api.del(`/jobs/${j._id}/roster/${r.worker._id}`); reload(); }));
  const openAssign = (j) => run(async () => {
    const apps = await api.get(`/jobs/${j._id}/applications`);
    const onRoster = j.roster.map((r) => r.worker._id);
    setAssign({ job: j, items: apps.filter((a) => a.status !== 'rejected' && !onRoster.includes(a.worker._id)).map((a) => ({ key: a.worker._id, label: a.worker.name, sub: `${a.worker.trade} • ★ ${a.worker.rating} • ${money(a.worker.dailyRate)}/day` })) });
  });
  const pick = (item) => run(async () => { await api.post(`/jobs/${assign.job._id}/roster`, { workerId: item.key }); setAssign(null); reload(); }, 'Cannot assign');

  return (
    <Screen title="Manage Shifts" loading={loading} error={error} onRefresh={reload} noBack>
      <Row style={{ gap: 10, marginBottom: 10 }}>
        <Card style={{ flex: 1, marginBottom: 0 }}><Text style={{ fontSize: 22, fontWeight: '800' }}>{count('in_progress') + count('published')}</Text><Muted>Shifts</Muted></Card>
        <Card style={{ flex: 1, marginBottom: 0 }}><Text style={{ fontSize: 22, fontWeight: '800' }}>{awaiting}</Text><Muted>Craftsmen awaiting</Muted></Card>
      </Row>
      <Card style={{ backgroundColor: C.amberBg }}><Row><Text style={{ fontSize: 22 }}>🔒</Text><View style={{ marginLeft: 10 }}><Text style={{ fontWeight: '800' }}>Escrow vault secured</Text><Text style={{ fontWeight: '800', color: C.primary }}>LKR {Math.round(escrow).toLocaleString('en-US')}</Text></View></Row></Card>

      <Segment value={tab} onChange={setTab} options={[{ key: 'in_progress', label: `Active ${count('in_progress')}` }, { key: 'published', label: `Scheduled ${count('published')}` }, { key: 'completed', label: `Completed ${count('completed')}` }]} />

      {list.length ? list.map((j) => (
        <Card key={j._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge text={`Gate #${(j.gate || '1').replace(/\D/g, '') || '1'} • ${j.shiftCode || 'No ID'}`} color={C.primary} bg={C.blueBg} />
            <Text style={{ fontWeight: '800', fontSize: 17, color: C.primary }}>{money(j.dailyWage)}</Text>
          </Row>
          <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 6 }}>{j.title}</Text>
          <Muted>{j.location} • {j.startTime}–{j.endTime}</Muted>

          <Text style={{ fontWeight: '800', marginTop: 10 }}>Site Roster ({j.roster.filter((r) => r.checkedIn).length}/{j.workersNeeded} checked in)</Text>
          {j.roster.map((r) => (
            <Row key={r.worker._id} style={{ marginTop: 8 }}>
              <Avatar name={r.worker.name} size={30} />
              <View style={{ flex: 1, marginLeft: 8 }}><Text style={{ fontWeight: '700' }}>{r.worker.name}</Text><Muted>{r.worker.trade}</Muted></View>
              {j.status === 'in_progress' && <Btn small title={r.checkedIn ? 'Checked in' : 'Check in'} variant={r.checkedIn ? 'green' : 'soft'} onPress={() => toggle(j, r)} />}
              {j.status !== 'completed' && <Text onPress={() => removeW(j, r)} style={{ color: C.danger, marginLeft: 10, fontWeight: '800' }}>✕</Text>}
            </Row>
          ))}
          {j.roster.length < j.workersNeeded && j.status !== 'completed' && (
            <Btn small title={`Assign (${j.workersNeeded - j.roster.length} spot${j.workersNeeded - j.roster.length > 1 ? 's' : ''} open)`} variant="outline" icon="person-add" onPress={() => openAssign(j)} />
          )}
          <Row style={{ gap: 8 }}>
            <Btn small title="Worksite" variant="soft" icon="location" onPress={() => navigation.navigate('WorksiteLocation', { id: j._id })} style={{ flex: 1 }} />
            <Btn small title="Details" variant="soft" icon="document-text" onPress={() => navigation.navigate('JobDetails', { id: j._id })} style={{ flex: 1 }} />
          </Row>
          {j.status === 'in_progress' && <Btn title="Approve Shift Completion" variant="primary" onPress={() => navigation.navigate('JobCompleted', { id: j._id })} />}
          {j.status === 'completed' && <Btn title="Review & Release Escrow Payout" variant="amber" onPress={() => navigation.navigate('ReviewShift', { id: j._id })} />}
        </Card>
      )) : <Empty text={`No ${tab === 'in_progress' ? 'active' : tab === 'published' ? 'scheduled' : 'completed'} shifts`} />}

      <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Shift Operations Hub</Text>
        <Btn title="Post New Daily Shift" variant="amber" icon="add-circle" onPress={() => navigation.navigate('JobForm')} />
        <Btn title="Saved Drafts" variant="outline" onPress={() => navigation.navigate('DraftJobs')} />
      </Card>

      <PickerModal visible={!!assign} title="Assign a craftsman" items={assign?.items || []} onPick={pick} onClose={() => setAssign(null)} emptyText="No applicants available. Craftsmen who apply will appear here." />
    </Screen>
  );
}
