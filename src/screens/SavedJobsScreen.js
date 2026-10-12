import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Muted, Empty, money } from '../components/ui';
import JobCard from '../components/JobCard';
import { useJobActions } from '../hooks/useJobActions';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

export default function SavedJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // READ saved jobs
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs/saved/mine');
      setJobs(data.jobs);
      setTotal(data.totalPotential);
    } catch (e) {
      Alert.alert('Could not load saved jobs', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // toggleSave removes the job (DELETE /jobs/:id/save); apply creates an application
  const { apply, toggleSave } = useJobActions(load);

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={jobs}
      keyExtractor={(j) => j._id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <Card tone="orange">
          <Muted style={{ fontWeight: '700' }}>SHORTLISTED WAGE POTENTIAL</Muted>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>{money(total)}</Text>
          <Muted>Combined value across {jobs.length} saved job(s)</Muted>
        </Card>
      }
      ListEmptyComponent={<Empty text="No saved jobs yet. Tap the heart on any job to keep it here." />}
      renderItem={({ item: j }) => (
        <JobCard job={j} onPress={() => navigation.navigate('JobDetail', { jobId: j._id })} onApply={apply} onToggleSave={toggleSave} applyLabel="Quick Apply" />
      )}
    />
  );
}
