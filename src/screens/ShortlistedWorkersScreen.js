// Prototype screen: Shortlisted Workers (sort, view, chat, hire, compare)
import React, { useState } from 'react';
import { View, Text, Modal, ScrollView } from 'react-native';
import { Screen, Card, Muted, Row, Btn, Chip, Badge, Avatar, Empty, useLoad, money, run } from '../ui';
import { api } from '../api';
import { C } from '../theme';

const SORTS = { match: (a, b) => b.match - a.match, rating: (a, b) => b.worker.rating - a.worker.rating, near: (a, b) => (a.worker.distanceKm ?? 99) - (b.worker.distanceKm ?? 99) };

export default function ShortlistedWorkersScreen({ route, navigation }) {
  const [sort, setSort] = useState('match');
  const [cmp, setCmp] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const jobs = await api.get('/jobs?status=published,in_progress');
    const id = jobs.find((j) => j._id === route.params?.jobId)?._id || jobs[0]?._id;
    if (!id) return { id: null };
    const [job, list] = await Promise.all([api.get(`/jobs/${id}`), api.get(`/shortlist?job=${id}`)]);
    return { id, job, list };
  }, [route.params?.jobId]);

  const list = (data?.list || []).slice().sort(SORTS[sort]);
  const remove = (s) => run(async () => { await api.del(`/shortlist/${s._id}`); reload(); });
  const rates = list.map((s) => s.worker.dailyRate);

  return (
    <Screen title="Shortlisted Workers" loading={loading} error={error} onRefresh={reload}
      footer={list.length > 1 ? <Row style={{ justifyContent: 'space-between' }}><View><Text style={{ fontWeight: '800' }}>Ready to Compare</Text><Muted>Rates: {money(Math.min(...rates))} - {money(Math.max(...rates))}</Muted></View><Btn title={`Compare (${list.length})`} onPress={() => setCmp(true)} /></Row> : null}>
      {!data?.id ? <Empty text="No open shift selected." /> : (<>
        <Card style={{ backgroundColor: C.blueBg }}><Muted>ACTIVE RECRUITMENT SITE</Muted><Text style={{ fontSize: 18, fontWeight: '800' }}>{data.job.title}</Text><Muted>{data.job.location} • {data.job.workersNeeded - data.job.roster.length} openings left</Muted></Card>
        <Row style={{ justifyContent: 'space-between' }}><Badge text={`${list.length} Shortlisted Candidates`} /><Muted>⚡ Instant Hire Active</Muted></Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>{[['match', 'Best Match'], ['rating', 'Highest Rating'], ['near', 'Nearest']].map(([k, l]) => <Chip key={k} label={l} active={sort === k} onPress={() => setSort(k)} />)}</ScrollView>
        {list.length ? list.map((s) => {
          const w = s.worker;
          const hired = data.job.roster.some((r) => r.worker._id === w._id);
          return (
            <Card key={s._id}>
              <Row>
                <Avatar name={w.name} size={50} bg={C.green} />
                <View style={{ flex: 1, marginLeft: 10 }}><Text style={{ fontWeight: '800', fontSize: 16 }}>{w.name}</Text><Muted>{w.trade}</Muted><Badge text={`${s.match}% Match`} color={C.primary} bg={C.blueBg} /></View>
                <Text onPress={() => remove(s)} style={{ fontSize: 22 }}>🔖</Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', backgroundColor: C.bg, borderRadius: 10, padding: 10, marginVertical: 8 }}>
                <View style={{ alignItems: 'center' }}><Text style={{ fontWeight: '800' }}>★ {w.rating}</Text><Muted>({w.jobsDone} jobs)</Muted></View>
                <View style={{ alignItems: 'center' }}><Text style={{ fontWeight: '800' }}>{w.distanceKm ?? '-'} km</Text><Muted>{w.location}</Muted></View>
                <View style={{ alignItems: 'center' }}><Text style={{ fontWeight: '800', color: C.primary }}>{money(w.dailyRate)}</Text><Muted>/ day</Muted></View>
              </Row>
              <Row style={{ gap: 8 }}>
                <Btn small title="View" variant="soft" onPress={() => navigation.navigate('ApplicantProfile', { workerId: w._id, jobId: data.id })} style={{ flex: 1 }} />
                <Btn small title="Chat" variant="soft" onPress={() => navigation.navigate('Chat', { userId: w._id, jobId: data.id })} style={{ flex: 1 }} />
                <Btn small title={hired ? 'Hired ✓' : 'Hire Now'} variant="green" disabled={hired} onPress={() => navigation.navigate('ConfirmHire', { workerId: w._id, jobId: data.id })} style={{ flex: 2 }} />
              </Row>
            </Card>
          );
        }) : <Empty icon="bookmark-outline" text="No shortlisted workers yet. Shortlist applicants from the Applicants tab." />}
      </>)}

      <Modal visible={cmp} animationType="slide" onRequestClose={() => setCmp(false)}>
        <Screen title="Compare Workers" noBack right={<Text onPress={() => setCmp(false)} style={{ color: C.primary, fontWeight: '800' }}>Close</Text>}>
          <ScrollView horizontal>
            <View>
              {[['', (s) => s.worker.name.split(' ')[0]], ['Match', (s) => `${s.match}%`], ['Rating', (s) => `★ ${s.worker.rating}`], ['Jobs', (s) => s.worker.jobsDone], ['Distance', (s) => `${s.worker.distanceKm} km`], ['Daily rate', (s) => money(s.worker.dailyRate)]].map(([label, fn]) => (
                <Row key={label} style={{ borderBottomWidth: 1, borderColor: C.border }}>
                  <Text style={{ width: 90, padding: 10, color: C.muted, fontWeight: '700' }}>{label}</Text>
                  {list.map((s) => <Text key={s._id} style={{ width: 110, padding: 10, fontWeight: label ? '600' : '800' }}>{fn(s)}</Text>)}
                </Row>
              ))}
            </View>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}
