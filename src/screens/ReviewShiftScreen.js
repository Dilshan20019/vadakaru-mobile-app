// Prototype screen: Review Completed Shift (rating, praise, notes, confirm & release)
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Stars, Field, Badge, useLoad, money, run } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { DIMS_WORKER, DIMS_EMPLOYER, PRAISE_WORKER, PRAISE_EMPLOYER } from '../constants';
import { C } from '../theme';

export default function ReviewShiftScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const isEmp = user.role === 'employer';
  const dimsList = isEmp ? DIMS_EMPLOYER : DIMS_WORKER;
  const praiseList = isEmp ? PRAISE_EMPLOYER : PRAISE_WORKER;

  const { data, loading, error, reload } = useLoad(async () => {
    const [job, mine] = await Promise.all([api.get(`/jobs/${id}`), api.get(`/reviews?job=${id}&mine=1`)]);
    return { job, mine };
  }, [id]);

  const [stars, setStars] = useState(0);
  const [dims, setDims] = useState([0, 0, 0, 0]);
  const [praise, setPraise] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { // pre-fill when an existing review is being edited
    const r = data?.mine?.[0];
    if (r) { setStars(r.stars); setDims(r.dimensions?.length ? r.dimensions : [0, 0, 0, 0]); setPraise(r.praise || []); setNote(r.note || ''); }
  }, [data]);

  const j = data?.job;
  const each = j ? (j.dailyWage + (j.travelAllowance || 0)) * j.durationDays : 0;
  const total = j ? each * j.roster.length : 0;
  const targets = j ? (isEmp ? j.roster.map((r) => r.worker._id) : [j.employer._id]) : [];

  const submit = async (release) => {
    if (!stars) return run(() => { throw new Error('Please give an overall star rating'); }, 'Rating needed');
    if (j.status !== 'completed') return run(() => { throw new Error('The employer must approve the shift completion first'); }, 'Not completed yet');
    setBusy(true);
    await run(async () => {
      for (const t of targets) {
        const body = { stars, dimensions: dims, praise, note };
        const existing = data.mine.find((m) => (m.target?._id || m.target) === t);
        existing ? await api.put(`/reviews/${existing._id}`, body) : await api.post('/reviews', { ...body, jobId: id, targetId: t });
      }
      if (release && !j.paid) await api.post(`/jobs/${id}/release`);
      navigation.popToTop();
    }, release ? 'Could not release' : 'Could not save');
    setBusy(false);
  };
  const removeReview = () => run(async () => { for (const m of data.mine) await api.del(`/reviews/${m._id}`); setStars(0); setDims([0, 0, 0, 0]); setPraise([]); setNote(''); reload(); });

  return (
    <Screen title="Review Completed Shift" loading={loading} error={error} onRefresh={reload}
      footer={j && <Btn title={isEmp ? (j.paid ? 'Save Review' : `Confirm & Release ${money(total)}`) : 'Submit Review'} variant="amber" icon="checkmark-circle" loading={busy} onPress={() => submit(isEmp)} />}>
      {j && (<>
        <Card>
          <Badge text={j.paid ? 'PAID' : j.status === 'completed' ? 'READY FOR INSTANT RELEASE' : j.status.toUpperCase()} />
          <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 6 }}>{j.title}</Text>
          <Muted>{j.employer.businessName} • {j.location}</Muted>
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <View><Muted>Daily wage rate</Muted><Text style={{ fontWeight: '800' }}>{money(j.dailyWage)}</Text></View>
            <View><Muted>Days</Muted><Text style={{ fontWeight: '800' }}>{j.durationDays}</Text></View>
            <View><Muted>Total payout</Muted><Text style={{ fontWeight: '800', color: C.green }}>{money(total)}</Text></View>
          </Row>
        </Card>

        <Card>
          <H style={{ textAlign: 'center' }}>{isEmp ? 'How was the crew on this job?' : `How was your experience with ${j.employer.businessName}?`}</H>
          <View style={{ alignItems: 'center', marginBottom: 8 }}><Stars value={stars} onChange={setStars} size={34} /></View>
          <H style={{ fontSize: 14 }}>{isEmp ? 'Crew Dimensions' : 'Worksite Dimensions'}</H>
          {dimsList.map((d, i) => (
            <Row key={d} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ flex: 1, fontSize: 13 }}>{d}</Text>
              <Stars value={dims[i]} size={18} onChange={(v) => setDims((p) => p.map((x, k) => (k === i ? v : x)))} />
            </Row>
          ))}
        </Card>

        <H>Praise Highlights</H>
        <Row style={{ flexWrap: 'wrap' }}>
          {praiseList.map((p) => <Chip key={p} label={p} active={praise.includes(p)} onPress={() => setPraise((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))} />)}
        </Row>
        <Field label={isEmp ? 'Notes about the crew' : 'Notes for Fellow Workers'} multiline value={note} onChangeText={setNote} placeholder="Share useful details for others..." />

        {data.mine.length > 0 && <Btn title="Delete My Review" variant="danger" icon="trash" onPress={removeReview} />}
        <Btn title="Save Draft & Review Later" variant="soft" onPress={() => navigation.goBack()} />
        <Card style={{ backgroundColor: C.greenBg, marginTop: 10 }}><Muted>🛡 Vedakaru Fair Pay Protection: if payment is not instant after approval, our dispute desk resolves it within 24 hours.</Muted></Card>
      </>)}
    </Screen>
  );
}
