// Prototype screen: Worker Ratings (score breakdown, endorsements, employer reviews)
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Avatar, Stars, Empty, Field, PickerModal, useLoad, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { DIMS, CREW_TAGS } from '../constants';
import { C } from '../theme';

export default function WorkerRatingsScreen({ route, navigation }) {
  const { user } = useAuth();
  const workerId = route.params?.workerId || user._id;
  const [filter, setFilter] = useState('all');
  const { data: d, loading, error, reload } = useLoad(() => api.get(`/workers/${workerId}/ratings`), [workerId]);
  const emp = user.role === 'employer' && workerId !== user._id;
  const [form, setForm] = useState(null); // { id?, jobId, jobTitle, stars, note, praise }
  const [pickJob, setPickJob] = useState(false);
  const [jobs, setJobs] = useState([]);
  const openForm = () => run(async () => {
    const all = await api.get('/jobs?status=in_progress,completed');
    const mine = all.filter((j) => j.roster.some((r) => r.worker._id === workerId));
    if (!mine.length) throw new Error('You can review a worker after hiring them for a shift.');
    setJobs(mine); setPickJob(true);
  }, 'No shared shifts');
  const saveReview = () => run(async () => {
    const body = { stars: form.stars, note: form.note, praise: form.praise };
    form.id ? await api.put(`/reviews/${form.id}`, body) : await api.post('/reviews', { ...body, jobId: form.jobId, targetId: workerId });
    setForm(null); reload();
  }, 'Could not save review');
  const delReview = (r) => confirm('Delete your review?', '', 'Delete', () => run(async () => { await api.del(`/reviews/${r._id}`); reload(); }));
  const reviews = (d?.reviews || []).filter((r) => filter === 'all' || (filter === '5' ? r.stars === 5 : r.stars < 5));

  return (
    <Screen title="Worker Ratings" loading={loading} error={error} onRefresh={reload}
      footer={d && workerId !== user._id && user.role === 'employer' ? <Btn title="Message Worker" icon="chatbubble" onPress={() => navigation.navigate('Chat', { userId: workerId })} /> : null}>
      {d && (<>
        <Card>
          <Row><Avatar name={d.worker.name} size={56} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontWeight: '800', fontSize: 18 }}>{d.worker.name}</Text><Muted>{d.worker.trade}</Muted>{d.worker.verified && <Badge text="Verified" icon="checkmark" />}</View></Row>
          <Row style={{ marginTop: 12 }}>
            <View style={{ alignItems: 'center', marginRight: 16 }}><Text style={{ fontSize: 38, fontWeight: '800', color: C.primary }}>{d.overall || '-'}</Text><Stars value={d.overall} size={14} /><Muted>{d.count} reviews</Muted></View>
            <View style={{ flex: 1 }}>{[5, 4, 3, 2, 1].map((n) => (
              <Row key={n} style={{ marginVertical: 1 }}><Muted style={{ width: 14 }}>{n}</Muted><View style={{ flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginHorizontal: 6 }}><View style={{ width: `${d.count ? (d.distribution[n] / d.count) * 100 : 0}%`, height: 6, backgroundColor: C.amber, borderRadius: 3 }} /></View><Muted style={{ width: 16 }}>{d.distribution[n]}</Muted></Row>))}</View>
          </Row>
        </Card>

        <H>Score Breakdown</H>
        <Card>{DIMS.map((l, i) => <Row key={l} style={{ justifyContent: 'space-between', paddingVertical: 5 }}><Text style={{ flex: 1 }}>{l}</Text><Text style={{ fontWeight: '800', color: C.primary }}>{d.dims[i] ? d.dims[i].toFixed(1) : '-'}</Text></Row>)}</Card>

        <H>Master Endorsements</H>
        <Row style={{ flexWrap: 'wrap' }}>{d.endorsements.length ? d.endorsements.map((e) => <Badge key={e.tag} text={`${e.tag} · ${e.count}`} color={C.primary} bg={C.blueBg} />) : <Muted>No endorsements yet.</Muted>}</Row>

        <H style={{ marginTop: 12 }}>Employer Reviews</H>
        <Row>{[['all', 'All'], ['5', '5 ★'], ['low', '4 ★ & below']].map(([k, l]) => <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />)}</Row>
        {reviews.length ? reviews.map((r) => (
          <Card key={r._id}>
            <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800' }}>{r.author?.businessName || r.author?.name}</Text><Stars value={r.stars} size={14} /></Row>
            {r.note ? <Text style={{ marginTop: 4 }}>{r.note}</Text> : null}
            <Row style={{ flexWrap: 'wrap', marginTop: 4 }}>{(r.praise || []).map((p) => <Badge key={p} text={p} color={C.muted} bg="#EEF1F7" />)}</Row>
            <Muted>{new Date(r.createdAt).toLocaleDateString()}</Muted>
            {r.author?._id === user._id && <Row style={{ gap: 8 }}><Btn small title="Edit" variant="soft" onPress={() => setForm({ id: r._id, jobId: r.job, stars: r.stars, note: r.note || '', praise: r.praise || [] })} style={{ flex: 1 }} /><Btn small title="Delete" variant="danger" onPress={() => delReview(r)} style={{ flex: 1 }} /></Row>}
          </Card>)) : <Empty text="No reviews match this filter." />}
        {emp && !form && <Btn title="Write a Review" icon="star" variant="outline" onPress={openForm} />}
        {form && (
          <Card>
            <H>{form.id ? 'Edit your review' : `Review for ${form.jobTitle}`}</H>
            <Stars value={form.stars} size={32} onChange={(v) => setForm({ ...form, stars: v })} />
            <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>{CREW_TAGS.map((t) => <Chip key={t} label={t} active={form.praise.includes(t)} onPress={() => setForm({ ...form, praise: form.praise.includes(t) ? form.praise.filter((x) => x !== t) : [...form.praise, t] })} />)}</Row>
            <Field multiline placeholder="Share your experience..." value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />
            <Row style={{ gap: 8 }}><Btn title="Cancel" variant="soft" onPress={() => setForm(null)} style={{ flex: 1 }} /><Btn title="Save Review" disabled={!form.stars} onPress={saveReview} style={{ flex: 1 }} /></Row>
          </Card>
        )}
        <PickerModal visible={pickJob} title="Which shift?" items={jobs.map((j) => ({ key: j._id, label: j.title, sub: j.location }))}
          onPick={(it) => { setPickJob(false); setForm({ jobId: it.key, jobTitle: it.label, stars: 0, note: '', praise: [] }); }} onClose={() => setPickJob(false)} />
        <Card style={{ backgroundColor: C.greenBg }}><Muted>🛡 Vedakaru Review Guarantee: only employers who completed a paid shift with this worker can review.</Muted></Card>
      </>)}
    </Screen>
  );
}
