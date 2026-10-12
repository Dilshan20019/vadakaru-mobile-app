// Prototype screen: Report a Problem (type, description, screenshot, related job) + my reports (edit / delete)
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Field, PickerModal, useLoad, pickImage, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { PROBLEM_TYPES } from '../constants';
import { C } from '../theme';

export default function ReportProblemScreen() {
  const { user } = useAuth();
  const [type, setType] = useState('Payment Issue');
  const [desc, setDesc] = useState('');
  const [shot, setShot] = useState(null);
  const [job, setJob] = useState(null);
  const [pick, setPick] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const [reports, jobs] = await Promise.all([api.get('/reports'), api.get(user.role === 'employer' ? '/jobs' : '/jobs?mine=1&status=published,in_progress,completed')]);
    return { reports, jobs };
  });

  const reset = () => { setType('Payment Issue'); setDesc(''); setShot(null); setJob(null); setEditing(null); };
  const submit = () => run(async () => {
    setBusy(true);
    if (editing) await api.put(`/reports/${editing}`, { type, description: desc });
    else await api.post('/reports', { type, description: desc, screenshot: shot || undefined, jobId: job?._id });
    reset(); reload();
  }, 'Could not submit').finally(() => setBusy(false));
  const edit = (r) => { setEditing(r._id); setType(r.type); setDesc(r.description); setJob(r.job); };
  const del = (r) => confirm('Delete report?', r.type, 'Delete', () => run(async () => { await api.del(`/reports/${r._id}`); if (editing === r._id) reset(); reload(); }));
  const attach = async () => { const img = await pickImage(); if (img) setShot(img); };

  return (
    <Screen title="Report a Problem" loading={loading} error={error} onRefresh={reload}>
      <Muted style={{ textAlign: 'center', marginBottom: 10 }}>Help us improve Vedakaru. Helpline 1920</Muted>
      <H>Problem Type</H>
      <Row style={{ flexWrap: 'wrap' }}>{PROBLEM_TYPES.map((t) => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />)}</Row>
      <Field label={`Description (${desc.length}/500)`} multiline maxLength={500} value={desc} onChangeText={setDesc} placeholder="Tell us what went wrong..." />
      {!editing && (<>
        <Text style={s.label}>Screenshot (Optional)</Text>
        <TouchableOpacity onPress={attach} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12, backgroundColor: '#fff' }}>
          {shot ? <Image source={{ uri: shot }} style={{ width: 120, height: 120, borderRadius: 10 }} /> : (<><Ionicons name="cloud-upload-outline" size={30} color={C.primary} /><Text style={{ fontWeight: '700', marginTop: 4 }}>Add screenshot</Text><Muted>PNG, JPG</Muted></>)}
        </TouchableOpacity>
        {shot && <Text onPress={() => setShot(null)} style={{ color: C.danger, fontWeight: '700', marginBottom: 8 }}>Remove screenshot</Text>}
        <Text style={s.label}>Related Job / Application</Text>
        <TouchableOpacity onPress={() => setPick(true)} style={{ backgroundColor: '#F1F4FB', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border }}><Text>{job ? job.title : 'None selected'}</Text></TouchableOpacity>
      </>)}
      <Muted style={{ marginBottom: 8 }}>ⓘ Your report will be reviewed within 24 hours and kept confidential.</Muted>
      <Btn title={editing ? 'Save Changes' : 'Submit Report'} loading={busy} disabled={desc.trim().length < 10} onPress={submit} />
      {editing && <Btn title="Cancel Edit" variant="soft" onPress={reset} />}

      <H style={{ marginTop: 16 }}>My Reports</H>
      {data?.reports.length ? data.reports.map((r) => (
        <Card key={r._id}>
          <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800' }}>{r.type}</Text><Badge text={r.status.replace('_', ' ').toUpperCase()} color={C.primary} bg={C.blueBg} /></Row>
          <Text style={{ marginTop: 4 }}>{r.description}</Text>
          <Muted>{r.job?.title ? `${r.job.title} • ` : ''}{new Date(r.createdAt).toLocaleDateString()}</Muted>
          <Row style={{ gap: 8 }}>{r.status !== 'closed' && <Btn small title="Edit" variant="soft" onPress={() => edit(r)} style={{ flex: 1 }} />}<Btn small title="Delete" variant="danger" onPress={() => del(r)} style={{ flex: 1 }} /></Row>
        </Card>)) : <Muted>You have not submitted any reports.</Muted>}
      <PickerModal visible={pick} title="Related job" items={[{ key: 'none', label: 'None' }, ...(data?.jobs || []).map((j) => ({ key: j._id, label: j.title, sub: j.location, j }))]}
        onPick={(it) => { setJob(it.j || null); setPick(false); }} onClose={() => setPick(false)} />
    </Screen>
  );
}
const s = { label: { fontSize: 12.5, fontWeight: '700', color: C.text, marginBottom: 5 } };
