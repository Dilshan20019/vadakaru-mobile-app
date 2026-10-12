// Prototype screen: Home (employer dashboard)
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H, Muted, Row, Btn, Stat, Avatar, Badge, Empty, useLoad, money, run } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function HomeScreen({ navigation }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, reload } = useLoad(async () => {
    const [stats, jobs, workers, apps] = await Promise.all([
      api.get('/jobs/stats/summary'), api.get('/jobs?status=published,in_progress'),
      api.get('/workers'), api.get('/applications/recent'),
    ]);
    return { stats, jobs, workers, apps };
  });

  const review = (a) =>
    Alert.alert(a.worker?.name || 'Applicant', `${a.job?.title}\nRs. ${a.job?.dailyWage}/day  •  ★ ${a.worker?.rating}`, [
      { text: 'Reject', style: 'destructive', onPress: () => run(async () => { await api.put(`/applications/${a._id}`, { status: 'rejected' }); reload(); }) },
      { text: 'Accept', onPress: () => run(async () => { await api.put(`/applications/${a._id}`, { status: 'accepted' }); reload(); }, 'Cannot accept') },
      { text: 'Close', style: 'cancel' },
    ]);

  const st = data?.stats || {};
  return (
    <Screen title="Home" loading={loading} error={error} onRefresh={reload} noBack>
      <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>Good day, {user.name?.split(' ')[0]} 👋</Text>
      <Muted style={{ marginBottom: 12 }}>{user.businessName}</Muted>

      <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
        <Text style={{ color: '#BFD0FF', fontSize: 12 }}>Find workers in under 15 mins</Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginVertical: 4 }}>Need urgent site labor today?</Text>
        <Btn title="Post a New Job" icon="add-circle" variant="outline" onPress={() => navigation.navigate('DraftJobs')} />
      </Card>

      <H>Overview</H>
      <Row style={{ gap: 10, marginBottom: 10 }}>
        <Stat value={st.active ?? 0} label="Active Jobs" icon="briefcase" />
        <Stat value={st.applications ?? 0} label={`Applications (+${st.newApps ?? 0} new)`} icon="people" />
      </Row>
      <Row style={{ gap: 10, marginBottom: 16 }}>
        <Stat value={st.shortlisted ?? 0} label="Shortlisted" icon="star" color={C.amber} />
        <Stat value={st.completed ?? 0} label="Completed Jobs" icon="checkmark-circle" color={C.green} />
      </Row>

      <Row style={{ justifyContent: 'space-between' }}><H>Active Jobs ({data?.jobs.length ?? 0})</H><Text onPress={() => router.push('/(employer)/Postings')} style={{ color: C.primary, fontWeight: '700' }}>View all</Text></Row>
      {data?.jobs.length ? data.jobs.slice(0, 2).map((j) => (
        <Card key={j._id}>
          <Badge text={j.category} color={C.primary} bg={C.blueBg} />
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontWeight: '800', color: C.text, flex: 1 }}>{j.title}</Text>
            <Text style={{ fontWeight: '800', color: C.primary }}>{money(j.dailyWage)}</Text>
          </Row>
          <Muted>{j.location} • {j.roster.length}/{j.workersNeeded} workers</Muted>
          <Row style={{ gap: 8, marginTop: 8 }}>
            <Btn small title="Manage" variant="soft" onPress={() => navigation.navigate('Shifts')} style={{ flex: 1 }} />
            <Btn small title="Details" variant="outline" onPress={() => navigation.navigate('JobDetails', { id: j._id })} style={{ flex: 1 }} />
          </Row>
        </Card>
      )) : <Empty text="No active jobs. Post a new one!" />}

      <H>Recommended Workers</H>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data?.workers.slice(0, 6).map((w) => (
          <Card key={w._id} style={{ width: 170, marginRight: 10 }}>
            <Row><Avatar name={w.name} /><View style={{ marginLeft: 8, flex: 1 }}><Text style={{ fontWeight: '800' }} numberOfLines={1}>{w.name.split(' ')[0]} {w.name.split(' ').slice(-1)[0][0]}.</Text><Muted>{w.trade}</Muted></View></Row>
            <Muted style={{ marginVertical: 6 }}>{money(w.dailyRate)}/day • ★ {w.rating}</Muted>
            <Btn small title="Invite" onPress={() => navigation.navigate('WorkerProfile', { workerId: w._id })} />
          </Card>
        ))}
      </ScrollView>

      <Row style={{ justifyContent: 'space-between' }}><H>Recent Applications</H></Row>
      {data?.apps.length ? data.apps.slice(0, 4).map((a) => (
        <Card key={a._id}>
          <Row>
            <Avatar name={a.worker?.name} bg={C.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '800' }}>{a.worker?.name}</Text>
              <Muted>Applied for: {a.job?.title}</Muted>
              <Badge text={a.status.toUpperCase()} color={a.status === 'accepted' ? C.green : a.status === 'rejected' ? C.danger : C.amber} bg={a.status === 'accepted' ? C.greenBg : a.status === 'rejected' ? C.dangerBg : C.amberBg} />
            </View>
            <Btn small title="Review" onPress={() => review(a)} />
          </Row>
        </Card>
      )) : <Empty text="No applications yet" />}
    </Screen>
  );
}
