import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Button, Muted, Row, Badge, Chip, ChipRow, Empty, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone } from '../utils';
import { colors } from '../theme';

const TABS = [['pending', 'New'], ['shortlisted', 'Shortlisted'], ['accepted', 'Accepted'], ['rejected', 'Rejected']];

export default function ApplicationManagementScreen({ navigation }) {
  const [apps, setApps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(false);

  // READ all applications across my postings
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs/employer/applications');
      setApps(data.applications);
      setJobs(data.jobs);
    } catch (e) {
      Alert.alert('Could not load applications', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // UPDATE status: accept / shortlist / reject
  const decide = async (a, status) => {
    try {
      await api.put(`/jobs/${a.job._id}/applications/${a._id}`, { status });
      load();
    } catch (e) {
      Alert.alert('Failed', errMsg(e));
    }
  };

  const chat = (a) =>
    Alert.alert('In-app chat', 'In-app chat is not part of this version. Call the worker instead?', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Call', onPress: () => callPhone(a.worker?.phone) },
    ]);

  const inJob = apps.filter((a) => !jobId || a.job?._id === jobId);
  const count = (k) => inJob.filter((a) => a.status === k).length;
  const visible = inJob.filter((a) => a.status === tab || (tab === 'rejected' && a.status === 'filled'));

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={visible}
      keyExtractor={(a) => a._id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View>
          <Muted style={{ fontWeight: '700' }}>FILTER BY POSTING</Muted>
          <ChipRow scroll>
            <Chip label="All postings" selected={!jobId} onPress={() => setJobId(null)} />
            {jobs.map((j) => <Chip key={j._id} label={j.title.length > 26 ? `${j.title.slice(0, 26)}…` : j.title} selected={jobId === j._id} onPress={() => setJobId(j._id)} />)}
          </ChipRow>
          <ChipRow scroll>{TABS.map(([k, l]) => <Chip key={k} label={`${l} (${count(k)})`} selected={tab === k} onPress={() => setTab(k)} />)}</ChipRow>
        </View>
      }
      ListEmptyComponent={<Empty text="No applications in this tab." />}
      renderItem={({ item: a }) => (
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <TouchableOpacity style={{ flex: 1, paddingRight: 8 }} onPress={() => navigation.navigate('WorkerProfile', { workerId: a.worker._id })}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{a.worker?.displayName || a.worker?.fullName}{a.worker?.nicVerified ? ' ✓' : ''}</Text>
              <Muted>{a.worker?.primaryTrade || 'Trade not set'} • {a.worker?.experienceYears || 0} yrs • {a.worker?.homeDistrict}</Muted>
              <Muted>Rating {a.worker?.rating || '—'} • expects {money(a.worker?.wage?.fullDay)}/day</Muted>
            </TouchableOpacity>
            <Badge text={a.status === 'filled' ? 'FILLED' : a.status.toUpperCase()} tone={a.status === 'accepted' ? 'green' : a.status === 'pending' ? 'orange' : a.status === 'shortlisted' ? 'blue' : 'red'} />
          </Row>
          <Muted style={{ marginTop: 6 }}>Applied for: {a.job?.title}</Muted>
          {a.note ? <Muted style={{ marginTop: 4, fontStyle: 'italic' }}>“{a.note}”</Muted> : null}
          <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {a.status !== 'accepted' ? <Button title="Accept" small onPress={() => decide(a, 'accepted')} style={{ marginRight: 6, marginBottom: 6 }} /> : null}
            {a.status === 'pending' ? <Button title="Shortlist" small variant="soft" onPress={() => decide(a, 'shortlisted')} style={{ marginRight: 6, marginBottom: 6 }} /> : null}
            <Button title="Chat" small variant="outline" icon="chatbubble-outline" onPress={() => chat(a)} style={{ marginRight: 6, marginBottom: 6 }} />
            {a.status !== 'rejected' ? <Button title="Reject" small variant="danger" onPress={() => decide(a, 'rejected')} style={{ marginBottom: 6 }} /> : null}
          </Row>
        </Card>
      )}
    />
  );
}
