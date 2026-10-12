import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Button, Muted, Row, Badge, SectionTitle, Empty, money } from '../components/ui';
import WorkerCard from '../components/WorkerCard';
import useWorkerActions from '../hooks/useWorkerActions';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

const TONE = { pending: 'orange', shortlisted: 'blue', accepted: 'green', rejected: 'red', filled: 'red' };

export default function EmployerHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // READ dashboard summary + recommended workers
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, rec] = await Promise.all([api.get('/employers/dashboard/summary'), api.get('/workers', { params: { tab: 'recommended' } })]);
      setData(sum.data);
      setWorkers(rec.data.workers.slice(0, 3));
    } catch (e) {
      Alert.alert('Could not load dashboard', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { toggleSave } = useWorkerActions((w) => setWorkers((list) => list.map((x) => (x._id === w._id ? w : x))));
  const st = data?.stats || {};
  const tiles = [
    ['Active Jobs', st.activeJobs, 'briefcase-outline'],
    ['New Applicants', st.newApplications, 'mail-unread-outline'],
    ['Shortlisted', st.shortlisted, 'star-outline'],
    ['Hired', st.hired, 'checkmark-done-outline'],
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={{ fontSize: 22, fontWeight: '900' }}>Hello, {user.authorizedRep?.split(' ')[0] || user.fullName.split(' ')[0]}</Text>
      <Muted style={{ marginBottom: 12 }}>{user.companyName || 'Your business'}</Muted>

      <Row style={{ flexWrap: 'wrap', marginHorizontal: -4 }}>
        {tiles.map(([label, value, icon]) => (
          <View key={label} style={{ width: '50%', padding: 4 }}>
            <Card style={{ marginBottom: 0 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>{value ?? '–'}</Text>
              <Muted>{label}</Muted>
            </Card>
          </View>
        ))}
      </Row>

      <Button title="Post a New Job" variant="accent" icon="add-circle-outline" onPress={() => router.push('/JobForm')} style={{ marginVertical: 14 }} />

      <SectionTitle icon="briefcase-outline" right={<TouchableOpacity onPress={() => router.push('/(employer)/Postings')}><Text style={{ color: colors.primary, fontWeight: '700' }}>See all</Text></TouchableOpacity>}>Active Jobs</SectionTitle>
      {data && data.activeJobs.length === 0 ? <Empty text="No active jobs. Post one to start receiving applicants." /> : null}
      {(data?.activeJobs || []).map((j) => (
        <TouchableOpacity key={j._id} activeOpacity={0.9} onPress={() => router.push({ pathname: '/Applicants', params: { job: JSON.stringify(j) } })}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '800' }}>{j.title}</Text>
                <Muted>{[j.town, j.district].filter(Boolean).join(', ')} • {j.workersNeeded} needed</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '900', color: colors.primary }}>{money(j.dailyWage)}</Text>
                <Badge text={`${j.applicants} applied`} tone="blue" />
              </View>
            </Row>
          </Card>
        </TouchableOpacity>
      ))}

      <SectionTitle icon="people-outline" right={<TouchableOpacity onPress={() => router.push('/RecommendedWorkers')}><Text style={{ color: colors.primary, fontWeight: '700' }}>See all</Text></TouchableOpacity>}>Recommended Workers</SectionTitle>
      {workers.length === 0 ? <Empty text="Post a job to get worker recommendations." /> : null}
      {workers.map((w) => (
        <WorkerCard key={w._id} worker={w} onPress={() => router.push({ pathname: '/WorkerProfile', params: { workerId: w._id } })} onToggleSave={toggleSave} onInvite={(x) => router.push({ pathname: '/InviteWorker', params: { worker: JSON.stringify(x) } })} />
      ))}

      <SectionTitle icon="document-text-outline" right={<TouchableOpacity onPress={() => router.push('/(employer)/ManageApplications')}><Text style={{ color: colors.primary, fontWeight: '700' }}>Manage</Text></TouchableOpacity>}>Recent Applications</SectionTitle>
      {data && data.recentApplications.length === 0 ? <Empty text="No applications yet." /> : null}
      {(data?.recentApplications || []).map((a) => (
        <Card key={a._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{a.worker?.displayName || a.worker?.fullName}</Text>
              <Muted>{a.worker?.primaryTrade} • applied for {a.job?.title}</Muted>
            </View>
            <Badge text={a.status.toUpperCase()} tone={TONE[a.status]} />
          </Row>
        </Card>
      ))}
    </ScrollView>
  );
}
