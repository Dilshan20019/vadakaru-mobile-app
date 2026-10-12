import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Button, Muted, Row, Badge, Empty, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

const TONE = { pending: 'orange', accepted: 'green', rejected: 'red' };

export default function ApplicantsScreen() {
  const { job: jobParam } = useLocalSearchParams();
  const serializedJob = Array.isArray(jobParam) ? jobParam[0] : jobParam;
  const job = JSON.parse(serializedJob);
  const [apps, setApps] = useState([]);

  // READ applicants
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${job._id}/applications`);
      setApps(data.applications);
    } catch (e) {
      Alert.alert('Could not load applicants', errMsg(e));
    }
  }, [job._id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // UPDATE application status
  const decide = async (a, status) => {
    try {
      await api.put(`/jobs/${job._id}/applications/${a._id}`, { status });
      load();
    } catch (e) {
      Alert.alert('Failed', errMsg(e));
    }
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={apps}
      keyExtractor={(a) => a._id}
      ListHeaderComponent={<Text style={{ fontWeight: '900', fontSize: 17, marginBottom: 10 }}>{job.title}</Text>}
      ListEmptyComponent={<Empty text="No applicants yet." />}
      renderItem={({ item: a }) => (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{a.worker?.displayName || a.worker?.fullName}</Text>
              <Muted>{a.worker?.primaryTrade || 'Trade not set'} • {a.worker?.experienceYears || 0} yrs • {a.worker?.homeDistrict}</Muted>
              <Muted>Rating {a.worker?.rating || '—'} • expects {money(a.worker?.wage?.fullDay)}/day</Muted>
              {a.status === 'accepted' ? <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>Call: {a.worker?.phone}</Text> : null}
            </View>
            <Badge text={a.status.toUpperCase()} tone={TONE[a.status]} />
          </Row>
          <Row style={{ marginTop: 10 }}>
            <Button title="Accept" small onPress={() => decide(a, 'accepted')} disabled={a.status === 'accepted'} style={{ marginRight: 8 }} />
            <Button title="Reject" small variant="outline" onPress={() => decide(a, 'rejected')} disabled={a.status === 'rejected'} />
          </Row>
        </Card>
      )}
    />
  );
}
