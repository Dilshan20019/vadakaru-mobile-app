// Prototype screen: Escrow Dispute (category, ledger audit, evidence pack, resolution roadmap)
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Field, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { DISPUTE_CATEGORIES } from '../constants';
import { C } from '../theme';

export default function EscrowDisputeScreen({ route, navigation }) {
  const { jobId, paymentId } = route.params;
  const { user } = useAuth();
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const [job, disputes, pay] = await Promise.all([api.get(`/jobs/${jobId}`), api.get(`/disputes?job=${jobId}`), paymentId ? api.get(`/payments/${paymentId}`) : null]);
    return { job, pay, mine: disputes.find((d) => d.raisedBy?._id === user._id && d.status !== 'resolved') };
  }, [jobId, paymentId]);
  const { job, pay, mine } = data || {};
  useEffect(() => { if (mine) { setCat(mine.category); setDesc(mine.description); } }, [mine?._id]);

  const other = job && (user.role === 'employer' ? job.roster[0]?.worker : job.employer);
  const amount = pay?.amount || job?.escrowLocked || 0;
  const submit = () => run(async () => { setBusy(true); await api.post('/disputes', { jobId, paymentId, category: cat, description: desc, amount }); reload(); }, 'Cannot submit').finally(() => setBusy(false));
  const update = () => run(async () => { await api.put(`/disputes/${mine._id}`, { category: cat, description: desc }); reload(); });
  const escalate = () => run(async () => { await api.put(`/disputes/${mine._id}`, { status: 'under_review' }); reload(); });
  const withdraw = () => confirm('Withdraw dispute?', 'The escrow will be unfrozen.', 'Withdraw', () => run(async () => { await api.del(`/disputes/${mine._id}`); setDesc(''); setCat(''); reload(); }));

  const steps = [['Dispute submitted', !!mine], ['Escrow frozen', !!job?.escrowFrozen], ['Vedakaru review (24h)', mine?.status === 'under_review'], ['Resolution & release', mine?.status === 'resolved']];

  return (
    <Screen title="Escrow Dispute" loading={loading} error={error} onRefresh={reload}>
      {job && (<>
        <Card style={{ backgroundColor: job.escrowFrozen ? C.dangerBg : C.amberBg }}>
          <Badge text={job.escrowFrozen ? 'ESCROW FROZEN' : 'ESCROW ACTIVE'} color={job.escrowFrozen ? C.danger : C.amber} bg="#fff" />
          <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 6 }}>{job.title}</Text>
          <Muted>Amount in question</Muted><Text style={{ fontSize: 24, fontWeight: '800', color: C.primary }}>{money(amount)}</Text>
        </Card>

        <H>Primary dispute category</H>
        <Row style={{ flexWrap: 'wrap' }}>{DISPUTE_CATEGORIES.map((c) => <Chip key={c} label={c} active={cat === c} onPress={() => !mine || mine.status === 'open' ? setCat(c) : null} />)}</Row>

        <H>Ledger & Timesheet Audit</H>
        <Card>
          {[['Agreed daily wage', money(job.dailyWage)], ['Shift length', `${job.durationDays} day(s)`], ['Crew on roster', job.roster.length], ['Overtime hours logged', job.roster.reduce((n, r) => n + (r.overtimeHours || 0), 0)], ['Escrow currently held', money(job.escrowLocked)]].map(([l, v]) => (
            <Row key={l} style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Muted>{l}</Muted><Text style={{ fontWeight: '800' }}>{v}</Text></Row>))}
        </Card>

        <Field label={`Describe the problem (${desc.length}/500)`} multiline maxLength={500} value={desc} onChangeText={setDesc} placeholder="What happened? Include dates, amounts and who was involved." editable={!mine || mine.status === 'open'} />

        <H>Automated Evidence Pack</H>
        <Card>
          {[`${mine?.evidence?.checkins ?? job.roster.filter((r) => r.checkedIn).length} GPS check-in record(s) attached`, `${mine?.evidence?.chats ?? '—'} chat message(s) linked to this job`, 'Digital timesheet and wage ledger attached'].map((t) => <Text key={t} style={{ paddingVertical: 3 }}>✔ {t}</Text>)}
        </Card>

        <H>Resolution Roadmap</H>
        <Card>{steps.map(([t, done], i) => <Row key={t} style={{ paddingVertical: 5 }}><Text style={{ fontSize: 16, marginRight: 8 }}>{done ? '🟢' : '⚪'}</Text><Text style={{ fontWeight: done ? '800' : '500' }}>{i + 1}. {t}</Text></Row>)}</Card>

        {!mine ? <Btn title="Submit Dispute & Lock Escrow" icon="lock-closed" variant="danger" loading={busy} disabled={!cat || desc.trim().length < 10} onPress={submit} />
          : (<>
            {mine.status === 'open' && <Btn title="Update Dispute" variant="soft" onPress={update} />}
            {mine.status === 'open' && <Btn title="Escalate to Vedakaru Review" variant="primary" onPress={escalate} />}
            <Btn title="Withdraw Dispute" variant="danger" onPress={withdraw} />
          </>)}
        {other && <Btn title={`Message ${other.name || other.businessName} to Resolve Amicably`} variant="outline" icon="chatbubble" onPress={() => navigation.navigate('Chat', { userId: other._id, jobId })} />}
        <Muted style={{ textAlign: 'center', marginTop: 10 }}>Disputes are reviewed within 24 hours. Helpline 1388.</Muted>
      </>)}
    </Screen>
  );
}
