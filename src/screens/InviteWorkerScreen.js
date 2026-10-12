import React, { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Screen, Card, Field, Button, Chip, ChipRow, Muted, Row, Badge, Empty } from '../components/ui';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

export default function InviteWorkerScreen() {
  const { worker: workerParam, jobId: jobIdParam } = useLocalSearchParams();
  const serializedWorker = Array.isArray(workerParam) ? workerParam[0] : workerParam;
  const worker = JSON.parse(serializedWorker);
  const initialJobId = Array.isArray(jobIdParam) ? jobIdParam[0] : jobIdParam;
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState(initialJobId || null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState([]);
  const [busy, setBusy] = useState(false);

  // READ my open jobs and the invitations already sent to this worker
  const load = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([api.get('/jobs/mine'), api.get('/invitations/sent')]);
      const open = j.data.jobs.filter((x) => x.status === 'open');
      setJobs(open);
      setJobId((cur) => cur || open[0]?._id || null);
      setSent(s.data.invitations.filter((i) => i.worker?._id === worker._id));
    } catch (e) {
      Alert.alert('Could not load', errMsg(e));
    }
  }, [worker._id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // CREATE invitation
  const send = async () => {
    if (!jobId) return Alert.alert('Choose a job', 'Select the open job you want to invite this worker to.');
    setBusy(true);
    try {
      await api.post('/invitations', { worker: worker._id, job: jobId, message });
      setMessage('');
      Alert.alert('Invitation sent', `${worker.fullName} will see your invitation in the app.`);
      load();
    } catch (e) {
      Alert.alert('Could not send', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // DELETE invitation
  const cancel = (inv) =>
    Alert.alert('Cancel invitation', 'Withdraw this invitation?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel invitation', style: 'destructive', onPress: async () => { try { await api.delete(`/invitations/${inv._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); } } },
    ]);

  // UPDATE message of a pending invitation (reuses the text box)
  const editMessage = async (inv) => {
    if (!message.trim()) return Alert.alert('Type the new message first', 'Write the new text in the message box, then tap Update message.');
    try { await api.patch(`/invitations/${inv._id}`, { message }); setMessage(''); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
  };

  return (
    <Screen footer={<Button title="Send Invitation" icon="paper-plane-outline" onPress={send} loading={busy} disabled={!jobs.length} />}>
      <Card>
        <Text style={{ fontWeight: '800', fontSize: 17 }}>{worker.fullName}</Text>
        <Muted>{worker.primaryTrade} • {worker.experienceYears} yrs • {[worker.nearestTown, worker.homeDistrict].filter(Boolean).join(', ')}</Muted>
      </Card>

      <Text style={{ fontWeight: '800', marginBottom: 6 }}>Invite to which job?</Text>
      {jobs.length === 0 ? <Empty text="You have no open jobs. Post a job first." /> : null}
      <ChipRow>{jobs.map((j) => <Chip key={j._id} label={j.title.length > 30 ? `${j.title.slice(0, 30)}…` : j.title} selected={jobId === j._id} onPress={() => setJobId(j._id)} />)}</ChipRow>
      <Field label="Message (optional)" value={message} onChangeText={setMessage} multiline placeholder="Start date, site details, anything the worker should know" style={{ marginTop: 10 }} />

      {sent.length ? <Text style={{ fontWeight: '800', marginBottom: 6 }}>Invitations already sent</Text> : null}
      {sent.map((inv) => (
        <Card key={inv._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{inv.job?.title}</Text>
              {inv.message ? <Muted>“{inv.message}”</Muted> : null}
            </View>
            <Badge text={inv.status.toUpperCase()} tone={inv.status === 'accepted' ? 'green' : inv.status === 'declined' ? 'red' : 'orange'} />
          </Row>
          {inv.status === 'pending' ? (
            <Row style={{ marginTop: 8 }}>
              <Button title="Update message" small variant="soft" onPress={() => editMessage(inv)} style={{ marginRight: 8 }} />
              <Button title="Cancel" small variant="danger" onPress={() => cancel(inv)} />
            </Row>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
