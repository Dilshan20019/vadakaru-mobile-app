import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Button, Muted, Row, Badge, Empty, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

export default function EmployerJobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // READ my postings
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs/mine');
      setJobs(data.jobs);
    } catch (e) {
      Alert.alert('Could not load postings', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // UPDATE status (close / reopen)
  const toggleStatus = async (j) => {
    try {
      await api.put(`/jobs/${j._id}`, { status: j.status === 'open' ? 'closed' : 'open' });
      load();
    } catch (e) { Alert.alert('Failed', errMsg(e)); }
  };

  // UPDATE status: mark finished (moves it to the public "History" tab)
  const markCompleted = (j) =>
    Alert.alert('Mark as completed', `Mark "${j.title}" as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try { await api.put(`/jobs/${j._id}`, { status: 'completed' }); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  // DELETE posting
  const remove = (j) =>
    Alert.alert('Delete job', `Delete "${j.title}" and all its applications?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/jobs/${j._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        data={jobs}
        keyExtractor={(j) => j._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Empty text="You have not posted any jobs yet. Tap “Post a Job” to hire a worker." />}
        renderItem={({ item: j }) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Badge text={j.status.toUpperCase()} tone={j.status === 'open' ? 'green' : 'orange'} />
                <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 6 }}>{j.title}</Text>
                <Muted>{j.trade} • {[j.town, j.district].filter(Boolean).join(', ')}</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '900', color: colors.primary }}>{money(j.dailyWage)}</Text>
                <Muted>{j.days} day(s) • {j.workersNeeded} needed • {j.applicants} applied</Muted>
              </View>
            </Row>
            <Row style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <Button title="Applicants" small onPress={() => router.push({ pathname: '/Applicants', params: { job: JSON.stringify(j) } })} style={{ marginRight: 8, marginBottom: 6 }} />
              <Button title="Edit" small variant="soft" onPress={() => router.push({ pathname: '/JobForm', params: { job: JSON.stringify(j) } })} style={{ marginRight: 8, marginBottom: 6 }} />
              {j.status !== 'completed' ? <Button title={j.status === 'open' ? 'Close' : 'Reopen'} small variant="outline" onPress={() => toggleStatus(j)} style={{ marginRight: 8, marginBottom: 6 }} /> : null}
              {j.status !== 'completed' ? <Button title="Complete" small variant="soft" onPress={() => markCompleted(j)} style={{ marginRight: 8, marginBottom: 6 }} /> : null}
              <Button title="Delete" small variant="danger" onPress={() => remove(j)} style={{ marginBottom: 6 }} />
            </Row>
          </Card>
        )}
      />
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <Button title="Post a Job" variant="accent" icon="add-circle-outline" onPress={() => router.push('/JobForm')} />
      </View>
    </View>
  );
}
