// Prototype screen: Roll Call (live crew roster, check-in, PPE, daily wage escrow preview)
import React, { useEffect, useState } from 'react';
import { View, Text, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Badge, Avatar, Empty, PickerModal, useLoad, money, timeStr, run, confirm } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function RollCallScreen({ navigation, route }) {
  const [jobId, setJobId] = useState(route.params?.jobId || null);
  const [pick, setPick] = useState(null); // 'job' | 'scan'
  useEffect(() => { if (route.params?.jobId) setJobId(route.params.jobId); }, [route.params?.jobId]);
  const { data: jobs, loading, error, reload } = useLoad(() => api.get('/jobs?status=in_progress'));
  const job = (jobs || []).find((j) => j._id === jobId) || (jobs || [])[0];

  const checkin = (e, value) => run(async () => { await api.post(`/jobs/${job._id}/checkin`, { workerId: e.worker._id, value }); reload(); });
  const absent = (e) => run(async () => { await api.put(`/jobs/${job._id}/roster/${e.worker._id}`, { absent: !e.absent }); reload(); });
  const ppe = (p) => run(async () => { await api.put(`/jobs/${job._id}/ppe/${p.key}`, { checked: !p.checked }); reload(); });
  const remove = (e) => confirm('Remove from shift?', `${e.worker.name}'s escrow returns to your vault.`, 'Remove', () => run(async () => { await api.del(`/jobs/${job._id}/roster/${e.worker._id}`); reload(); }));

  const inCount = job ? job.roster.filter((r) => r.checkedIn).length : 0;
  const ppeDone = job ? job.ppe.filter((p) => p.checked).length : 0;
  const total = job ? job.roster.reduce((n, r) => n + r.payout.total, 0) : 0;

  return (
    <Screen title="Roll Call" loading={loading} error={error} onRefresh={reload} noBack>
      {!job ? <Card><Empty icon="people-outline" text="No active shift with hired workers yet. Hire from Applicants." /><Btn title="Go to Applicants" onPress={() => navigation.navigate('Applicants')} /></Card> : (<>
        <TouchableOpacity onPress={() => setPick('job')}>
          <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
            <Row style={{ justifyContent: 'space-between' }}><Badge text="● LIVE ROLL CALL" color="#fff" bg="rgba(255,255,255,0.2)" /><Ionicons name="chevron-down" size={18} color="#fff" /></Row>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 6 }}>{job.title}</Text>
            <Text style={{ color: '#DDE6FF' }}>{job.location}</Text>
            <Text style={{ color: '#fff', fontWeight: '800', marginTop: 6 }}>{inCount}/{job.roster.length} workers verified • {job.workersNeeded} needed</Text>
          </Card>
        </TouchableOpacity>
        <Row style={{ gap: 8 }}>
          <Btn title="Scan Worker QR" icon="qr-code" variant="amber" onPress={() => setPick('scan')} style={{ flex: 1 }} />
          <Btn title="Safety Center" icon="shield-checkmark" variant="soft" onPress={() => navigation.navigate('SafetyCenter', { jobId: job._id })} style={{ flex: 1 }} />
        </Row>

        <H style={{ marginTop: 10 }}>Crew Roster</H>
        {job.roster.map((e) => (
          <Card key={e.worker._id}>
            <Row>
              <Avatar name={e.worker.name} size={44} bg={e.absent ? C.danger : C.green} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: '800', fontSize: 15 }}>{e.worker.name}</Text><Muted>{e.worker.trade} • ★ {e.worker.rating}</Muted>
                <Badge text={e.absent ? 'ABSENT' : e.checkedIn ? `CHECKED IN ${timeStr(e.checkInTime)}` : 'EN ROUTE'} color={e.absent ? C.danger : e.checkedIn ? C.green : C.amber} bg={e.absent ? C.dangerBg : e.checkedIn ? C.greenBg : C.amberBg} />
              </View>
              <Text style={{ fontWeight: '800', color: C.primary }}>{money(job.dailyWage)}</Text>
            </Row>
            <Row style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Btn small title="📞 Call" variant="soft" onPress={() => Linking.openURL(`tel:${(e.worker.phone || '').replace(/\s/g, '')}`)} />
              <Btn small title={e.checkedIn ? 'Check out' : 'Check in'} variant={e.checkedIn ? 'green' : 'soft'} disabled={e.absent} onPress={() => checkin(e, !e.checkedIn)} />
              <Btn small title={e.absent ? 'Undo absent' : 'Mark absent'} variant="soft" onPress={() => absent(e)} />
              {e.absent && <Btn small title="Instant Replace" variant="amber" onPress={() => remove(e) } />}
              <Btn small title="Edit shift" variant="soft" onPress={() => navigation.navigate('CrewPayouts', { jobId: job._id })} />
            </Row>
          </Card>
        ))}
        {job.roster.length < job.workersNeeded && <Btn title={`Find ${job.workersNeeded - job.roster.length} more worker(s)`} variant="outline" icon="person-add" onPress={() => navigation.navigate('Applicants', { jobId: job._id })} />}

        <H style={{ marginTop: 10 }}>Site Safety & PPE Roll-Call ({ppeDone}/{job.ppe.length} checked)</H>
        <Card>{job.ppe.map((p) => (
          <TouchableOpacity key={p.key} onPress={() => ppe(p)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
            <Ionicons name={p.checked ? 'checkbox' : 'square-outline'} size={22} color={p.checked ? C.green : C.muted} /><Text style={{ marginLeft: 8, flex: 1 }}>{p.label}</Text>
          </TouchableOpacity>))}
        </Card>

        <H>Daily Wage Escrow Preview</H>
        <Card>
          {job.roster.map((e) => <Row key={e.worker._id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Text>{e.worker.name}</Text><Text style={{ fontWeight: '700' }}>{money(e.payout.total)}</Text></Row>)}
          <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.border, paddingTop: 8, marginTop: 4 }}><Text style={{ fontWeight: '800' }}>Total to release</Text><Text style={{ fontWeight: '800', color: C.primary, fontSize: 17 }}>{money(total)}</Text></Row>
          <Btn title="Overtime / Extra Items & Release" onPress={() => navigation.navigate('CrewPayouts', { jobId: job._id })} />
        </Card>
      </>)}

      <PickerModal visible={pick === 'job'} title="Select active shift" items={(jobs || []).map((j) => ({ key: j._id, label: j.title, sub: j.location }))}
        onPick={(it) => { setJobId(it.key); setPick(null); }} onClose={() => setPick(null)} />
      <PickerModal visible={pick === 'scan'} title="Scan Worker QR (select worker)" emptyText="Everyone is already checked in."
        items={(job?.roster || []).filter((e) => !e.checkedIn && !e.absent).map((e) => ({ key: e.worker._id, label: e.worker.name, sub: e.worker.trade, e }))}
        onPick={(it) => { setPick(null); checkin(it.e, true); }} onClose={() => setPick(null)} />
    </Screen>
  );
}
