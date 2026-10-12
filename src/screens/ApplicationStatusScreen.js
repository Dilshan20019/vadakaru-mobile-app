import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Field, Muted, Row, Badge, Loading, money } from '../components/ui';
import { useJobActions } from '../hooks/useJobActions';
import api, { errMsg } from '../api/client';
import { callPhone, openMaps, dateTimeLabel, startLabel } from '../utils';
import { colors } from '../theme';

const BANNER = {
  pending: { tone: 'orange', title: 'Pending Employer Review', sub: 'Most contractors reply within 30 minutes on working days.' },
  shortlisted: { tone: 'blue', title: "You're Shortlisted", sub: 'The employer viewed your profile and is finalising the crew.' },
  accepted: { tone: 'green', title: "You're Booked!", sub: 'Your shift is confirmed. Call the site manager for arrival details.' },
  rejected: { tone: 'red', title: 'Not Selected This Time', sub: 'Don’t worry — similar shifts are waiting below.' },
  filled: { tone: 'red', title: 'Position Filled', sub: 'Another craftsman was confirmed. See replacement shifts below.' },
};

export default function ApplicationStatusScreen() {
  const router = useRouter();
  const { applicationId } = useLocalSearchParams();
  const [app, setApp] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // READ application detail
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setApp(data.application);
      setSimilar(data.similarJobs);
      setNote(data.application.note || '');
    } catch (e) {
      Alert.alert('Could not load', errMsg(e), [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [applicationId, router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { apply } = useJobActions(load);

  // UPDATE note to employer
  const saveNote = async () => {
    setSaving(true);
    try {
      await api.put(`/applications/${applicationId}`, { note });
      Alert.alert('Saved', 'Your note was sent to the employer.');
    } catch (e) { Alert.alert('Could not save note', errMsg(e)); }
    finally { setSaving(false); }
  };

  // DELETE (withdraw)
  const withdraw = () =>
    Alert.alert('Withdraw application', 'Withdraw from this job?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/applications/${applicationId}`); router.back(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  if (!app) return <Loading />;
  const job = app.job;
  const emp = job.employer || {};
  const b = BANNER[app.status];
  const closed = app.status === 'filled' || app.status === 'rejected';

  const steps = [
    ['Application received', dateTimeLabel(app.createdAt), true],
    ['Employer review', app.status === 'pending' ? 'In progress…' : 'Done', app.status !== 'pending'],
    ['Shortlisted / confirmed', app.status === 'accepted' ? 'Confirmed' : app.status === 'shortlisted' ? 'Shortlisted' : 'Waiting', app.status === 'accepted' || app.status === 'shortlisted'],
    ['Site check-in', app.attendance?.length ? 'Checked in' : 'After confirmation', !!app.attendance?.length],
  ];

  return (
    <Screen>
      <Card tone={b.tone === 'green' ? 'blue' : b.tone === 'orange' ? 'orange' : undefined} style={b.tone === 'red' ? { backgroundColor: colors.dangerSoft } : null}>
        <Badge text={b.title.toUpperCase()} tone={b.tone} />
        <Text style={{ fontSize: 20, fontWeight: '900', marginTop: 8 }}>{b.title}</Text>
        <Muted style={{ marginTop: 4 }}>{b.sub}</Muted>
        <Muted style={{ marginTop: 6, fontWeight: '700' }}>Ref #{app.refCode}</Muted>
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', fontSize: 16 }}>{job.title}</Text>
        <Muted>{emp.companyName || emp.fullName}{emp.brVerified ? ' ✓ Verified' : ''} • {[job.town, job.district].filter(Boolean).join(', ')}</Muted>
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <View><Muted>DAILY WAGE</Muted><Text style={{ fontWeight: '900', fontSize: 18, color: colors.primary }}>{money(job.dailyWage)}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Muted>TOTAL ({job.days} DAYS)</Muted><Text style={{ fontWeight: '900', fontSize: 18 }}>{money(job.dailyWage * job.days)}</Text></View>
        </Row>
        <Muted style={{ marginTop: 6 }}>{startLabel(job.startDate)} • {job.shiftStart}</Muted>
        {!closed && job.escrow ? <Muted style={{ marginTop: 6, color: colors.success, fontWeight: '700' }}>🔒 {money(job.dailyWage * job.days)} escrow-protected</Muted> : null}
      </Card>

      <Card>
        <SectionTitle icon="git-branch-outline">Shift Dispatch Tracker</SectionTitle>
        {steps.map(([t, d, done]) => (
          <Row key={t} style={{ paddingVertical: 6 }}>
            <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? colors.success : colors.muted} style={{ marginRight: 10 }} />
            <View><Text style={{ fontWeight: '700' }}>{t}</Text><Muted>{d}</Muted></View>
          </Row>
        ))}
      </Card>

      {app.status === 'accepted' ? (
        <Card tone="blue">
          <Muted style={{ fontWeight: '700' }}>DIGITAL GATE PASS</Muted>
          <Text style={{ fontSize: 30, fontWeight: '900', color: colors.primary }}>#{app.refCode}</Text>
          <Muted>Show this code to the site supervisor on arrival.</Muted>
          <Row style={{ marginTop: 10 }}>
            <Button title="Call Site" icon="call" small onPress={() => callPhone(emp.phone)} style={{ flex: 1, marginRight: 8 }} />
            <Button title="Directions" icon="navigate" small variant="outline" onPress={() => openMaps(job.lat, job.lng)} style={{ flex: 1 }} />
          </Row>
          <Button title="Job Attendance & Check-in" icon="qr-code-outline" variant="accent" onPress={() => router.push({ pathname: '/JobAttendance', params: { applicationId: String(applicationId) } })} style={{ marginTop: 8 }} />
        </Card>
      ) : null}

      {!closed ? (
        <Card>
          <SectionTitle icon="chatbubble-ellipses-outline">Note to Employer</SectionTitle>
          <Field value={note} onChangeText={setNote} multiline placeholder="e.g. I can bring my own laser level and start at 7:00 AM." />
          <Button title="Update Note" variant="outline" small onPress={saveNote} loading={saving} />
        </Card>
      ) : (
        <>
          <SectionTitle icon="flash-outline">Recommended Replacement Shifts</SectionTitle>
          {similar.length === 0 ? <Muted>No similar open shifts right now. We will alert you when one is posted.</Muted> : null}
          {similar.map((j) => (
            <Card key={j._id}>
              <Text style={{ fontWeight: '800' }}>{j.title}</Text>
              <Muted>{j.employer?.companyName || j.employer?.fullName} • {[j.town, j.district].filter(Boolean).join(', ')}</Muted>
              <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontWeight: '900', color: colors.primary }}>{money(j.dailyWage)} / day</Text>
                <Button title="Fast Apply" icon="flash" variant="accent" small onPress={() => apply(j)} />
              </Row>
            </Card>
          ))}
        </>
      )}

      <Button title={closed ? 'Remove From My List' : 'Withdraw Application'} variant="outline" small onPress={withdraw} style={{ marginTop: 6 }} />
      <Muted style={{ textAlign: 'center', marginTop: 12 }}>Need help? Worker Support Hotline 1388</Muted>
    </Screen>
  );
}
