// Prototype screen: Job Completed? (handover checklist, mark completed, report issue)
import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Badge, Avatar, Field, useLoad, money, run } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function JobCompletedScreen({ route, navigation }) {
  const { id } = route.params;
  const { data: j, loading, error, reload } = useLoad(() => api.get(`/jobs/${id}`), [id]);
  const [chk, setChk] = useState({ siteWork: false, tools: false, payment: true });
  const [issue, setIssue] = useState('');
  const [showIssue, setShowIssue] = useState(false);
  const [busy, setBusy] = useState(false);

  const complete = async () => {
    setBusy(true);
    const ok = await run(async () => { await api.post(`/jobs/${id}/complete`, chk); return true; }, 'Cannot complete job');
    setBusy(false);
    if (ok) navigation.replace('ReviewShift', { id });
  };
  const report = () => run(async () => { await api.post(`/jobs/${id}/issue`, { text: issue }); setIssue(''); setShowIssue(false); reload(); });

  const items = [
    ['siteWork', 'Site work verified', 'Quality inspected & approved', 'construct'],
    ['tools', 'Tools returned', 'Trowels & level gear intact', 'hammer'],
    ['payment', 'Payment from escrow', 'Instant transfer to worker account', 'wallet'],
  ];
  const total = j ? (j.dailyWage + (j.travelAllowance || 0)) * j.durationDays * Math.max(1, j.roster.length) : 0;

  return (
    <Screen title="Job Completed?" loading={loading} error={error} onRefresh={reload}>
      {j && (<>
        <Card>
          <Badge text={j.category} color={C.primary} bg={C.blueBg} />
          <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 6 }}>{j.title}</Text>
          <Muted>{j.location}</Muted>
          <Row style={{ gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 8 }}>
              <Muted>WORKER{j.roster.length > 1 ? 'S' : ''}</Muted>
              {j.roster.length ? j.roster.map((r) => <Row key={r.worker._id} style={{ marginTop: 4 }}><Avatar name={r.worker.name} size={22} /><Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{r.worker.name}</Text></Row>) : <Muted>None assigned</Muted>}
            </View>
            <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 8 }}><Muted>EMPLOYER</Muted><Text style={{ fontWeight: '700', marginTop: 4 }}>{j.employer.businessName}</Text><Badge text="Verified" icon="checkmark" /></View>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}><Muted>Duration: {j.durationDays} day(s)</Muted><Muted>Start: {j.startDate || '-'}</Muted></Row>
          <Card style={{ backgroundColor: C.blueBg, marginTop: 10, marginBottom: 0 }}>
            <Muted>Total Payment</Muted>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary }}>LKR {total.toLocaleString('en-US')}</Text>
            <Muted>{money(j.dailyWage)} / day × {j.durationDays} × {Math.max(1, j.roster.length)} • Escrow secured</Muted>
          </Card>
        </Card>

        <H>Handover Verification Checklist</H>
        <Card>
          {items.map(([k, t, sub, icon]) => (
            <Row key={k} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border }}>
              <Ionicons name={icon} size={20} color={C.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}><Text style={{ fontWeight: '700' }}>{t}</Text><Muted>{sub}</Muted></View>
              <Switch value={chk[k]} onValueChange={(v) => setChk((p) => ({ ...p, [k]: v }))} disabled={j.status === 'completed'} trackColor={{ true: C.green }} />
            </Row>
          ))}
        </Card>

        {j.status === 'completed' ? <Badge text="ALREADY MARKED COMPLETED" /> : (
          <Btn title="Mark as Completed" icon="checkmark-circle" variant="green" onPress={complete} loading={busy} />
        )}
        <Btn title={showIssue ? 'Cancel' : 'Report an Issue'} variant="danger" icon="flag" onPress={() => setShowIssue(!showIssue)} />
        {showIssue && (<View style={{ marginTop: 8 }}><Field multiline placeholder="Describe the issue..." value={issue} onChangeText={setIssue} /><Btn title="Submit Issue" onPress={report} disabled={!issue.trim()} /></View>)}
        {j.issues?.length > 0 && (<><H style={{ marginTop: 10 }}>Reported Issues</H>{j.issues.map((i) => <Card key={i._id}><Text>{i.text}</Text><Muted>{new Date(i.at).toLocaleString()}</Muted></Card>)}</>)}
        <Muted style={{ textAlign: 'center', marginTop: 12 }}>🛡 Vedakaru dispute assistance is available if needed.</Muted>
      </>)}
    </Screen>
  );
}
