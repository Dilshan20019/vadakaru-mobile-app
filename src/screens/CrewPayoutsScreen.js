// Prototype screen: Crew Work Logs & Payouts (hours, overtime, bonus, ratings, sign-off & release)
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Avatar, Stars, Stepper, SettingRow, useLoad, money, run } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { CREW_TAGS } from '../constants';
import { C } from '../theme';

export default function CrewPayoutsScreen({ route, navigation }) {
  const { user, refresh } = useAuth();
  const { data, loading, error, reload } = useLoad(async () => {
    const jobs = await api.get('/jobs?status=in_progress,completed');
    const job = jobs.find((j) => j._id === route.params?.jobId) || jobs.find((j) => !j.paid && j.roster.length);
    const mine = job ? await api.get(`/reviews?job=${job._id}&mine=1`) : [];
    return { job, mine };
  }, [route.params?.jobId]);

  const [edits, setEdits] = useState({});
  const [stars, setStars] = useState({});
  const [tags, setTags] = useState([]);
  const [autoRelease, setAuto] = useState(user.settings?.autoRelease);
  const [busy, setBusy] = useState(false);
  const job = data?.job;

  useEffect(() => {
    if (!job) return;
    const e = {}, s = {};
    job.roster.forEach((r) => { e[r.worker._id] = { overtimeHours: r.overtimeHours, bonus: r.bonus }; });
    (data.mine || []).forEach((m) => { s[m.target._id] = m.stars; });
    setEdits(e); setStars(s);
    if (data.mine?.[0]?.praise) setTags(data.mine[0].praise);
  }, [data]);

  const calc = (r) => {
    const ed = edits[r.worker._id] || r;
    const ot = r.payout.otRate;
    return r.payout.base + r.payout.travel + (ed.overtimeHours || 0) * ot + (ed.bonus || 0);
  };
  const setE = (id, k, v) => setEdits((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const total = job ? job.roster.reduce((n, r) => n + calc(r), 0) : 0;

  const saveEdits = async () => {
    for (const r of job.roster) {
      const ed = edits[r.worker._id];
      if (ed && (ed.overtimeHours !== r.overtimeHours || ed.bonus !== r.bonus)) await api.put(`/jobs/${job._id}/roster/${r.worker._id}`, ed);
    }
  };
  const saveReviews = async () => {
    for (const r of job.roster) {
      const v = stars[r.worker._id];
      if (!v) continue;
      const ex = (data.mine || []).find((m) => m.target._id === r.worker._id);
      const body = { stars: v, praise: tags };
      ex ? await api.put(`/reviews/${ex._id}`, body) : await api.post('/reviews', { ...body, jobId: job._id, targetId: r.worker._id });
    }
  };
  const save = () => run(async () => { setBusy(true); await saveEdits(); await saveReviews(); setBusy(false); reload(); }, 'Could not save').finally(() => setBusy(false));
  const release = () => run(async () => {
    setBusy(true);
    await saveEdits(); await saveReviews();
    const r = await api.post(`/jobs/${job._id}/release`);
    setBusy(false);
    navigation.navigate('EarningsWallet');
  }, 'Cannot release escrow').finally(() => setBusy(false));
  const toggleAuto = (v) => { setAuto(v); run(async () => { await api.put('/profile/settings', { autoRelease: v }); await refresh(); }); };

  return (
    <Screen title="Crew Payouts" loading={loading} error={error} onRefresh={reload}
      footer={job && !job.paid ? <Row style={{ justifyContent: 'space-between' }}><View><Muted>Total payout</Muted><Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>{money(total)}</Text></View>
        <Btn title="Release Escrow & Sign-Off" variant="amber" icon="checkmark-circle" loading={busy} onPress={release} style={{ flex: 1, marginLeft: 14 }} /></Row> : null}>
      {!job ? <Card><Muted>No shift to sign off yet.</Muted></Card> : (<>
        <Card><Badge text={job.paid ? 'PAID' : job.escrowFrozen ? 'ESCROW FROZEN (DISPUTE)' : 'AWAITING SIGN-OFF'} color={job.escrowFrozen ? C.danger : C.primary} bg={job.escrowFrozen ? C.dangerBg : C.blueBg} />
          <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 6 }}>{job.title}</Text><Muted>{job.location} • {money(job.dailyWage)}/day × {job.durationDays}</Muted></Card>

        <H>Crew Work Logs & Payouts</H>
        {job.roster.map((r) => {
          const ed = edits[r.worker._id] || { overtimeHours: r.overtimeHours, bonus: r.bonus };
          return (
            <Card key={r.worker._id}>
              <Row><Avatar name={r.worker.name} size={42} bg={r.absent ? C.danger : C.green} /><View style={{ flex: 1, marginLeft: 10 }}><Text style={{ fontWeight: '800' }}>{r.worker.name}</Text><Muted>{r.worker.trade}</Muted></View><Text style={{ fontWeight: '800', color: C.primary, fontSize: 16 }}>{money(calc(r))}</Text></Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 8 }}><Muted>Base ({job.durationDays}d){r.absent ? ' — absent' : ''}</Muted><Text>{money(r.payout.base)}</Text></Row>
              <Row style={{ justifyContent: 'space-between' }}><Muted>Travel allowance</Muted><Text>{money(r.payout.travel)}</Text></Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 6 }}><Muted>Overtime hrs @ {money(r.payout.otRate)}</Muted><Stepper value={ed.overtimeHours || 0} onChange={(v) => setE(r.worker._id, 'overtimeHours', v)} disabled={job.paid} /></Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 6 }}><Muted>Extra / bonus</Muted><Stepper value={ed.bonus || 0} step={100} onChange={(v) => setE(r.worker._id, 'bonus', v)} format={money} /></Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 8 }}><Muted>Rate this worker</Muted><Stars value={stars[r.worker._id] || 0} size={22} onChange={(v) => setStars((p) => ({ ...p, [r.worker._id]: v }))} /></Row>
            </Card>
          );
        })}

        <H>Crew Performance Tags</H>
        <Row style={{ flexWrap: 'wrap' }}>{CREW_TAGS.map((t) => <Chip key={t} label={t} active={tags.includes(t)} onPress={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />)}</Row>
        <Card><SettingRow label="Auto-Soak Release for Wage Guarantee" sub="Release automatically after approval" value={autoRelease} onChange={toggleAuto} /></Card>
        {!job.paid && <Btn title="Save Adjustments & Ratings" variant="soft" onPress={save} loading={busy} />}
        <Btn title="Escrow Dispute" variant="danger" icon="flag" onPress={() => navigation.navigate('EscrowDispute', { jobId: job._id })} />
      </>)}
    </Screen>
  );
}
