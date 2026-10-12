import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Muted, Empty } from '../components/ui';
import WorkerCard from '../components/WorkerCard';
import useWorkerActions from '../hooks/useWorkerActions';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';
import { Text } from 'react-native';

export default function RecommendedWorkersScreen({ navigation, route }) {
  const [workers, setWorkers] = useState([]);
  const [forJob, setForJob] = useState(null);
  const [loading, setLoading] = useState(false);

  // READ workers ranked by match % for the chosen (or newest open) job
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/workers', { params: { tab: 'recommended', sort: 'match', jobId: route.params?.jobId } });
      setWorkers(data.workers);
      setForJob(data.forJob);
    } catch (e) {
      Alert.alert('Could not load', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [route.params?.jobId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { toggleSave } = useWorkerActions((w) => setWorkers((list) => list.map((x) => (x._id === w._id ? w : x))));

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={workers}
      keyExtractor={(w) => w._id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <Card tone="blue">
          <Text style={{ fontWeight: '800' }}>{forJob ? `Best matches for: ${forJob.title}` : 'Recommended for you'}</Text>
          <Muted>Ranked by trade, location, rating and availability.</Muted>
        </Card>
      }
      ListEmptyComponent={<Empty text="No strong matches yet. Post an open job or widen your search in Find Workers." />}
      renderItem={({ item: w }) => (
        <WorkerCard worker={w} onPress={() => navigation.navigate('WorkerProfile', { workerId: w._id })} onToggleSave={toggleSave} onInvite={(x) => navigation.navigate('InviteWorker', { worker: x, jobId: forJob?._id })} />
      )}
    />
  );
}
