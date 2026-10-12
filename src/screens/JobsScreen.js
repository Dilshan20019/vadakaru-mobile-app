import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Card, Muted, Row, Field, Empty, Button } from '../components/ui';
import JobCard from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { useJobActions } from '../hooks/useJobActions';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

export default function JobsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { filters, toParams, activeCount, reset } = useFilters();
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  // READ jobs with search + filters
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...toParams(filters) };
      if (q.trim()) params.q = q.trim();
      const { data } = await api.get('/jobs', { params });
      setJobs(data.jobs);
    } catch (e) {
      Alert.alert('Could not load jobs', errMsg(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { apply, toggleSave } = useJobActions(load);
  const count = activeCount();

  const header = (
    <View>
      <Card tone="blue">
        <Text style={{ fontWeight: '900', fontSize: 18 }}>Ayubowan, {user.displayName || user.fullName.split(' ')[0]}</Text>
        <Muted>{user.homeDistrict ? `Searching in ${user.homeDistrict} District` : 'Set your district in Location Setup'} • {jobs.length} jobs found</Muted>
      </Card>

      <Field value={q} onChangeText={setQ} placeholder="Search Mason, Gampaha…" returnKeyType="search" onSubmitEditing={load} style={{ marginBottom: 8 }} />

      <Row style={{ marginBottom: 12 }}>
        <TouchableOpacity onPress={() => router.push('/SearchFilters')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 }}>
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <Text style={{ fontWeight: '700', marginLeft: 6 }}>Filters{count ? ` (${count})` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/NearbyMap')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 }}>
          <Ionicons name="map-outline" size={18} color="#fff" />
          <Text style={{ fontWeight: '700', marginLeft: 6, color: '#fff' }}>Map</Text>
        </TouchableOpacity>
        {count ? <Button title="Clear" variant="outline" small onPress={reset} /> : null}
      </Row>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={jobs}
      keyExtractor={(j) => j._id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListEmptyComponent={<Empty text="No open jobs match your search and filters right now." />}
      renderItem={({ item: j }) => (
        <JobCard job={j} onPress={() => router.push({ pathname: '/JobDetail', params: { jobId: j._id } })} onApply={apply} onToggleSave={toggleSave} />
      )}
    />
  );
}
