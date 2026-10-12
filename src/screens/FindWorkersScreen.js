import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Muted, Chip, ChipRow, Empty, Badge } from '../components/ui';
import WorkerCard from '../components/WorkerCard';
import useWorkerActions from '../hooks/useWorkerActions';
import { useWorkerFilters } from '../context/WorkerFilterContext';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

const TABS = [['all', 'All'], ['recommended', 'Recommended'], ['nearby', 'Nearby']];
const SORTS = [['match', 'Best match'], ['rating', 'Top rated'], ['distance', 'Nearest'], ['experience', 'Experience'], ['wage', 'Lowest wage']];

export default function FindWorkersScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { filters, toParams, activeCount } = useWorkerFilters();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('match');
  const [workers, setWorkers] = useState([]);
  const [forJob, setForJob] = useState(null);
  const [loading, setLoading] = useState(false);

  // READ workers matching search + tab + sort + filters
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/workers', { params: { ...toParams(), q: q.trim() || undefined, tab, sort } });
      setWorkers(data.workers);
      setForJob(data.forJob);
    } catch (e) {
      Alert.alert('Could not load workers', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, tab, sort, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/WorkerFilters')} style={{ marginRight: 14 }}>
          <Ionicons name="options-outline" size={24} color={colors.primary} />
          {activeCount() ? <View style={{ position: 'absolute', right: -6, top: -4 }}><Badge text={String(activeCount())} tone="red" /></View> : null}
        </TouchableOpacity>
      ),
    });
  }, [navigation, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const { toggleSave } = useWorkerActions((w) => setWorkers((list) => list.map((x) => (x._id === w._id ? w : x))));

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={workers}
      keyExtractor={(w) => w._id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search name, trade or town" returnKeyType="search" style={{ flex: 1, padding: 12 }} placeholderTextColor="#94A3B8" />
          </View>
          <ChipRow>{TABS.map(([k, l]) => <Chip key={k} label={l} selected={tab === k} onPress={() => setTab(k)} />)}</ChipRow>
          <ChipRow scroll>{SORTS.map(([k, l]) => <Chip key={k} label={l} selected={sort === k} onPress={() => setSort(k)} />)}</ChipRow>
          {forJob ? <Muted style={{ marginVertical: 6 }}>Matching for your job: {forJob.title}</Muted> : <Muted style={{ marginVertical: 6 }}>Post a job to improve match accuracy.</Muted>}
        </View>
      }
      ListEmptyComponent={<Empty text="No workers match your search and filters." />}
      renderItem={({ item: w }) => (
        <WorkerCard worker={w} onPress={() => router.push({ pathname: '/WorkerProfile', params: { workerId: w._id } })} onToggleSave={toggleSave} onInvite={(x) => router.push({ pathname: '/InviteWorker', params: { worker: JSON.stringify(x) } })} />
      )}
    />
  );
}
