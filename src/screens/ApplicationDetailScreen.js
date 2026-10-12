import React, { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Screen, Card, Field, Button, Muted, Row, Badge, Loading, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { dateTimeLabel } from '../utils';
import { colors } from '../theme';

const LABEL = { pending: 'Pending Review', shortlisted: 'Shortlisted', accepted: 'Accepted', rejected: 'Not Selected', filled: 'Position Filled' };
const TONE = { pending: 'orange', shortlisted: 'blue', accepted: 'green', rejected: 'red', filled: 'red' };

export default function ApplicationDetailScreen({ navigation, route }) {
  const { applicationId } = route.params;
  const [app, setApp] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // READ
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/${applicationId}`);
      setApp(data.application);
      setNote(data.application.note || '');
    } catch (e) {
      Alert.alert('Could not load', errMsg(e));
    }
  }, [applicationId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!app) return <Loading />;
  const job = app.job;
  const emp = job.employer || {};

  // UPDATE proposal note
  const saveNote = async () => {
    setBusy(true);
    try {
      await api.put(`/applications/${applicationId}`, { note });
      Alert.alert('Saved', 'Your note was updated.');
    } catch (e) {
      Alert.alert('Failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // DELETE withdraw
  const withdraw = () =>
    Alert.alert('Withdraw application', `Withdraw from "${job.title}"?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: async () => { try { await api.delete(`/applications/${applicationId}`); navigation.goBack(); } catch (e) { Alert.alert('Cannot withdraw', errMsg(e)); } } },
    ]);

  return (
    <Screen
      footer={
        <>
          <Button title="View Original Posting" variant="outline" onPress={() => navigation.navigate('JobDetail', { jobId: job._id })} />
          <Button title="Withdraw Application" variant="danger" small onPress={withdraw} style={{ marginTop: 8 }} />
        </>
      }
    >
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '900', fontSize: 17, flex: 1 }}>{job.title}</Text>
          <Badge text={LABEL[app.status]} tone={TONE[app.status]} />
        </Row>
        <Muted>{emp.companyName || emp.fullName}</Muted>
        {[
          ['Contract ID', app.refCode],
          ['Wage', `${money(job.dailyWage)} / day`],
          ['Location', [job.town, job.district].filter(Boolean).join(', ')],
          ['Applied', dateTimeLabel(app.createdAt)],
        ].map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border, marginTop: 6 }}>
            <Muted>{k}</Muted><Text style={{ fontWeight: '700' }}>{v}</Text>
          </Row>
        ))}
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', marginBottom: 6 }}>Your proposal note</Text>
        <Field value={note} onChangeText={setNote} multiline maxLength={300} placeholder="Tell the employer why you are a good fit" hint={`${note.length}/300`} />
        <Button title="Save Note" small variant="soft" onPress={saveNote} loading={busy} />
      </Card>
    </Screen>
  );
}
