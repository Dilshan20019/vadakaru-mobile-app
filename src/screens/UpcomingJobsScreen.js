// Prototype screen: Upcoming Jobs (date strip, locked shifts, gate pass, site prep checklist)
// Employer: manage upcoming shifts + drafts. Worker: my upcoming shifts + open shifts to apply for.
import React, { useState } from 'react';
import { View, Text, Alert, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Avatar, Field, Empty, Stat, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

const when = (d) => {
  if (!d) return 'DATE TBA';
  const diff = Math.round((new Date(d + 'T00:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 864e5);
  return diff === 0 ? 'STARTS TODAY' : diff === 1 ? 'STARTS TOMORROW' : diff < 0 ? 'STARTED' : `STARTS ${d}`;
};
const maps = (j) => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.location || '')}`);
const gatePass = (j) => Alert.alert('Site Gate Pass', `Shift code: ${j.shiftCode || 'Pending'}\nSite: ${j.location}\nEntry: ${j.gate || 'Main gate'}\nTime: ${j.startTime}–${j.endTime}\n\nShow this code to the supervisor at the gate.`);

export default function UpcomingJobsScreen({ navigation }) {
  const { user } = useAuth();
  const emp = user.role === 'employer';
  const [date, setDate] = useState('all');
  const [item, setItem] = useState('');
  const { data, loading, error, reload } = useLoad(async () => {
    if (emp) {
      const [jobs, drafts] = await Promise.all([api.get('/jobs?status=published,in_progress'), api.get('/jobs?status=draft')]);
      return { jobs, drafts };
    }
    const [jobs, open] = await Promise.all([api.get('/jobs?mine=1&status=published,in_progress'), api.get('/jobs')]);
    return { jobs, open };
  });

  const jobs = data?.jobs || [];
  const dates = [...new Set(jobs.map((j) => j.startDate).filter(Boolean))].sort();
  const list = jobs.filter((j) => date === 'all' || j.startDate === date);
  const first = list[0];

  const toggle = (j, p) => run(async () => { await api.put(`/jobs/${j._id}/prep/${p._id}`, { done: !p.done }); reload(); });
  const delItem = (j, p) => run(async () => { await api.del(`/jobs/${j._id}/prep/${p._id}`); reload(); });
  const addItem = () => run(async () => { await api.post(`/jobs/${first._id}/prep`, { label: item }); setItem(''); reload(); });
  const publish = (j) => run(async () => { await api.post(`/jobs/${j._id}/publish`); reload(); }, 'Cannot publish');
  const delDraft = (j) => confirm('Delete draft?', j.title, 'Delete', () => run(async () => { await api.del(`/jobs/${j._id}`); reload(); }));
  const apply = (j) => run(async () => { await api.post(`/jobs/${j._id}/apply`); Alert.alert('Applied', 'The employer will review your application.'); reload(); }, 'Cannot apply');
  const arrive = (j, me) => run(async () => { await api.post(`/jobs/${j._id}/checkin`, { value: !me.checkedIn }); reload(); }, 'Check-in failed');

  return (
    <Screen title="Upcoming Jobs" loading={loading} error={error} onRefresh={reload} noBack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="All" active={date === 'all'} onPress={() => setDate('all')} />
        {dates.map((d) => <Chip key={d} label={d.slice(5)} active={date === d} onPress={() => setDate(d)} />)}
      </ScrollView>
      <Row style={{ gap: 10, marginBottom: 12 }}>
        <Stat value={list.length} label="Locked Shifts" icon="lock-closed" />
        <Stat value={list.reduce((n, j) => n + j.roster.length, 0)} label="Confirmed Crew" icon="people" color={C.green} />
        {emp && <Stat value={money(list.reduce((n, j) => n + j.escrowLocked, 0))} label="Escrow Locked" icon="wallet" color={C.amber} />}
      </Row>

      {list.length ? list.map((j) => {
        const me = !emp ? j.roster.find((r) => r.worker._id === user._id) : null;
        return (
          <Card key={j._id}>
            <Badge text={when(j.startDate)} color={C.amber} bg={C.amberBg} />
            <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 6 }}>{j.title}</Text>
            <Muted>{j.location} • {money(j.dailyWage)}/day • {j.startTime}–{j.endTime}</Muted>
            <Muted style={{ marginTop: 6 }}>Confirmed crew ({j.roster.length}/{j.workersNeeded})</Muted>
            {j.roster.map((r) => <Row key={r.worker._id} style={{ marginTop: 4 }}><Avatar name={r.worker.name} size={26} /><Text style={{ marginLeft: 8, fontWeight: '600' }}>{r.worker.name}</Text></Row>)}
            <Row style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Btn small title="View Site Gate Pass & QR" variant="amber" icon="qr-code" onPress={() => gatePass(j)} />
              <Btn small title="Map & Directions" variant="soft" icon="map" onPress={() => maps(j)} />
              {emp && (j.roster.length ? <Btn small title="Manage Crew" variant="soft" onPress={() => navigation.navigate('RollCall', { jobId: j._id })} />
                : null)}
              {emp && j.roster.length < j.workersNeeded && <Btn small title={`Review Matching ${j.category} Workers`} onPress={() => navigation.navigate('Applicants', { jobId: j._id })} />}
              {emp && <Btn small title="Edit" variant="soft" onPress={() => navigation.navigate('JobForm', { job: j })} />}
              {me && <Btn small title={me.checkedIn ? 'Checked in ✓' : 'I Have Arrived'} variant={me.checkedIn ? 'green' : 'primary'} onPress={() => arrive(j, me)} />}
              {me && <Btn small title="Safety" variant="soft" onPress={() => navigation.navigate('SafetyCenter', { jobId: j._id })} />}
              {me && <Btn small title="Chat" variant="soft" onPress={() => navigation.navigate('Chat', { userId: j.employer._id, jobId: j._id })} />}
            </Row>
          </Card>
        );
      }) : <Empty icon="calendar-outline" text={emp ? 'No upcoming shifts. Post a new shift to get started.' : 'No upcoming shifts yet. Apply to an open shift below.'} />}

      {emp && first && (<>
        <H>Site Prep Checklist — {first.title}</H>
        <Card>
          {first.prep.map((p) => (
            <Row key={p._id} style={{ paddingVertical: 6 }}>
              <TouchableOpacity onPress={() => toggle(first, p)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name={p.done ? 'checkbox' : 'square-outline'} size={22} color={p.done ? C.green : C.muted} /><Text style={{ marginLeft: 8, flex: 1, textDecorationLine: p.done ? 'line-through' : 'none' }}>{p.label}</Text>
              </TouchableOpacity>
              <Text onPress={() => delItem(first, p)} style={{ color: C.danger, fontWeight: '800' }}>✕</Text>
            </Row>))}
          <Row style={{ gap: 8, marginTop: 6 }}><View style={{ flex: 1 }}><Field placeholder="Add checklist item" value={item} onChangeText={setItem} /></View><Btn small title="Add" disabled={!item.trim()} onPress={addItem} /></Row>
        </Card>
      </>)}

      {emp && (<>
        <H>Drafts ({data.drafts.length})</H>
        {data.drafts.length ? data.drafts.map((j) => (
          <Card key={j._id}><Text style={{ fontWeight: '800' }}>{j.title}</Text><Muted>{j.location || 'No location yet'} • {money(j.dailyWage)}/day</Muted>
            <Row style={{ gap: 8 }}><Btn small title="Publish" variant="amber" onPress={() => publish(j)} style={{ flex: 1 }} /><Btn small title="Edit" variant="soft" onPress={() => navigation.navigate('JobForm', { job: j })} style={{ flex: 1 }} /><Btn small title="Delete" variant="danger" onPress={() => delDraft(j)} style={{ flex: 1 }} /></Row></Card>
        )) : <Muted>No drafts.</Muted>}
        <Btn title="Post New Shift" icon="add-circle" onPress={() => navigation.navigate('JobForm')} />
      </>)}

      {!emp && (<>
        <H>Open Shifts to Apply</H>
        {data.open.filter((j) => !j.roster.some((r) => r.worker._id === user._id)).map((j) => (
          <Card key={j._id}><Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', flex: 1 }}>{j.title}</Text><Text style={{ fontWeight: '800', color: C.primary }}>{money(j.dailyWage)}</Text></Row><Muted>{j.location} • {j.roster.length}/{j.workersNeeded} filled</Muted>
            <Btn small title="Apply" onPress={() => apply(j)} /></Card>
        ))}
      </>)}
    </Screen>
  );
}
