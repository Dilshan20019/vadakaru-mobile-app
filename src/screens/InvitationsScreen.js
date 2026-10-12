import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Card, Button, Muted, Row, Badge, Empty, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { startLabel } from '../utils';
import { colors } from '../theme';

export default function InvitationsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // READ invitations I received
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invitations/received');
      setItems(data.invitations);
    } catch (e) {
      Alert.alert('Could not load', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // UPDATE: accept (creates an application) or decline
  const respond = async (inv, status) => {
    try {
      const { data } = await api.put(`/invitations/${inv._id}`, { status });
      if (status === 'accepted' && data.application) navigation.navigate('ApplicationSent', { applicationId: data.application._id });
      else load();
    } catch (e) {
      Alert.alert('Failed', errMsg(e));
    }
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(i) => i._id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListEmptyComponent={<Empty text="No invitations yet. Employers can invite you from the Find Workers screen." />}
      renderItem={({ item: i }) => (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{i.job.title}</Text>
              <Muted>{i.employer?.companyName || i.employer?.fullName} • {[i.job.town, i.job.district].filter(Boolean).join(', ')}</Muted>
              <Muted>{startLabel(i.job.startDate)} • {money(i.job.dailyWage)} / day</Muted>
            </View>
            <Badge text={i.status.toUpperCase()} tone={i.status === 'accepted' ? 'green' : i.status === 'declined' ? 'red' : 'orange'} />
          </Row>
          {i.message ? <Text style={{ marginTop: 6, fontStyle: 'italic' }}>“{i.message}”</Text> : null}
          {i.status === 'pending' ? (
            <Row style={{ marginTop: 10 }}>
              <Button title="Accept & Apply" small onPress={() => respond(i, 'accepted')} style={{ marginRight: 8 }} />
              <Button title="Decline" small variant="outline" onPress={() => respond(i, 'declined')} />
            </Row>
          ) : null}
        </Card>
      )}
    />
  );
}
