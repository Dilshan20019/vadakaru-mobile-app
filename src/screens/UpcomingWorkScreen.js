import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, SectionTitle, Button, Muted, Row, Badge, Empty, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone, dayStr, openMaps, startLabel, todayStr } from '../utils';
import { colors } from '../theme';

function Shift({ a, big, router, onCancel }) {
  const j = a.job;
  const checkedIn = a.attendance?.some((x) => x.date === todayStr());
  return (
    <Card tone={big ? 'blue' : undefined}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {big ? <Badge text={`NEXT SHIFT • ${startLabel(j.startDate)}`} tone="green" /> : <Badge text={startLabel(j.startDate)} tone="blue" />}
          <Text style={{ fontSize: big ? 19 : 16, fontWeight: '900', marginTop: 6 }}>{j.title}</Text>
          <Muted>{j.employer?.companyName || j.employer?.fullName} • {[j.town, j.district].filter(Boolean).join(', ')}</Muted>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '900', fontSize: big ? 20 : 16, color: colors.primary }}>{money(j.dailyWage)}</Text>
          <Muted>{j.days} day(s) • {j.shiftStart}</Muted>
        </View>
      </Row>

      {big ? (
        <TouchableOpacity onPress={() => Alert.alert('Digital Gate Pass', `Show this code to the site supervisor:\n\n#${a.refCode}`)} style={{ marginTop: 10, backgroundColor: '#fff', borderRadius: 10, padding: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View><Muted>DIGITAL GATE PASS</Muted><Text style={{ fontWeight: '900', fontSize: 18, color: colors.primary }}>#{a.refCode}</Text></View>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>View Pass ›</Text>
          </Row>
        </TouchableOpacity>
      ) : null}

      <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
        <Button title={checkedIn ? 'Attendance ✓' : 'Check-in'} icon="qr-code-outline" small variant="accent" onPress={() => router.push({ pathname: '/JobAttendance', params: { applicationId: a._id } })} style={{ marginRight: 8, marginBottom: 6 }} />
        <Button title="Directions" icon="navigate-outline" small variant="soft" onPress={() => openMaps(j.lat, j.lng)} style={{ marginRight: 8, marginBottom: 6 }} />
        <Button title="Call Staff" icon="call-outline" small variant="outline" onPress={() => callPhone(j.employer?.phone)} style={{ marginRight: 8, marginBottom: 6 }} />
        <Button title="Cancel" small variant="danger" onPress={() => onCancel(a)} style={{ marginBottom: 6 }} />
      </Row>
    </Card>
  );
}

export default function UpcomingWorkScreen() {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);

  // READ confirmed shifts
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/jobs/applications/mine', { params: { status: 'accepted' } });
      setApps(data.applications);
    } catch (e) {
      Alert.alert('Could not load shifts', errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sorted = useMemo(() => [...apps].sort((a, b) => (a.job.startDate || '9999').localeCompare(b.job.startDate || '9999')), [apps]);
  const [next, ...later] = sorted;
  const thisWeek = apps.filter((a) => !a.job.startDate || a.job.startDate <= dayStr(6));
  const guaranteed = thisWeek.reduce((s, a) => s + a.job.dailyWage * a.job.days, 0);

  // UPDATE: tick a tool-prep item (saved on the server so it survives restarts)
  const toggleTool = async (a, t) => {
    const done = !t.done;
    setApps((cur) => cur.map((x) => (x._id !== a._id ? x : { ...x, toolPrep: x.toolPrep.map((y) => (y._id === t._id ? { ...y, done } : y)) })));
    try {
      await api.put(`/applications/${a._id}`, { toolPrep: [{ _id: t._id, done }] });
    } catch (e) {
      Alert.alert('Could not save', errMsg(e));
      load();
    }
  };

  // DELETE: cancel a confirmed shift
  const cancelShift = (a) =>
    Alert.alert('Cancel shift', `Cancel "${a.job.title}"? The employer will be able to fill your place.`, [
      { text: 'Keep shift', style: 'cancel' },
      {
        text: 'Cancel shift', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/applications/${a._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  const prep = next?.toolPrep || [];
  const ready = prep.filter((t) => t.done).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Card tone="orange">
          <Muted style={{ fontWeight: '700' }}>THIS WEEK • {thisWeek.length} CONFIRMED SHIFT(S)</Muted>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>{money(guaranteed)}</Text>
          <Muted>Total guaranteed wages (escrow protected)</Muted>
        </Card>

        {!next ? <Empty text="No confirmed shifts yet. Apply for jobs and they will appear here once accepted." /> : (
          <>
            <SectionTitle icon="flash-outline">Next Shift Ready</SectionTitle>
            <Shift a={next} big router={router} onCancel={cancelShift} />

            {prep.length ? (
              <Card>
                <SectionTitle icon="construct-outline" right={<Badge text={`${ready} of ${prep.length} ready`} tone={ready === prep.length ? 'green' : 'orange'} />}>Tool Prep Checklist</SectionTitle>
                {prep.map((t) => (
                  <TouchableOpacity key={t._id} onPress={() => toggleTool(next, t)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                    <Ionicons name={t.done ? 'checkbox' : 'square-outline'} size={22} color={t.done ? colors.primary : colors.muted} style={{ marginRight: 10 }} />
                    <Text style={{ flex: 1, fontWeight: '600', textDecorationLine: t.done ? 'line-through' : 'none', color: t.done ? colors.muted : colors.text }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            ) : null}

            {later.length ? <SectionTitle icon="calendar-outline">Later Bookings</SectionTitle> : null}
            {later.map((a) => <Shift key={a._id} a={a} router={router} onCancel={cancelShift} />)}
          </>
        )}

        <Button title="Manage Availability Calendar" icon="calendar-outline" variant="outline" onPress={() => router.push('/Availability')} style={{ marginTop: 6 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
