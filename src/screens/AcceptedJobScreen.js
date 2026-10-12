import React, { useCallback, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Muted, Row, Badge, SectionTitle, Loading, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone, openMaps, startLabel } from '../utils';
import { colors } from '../theme';

const SAFETY = ['Wear safety boots and a helmet', 'Carry your NIC for the gate check', 'Bring drinking water and a hand towel'];

export default function AcceptedJobScreen({ navigation, route }) {
  const { applicationId } = route.params;
  const [app, setApp] = useState(null);

  // READ accepted application
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setApp(data.application);
    } catch (e) {
      Alert.alert('Could not load', errMsg(e));
    }
  }, [applicationId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!app) return <Loading />;
  const job = app.job;
  const emp = job.employer || {};

  // UPDATE wake-up reminder flag
  const toggleReminder = async (v) => {
    setApp({ ...app, reminder: v });
    try { await api.put(`/applications/${applicationId}`, { reminder: v }); } catch (e) { setApp({ ...app, reminder: !v }); Alert.alert('Failed', errMsg(e)); }
  };

  // DELETE: cancel (server enforces the 4-hour notice rule)
  const cancel = () =>
    Alert.alert('Cancel this shift?', 'You must cancel at least 4 hours before the start time. Repeated late cancellations lower your rating.', [
      { text: 'Keep shift', style: 'cancel' },
      {
        text: 'Cancel shift', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/applications/${applicationId}`); navigation.goBack(); } catch (e) { Alert.alert('Cannot cancel', errMsg(e)); }
        },
      },
    ]);

  const chat = () =>
    Alert.alert('In-app chat', 'In-app chat is not part of this version. Call the site manager instead?', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Call', onPress: () => callPhone(emp.phone) },
    ]);

  return (
    <Screen
      footer={
        <>
          <Button title="Go to Attendance" icon="location-outline" onPress={() => navigation.navigate('JobAttendance', { applicationId })} />
          <Button title="Cancel Shift (4h notice)" variant="danger" small onPress={cancel} style={{ marginTop: 8 }} />
        </>
      }
    >
      <Card tone="blue">
        <Row>
          <Ionicons name="checkmark-circle" size={36} color={colors.success} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900' }}>You’re Hired!</Text>
            <Muted>{emp.companyName || emp.fullName} accepted your application • Ref #{app.refCode}</Muted>
          </View>
        </Row>
      </Card>

      <Card>
        <Text style={{ fontWeight: '900', fontSize: 17 }}>{job.title}</Text>
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <View><Muted>Agreed wage</Muted><Text style={{ fontWeight: '900', fontSize: 20, color: colors.primary }}>{money(job.dailyWage)} <Text style={{ fontSize: 12, color: colors.muted }}>/ day</Text></Text></View>
          <View style={{ alignItems: 'flex-end' }}><Muted>{startLabel(job.startDate)}</Muted><Text style={{ fontWeight: '800' }}>Report by {job.shiftStart || '07:30'}</Text></View>
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="map-outline">Worksite</SectionTitle>
        <Text style={{ fontWeight: '700' }}>{[job.town, job.district].filter(Boolean).join(', ')}</Text>
        <Row style={{ marginTop: 8 }}>
          <Button title="Live Map" icon="navigate-outline" small variant="soft" onPress={() => openMaps(job.lat, job.lng)} style={{ marginRight: 8 }} />
          <Button title="Open Chat" icon="chatbubble-outline" small variant="outline" onPress={chat} style={{ marginRight: 8 }} />
          <Button title="Call" icon="call" small onPress={() => callPhone(emp.phone)} />
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="shield-checkmark-outline">Arrival & Safety Requirements</SectionTitle>
        {[...(job.requirements || []), ...SAFETY].map((r) => (
          <Row key={r} style={{ marginVertical: 2 }}><Ionicons name="checkmark" size={16} color={colors.success} style={{ marginRight: 6 }} /><Text style={{ flex: 1 }}>{r}</Text></Row>
        ))}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><Text style={{ fontWeight: '800' }}>Wake-up reminder</Text><Muted>Remind me before the first shift</Muted></View>
          <Switch value={!!app.reminder} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>

      <Button title="View Application Details" variant="outline" onPress={() => navigation.navigate('ApplicationDetail', { applicationId })} />
    </Screen>
  );
}
