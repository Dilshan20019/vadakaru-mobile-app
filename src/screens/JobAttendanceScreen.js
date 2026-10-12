import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Muted, Row, Badge, Loading, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone, openMaps, timeLabel, todayStr } from '../utils';
import { colors } from '../theme';

const GEAR = ['Hard hat', 'Safety shoes', 'Gloves', 'Own tools packed'];

export default function JobAttendanceScreen({ route }) {
  const { applicationId } = route.params;
  const [app, setApp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [gear, setGear] = useState({});

  // READ attendance
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setApp(data.application);
    } catch (e) { Alert.alert('Could not load', errMsg(e)); }
  }, [applicationId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (path) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/applications/${applicationId}/${path}`);
      setApp((cur) => ({ ...cur, attendance: data.application.attendance }));
    } catch (e) { Alert.alert('Attendance', errMsg(e)); }
    finally { setBusy(false); }
  };

  if (!app) return <Loading />;
  const job = app.job;
  const emp = job.employer || {};
  const today = app.attendance?.find((a) => a.date === todayStr());

  return (
    <Screen>
      <Card tone="blue">
        <Badge text="SHIFT IN PROGRESS" tone="green" />
        <Text style={{ fontSize: 20, fontWeight: '900', marginTop: 6 }}>{job.title}</Text>
        <Muted>{emp.companyName || emp.fullName} • {[job.town, job.district].filter(Boolean).join(', ')}</Muted>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary, marginTop: 6 }}>{money(job.dailyWage)} <Text style={{ fontSize: 12 }}>/ day</Text></Text>
      </Card>

      <Card>
        <SectionTitle icon="location-outline">Worksite Geofence</SectionTitle>
        <Muted>Check in when you reach the site gate. Your phone's location confirms you are on site.</Muted>
        <Button title="Open Site Map" icon="navigate-outline" variant="outline" small onPress={() => openMaps(job.lat, job.lng)} style={{ marginTop: 8 }} />
      </Card>

      <Card>
        <SectionTitle icon="qr-code-outline">Roll-Call Check-in</SectionTitle>
        <View style={{ alignItems: 'center', padding: 14, backgroundColor: colors.bg, borderRadius: 12, marginBottom: 12 }}>
          <Muted>Gate pass code</Muted>
          <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary }}>#{app.refCode}</Text>
        </View>
        {!today ? (
          <Button title="Tap to Confirm Morning Check-in" icon="log-in-outline" variant="accent" loading={busy} onPress={() => run('checkin')} />
        ) : !today.checkOutAt ? (
          <>
            <Row style={{ marginBottom: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: '700' }}>Checked in at {timeLabel(today.checkInAt)}</Text>
            </Row>
            <Button title="Check-out & Request Daily Wage" icon="log-out-outline" loading={busy} onPress={() => run('checkout')} />
          </>
        ) : (
          <Row>
            <Ionicons name="trophy" size={22} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={{ fontWeight: '700', flex: 1 }}>Shift complete: {timeLabel(today.checkInAt)} – {timeLabel(today.checkOutAt)}. Daily wage released from escrow.</Text>
          </Row>
        )}
      </Card>

      <Card>
        <SectionTitle icon="shield-checkmark-outline">Daily Safety & Gear Checklist</SectionTitle>
        {GEAR.map((g) => (
          <TouchableOpacity key={g} onPress={() => setGear((p) => ({ ...p, [g]: !p[g] }))} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name={gear[g] ? 'checkbox' : 'square-outline'} size={22} color={gear[g] ? colors.primary : colors.muted} style={{ marginRight: 10 }} />
            <Text style={{ fontWeight: '600' }}>{g}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="calendar-outline">Attendance History</SectionTitle>
        {app.attendance?.length ? app.attendance.map((a) => (
          <Row key={a._id} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
            <Text style={{ fontWeight: '700' }}>{a.date}</Text>
            <Muted>{timeLabel(a.checkInAt)} → {a.checkOutAt ? timeLabel(a.checkOutAt) : 'on site'}</Muted>
          </Row>
        )) : <Muted>No check-ins recorded yet.</Muted>}
      </Card>

      <Card>
        <SectionTitle icon="person-outline">Site Supervisor Contact</SectionTitle>
        <Text style={{ fontWeight: '700' }}>{emp.fullName}</Text>
        <Muted>{emp.companyName}</Muted>
        <Button title="Call Supervisor" icon="call" small onPress={() => callPhone(emp.phone)} style={{ marginTop: 8 }} />
        <Muted style={{ marginTop: 10 }}>Attendance or wage dispute? Call 1388.</Muted>
      </Card>
    </Screen>
  );
}
