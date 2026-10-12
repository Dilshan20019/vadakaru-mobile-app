import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Button, Muted, Row, Badge, Chip, ChipRow, Empty, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone, startLabel } from '../utils';
import { useFilters, DEFAULT_FILTERS } from '../context/FilterContext';
import { colors } from '../theme';

const TONE = { pending: 'orange', shortlisted: 'blue', accepted: 'green', rejected: 'red', filled: 'red' };
const LABEL = { pending: 'Pending Review', shortlisted: 'Shortlisted', accepted: 'Accepted', rejected: 'Not Selected', filled: 'Position Filled' };
const TABS = [['all', 'All'], ['pending', 'Pending'], ['shortlisted', 'Shortlisted'], ['accepted', 'Accepted'], ['closed', 'Closed']];

export default function ApplicationsScreen({ navigation }) {
  const [apps, setApps] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const { setFilters } = useFilters();

  // READ my applications
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs/applications/mine');
      setApps(data.applications);
    } catch (e) {
      Alert.alert('Could not load', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(() => ({
    all: apps.length,
    pending: apps.filter((a) => a.status === 'pending').length,
    shortlisted: apps.filter((a) => a.status === 'shortlisted').length,
    accepted: apps.filter((a) => a.status === 'accepted').length,
    closed: apps.filter((a) => a.status === 'rejected' || a.status === 'filled').length,
  }), [apps]);

  // DELETE: withdraw a waiting application
  const withdraw = (a) =>
    Alert.alert('Withdraw application', `Withdraw from "${a.job.title}"?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/applications/${a._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  // "Find similar jobs" pre-filters the Search tab to the same trade
  const findSimilar = (a) => {
    setFilters({ ...DEFAULT_FILTERS, trades: [a.job.trade] });
    navigation.navigate('Jobs');
  };

  // accepted jobs open the "hired" page, everything else the status page
  const open = (a) => navigation.navigate(a.status === 'accepted' ? 'AcceptedJob' : 'ApplicationStatus', { applicationId: a._id });

  const visible = apps.filter((a) => tab === 'all' || (tab === 'closed' ? a.status === 'rejected' || a.status === 'filled' : a.status === tab));

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={visible}
      keyExtractor={(a) => a._id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View>
          <Card tone="blue"><Text style={{ fontWeight: '800' }}>{counts.accepted} accepted • {counts.pending} waiting for a reply</Text><Muted>Contractors reply fastest in the first hour.</Muted></Card>
          <ChipRow scroll>{TABS.map(([k, l]) => <Chip key={k} label={`${l} (${counts[k]})`} selected={tab === k} onPress={() => setTab(k)} />)}</ChipRow>
        </View>
      }
      ListEmptyComponent={<Empty text="No applications in this tab yet." />}
      renderItem={({ item: a }) => (
        <TouchableOpacity activeOpacity={0.9} onPress={() => open(a)}>
          <Card>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 16 }}>{a.job.title}</Text>
                <Muted>{a.job.employer?.companyName || a.job.employer?.fullName} • {[a.job.town, a.job.district].filter(Boolean).join(', ')}</Muted>
              </View>
              <Badge text={LABEL[a.status]} tone={TONE[a.status]} />
            </Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <Muted>{startLabel(a.job.startDate)}</Muted>
              <Text style={{ fontWeight: '900', color: colors.primary }}>{money(a.job.dailyWage)} <Text style={{ fontSize: 11, color: colors.muted }}>/ day</Text></Text>
            </Row>
            <Row style={{ marginTop: 10 }}>
              <Button title={a.status === 'accepted' ? 'Job Details' : 'View Status'} variant="outline" small onPress={() => open(a)} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Contract" variant="soft" small onPress={() => navigation.navigate('ApplicationDetail', { applicationId: a._id })} style={{ flex: 1, marginRight: 8 }} />
              {a.status === 'accepted' ? <Button title="Contact Site" icon="call" small onPress={() => callPhone(a.job.employer?.phone)} style={{ flex: 1 }} /> : null}
              {a.status === 'pending' || a.status === 'shortlisted' ? <Button title="Withdraw" variant="danger" small onPress={() => withdraw(a)} style={{ flex: 1 }} /> : null}
              {a.status === 'filled' || a.status === 'rejected' ? <Button title="Find Similar" icon="search" variant="soft" small onPress={() => findSimilar(a)} style={{ flex: 1 }} /> : null}
            </Row>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}
