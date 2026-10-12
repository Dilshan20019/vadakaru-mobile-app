// Prototype screen: Safety Center (SOS, hazards, incidents, PPE roll-call, protected escrow)
import React, { useState } from 'react';
import { View, Text, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Badge, Field, Empty, PickerModal, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function SafetyCenterScreen({ route, navigation }) {
  const { user } = useAuth();
  const emp = user.role === 'employer';
  const [mode, setMode] = useState(null); // 'hazard' | 'incident'
  const [note, setNote] = useState('');
  const [pickJob, setPickJob] = useState(false);
  const [jobId, setJobId] = useState(route.params?.jobId || null);
  const { data, loading, error, reload } = useLoad(async () => {
    const jobs = await api.get(`/jobs?${emp ? '' : 'mine=1&'}status=in_progress,published`);
    const job = jobs.find((j) => j._id === jobId) || jobs[0];
    const events = job ? await api.get(`/safety?job=${job._id}`) : [];
    return { jobs, job, events };
  }, [jobId]);
  const job = data?.job;

  const post = (kind, n = '') => run(async () => { const r = await api.post('/safety', { jobId: job._id, kind, note: n }); setMode(null); setNote(''); reload(); return r; }, 'Could not send');
  const sos = () => confirm('Trigger Site SOS?', 'This alerts the Vedakaru response team and emergency contacts for this site. Only use it in a real emergency.', 'Trigger SOS', async () => { await post('sos'); Linking.openURL('tel:1388'); });
  const ppe = (p) => emp && run(async () => { await api.put(`/jobs/${job._id}/ppe/${p.key}`, { checked: !p.checked }); reload(); });
  const resolve = (e) => run(async () => { await api.put(`/safety/${e._id}/resolve`); reload(); });
  const del = (e) => run(async () => { await api.del(`/safety/${e._id}`); reload(); });
  const KIND = { sos: '🚨 SOS', hazard: '⚠️ Hazard', incident: '🩹 Incident', ppe_request: '🦺 PPE request' };

  return (
    <Screen title="Safety Center" loading={loading} error={error} onRefresh={reload}>
      {!job ? <Empty icon="shield-outline" text="No active worksite to monitor yet." /> : (<>
        <TouchableOpacity onPress={() => setPickJob(true)}><Card style={{ backgroundColor: C.blueBg }}>
          <Row style={{ justifyContent: 'space-between' }}><Badge text="VERIFIED SITE" color={C.green} bg="#fff" /><Ionicons name="chevron-down" size={18} color={C.primary} /></Row>
          <Text style={{ fontWeight: '800', fontSize: 18, marginTop: 4 }}>{job.title}</Text><Muted>{job.location}</Muted>
          <Muted style={{ marginTop: 4 }}>Active crew: {job.roster.length} • Geofence lock 50 m • Safe & Active</Muted>
        </Card></TouchableOpacity>

        <TouchableOpacity onPress={sos} activeOpacity={0.85}>
          <Card style={{ backgroundColor: C.danger, borderColor: C.danger }}>
            <Row><Ionicons name="alert-circle" size={36} color="#fff" /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>INSTANT SOS DISPATCH</Text><Text style={{ color: '#FFE4E4' }}>Pings 119, 1990 Ambulance & Vedakaru Response</Text></View></Row>
          </Card>
        </TouchableOpacity>
        <Row style={{ gap: 8 }}>
          <Btn title="Dial 1388" icon="call" variant="soft" onPress={() => Linking.openURL('tel:1388')} style={{ flex: 1 }} />
          <Btn title="Trigger Site SOS" icon="warning" variant="danger" onPress={sos} style={{ flex: 1 }} />
        </Row>

        <H style={{ marginTop: 10 }}>Worksite Protection & Claims</H>
        <Card>
          <TouchableOpacity onPress={() => setMode(mode === 'incident' ? null : 'incident')} style={{ paddingVertical: 10 }}><Text style={{ fontWeight: '800' }}>Report Worksite Incident</Text><Muted>Injury, scaffolding hazard or near-miss</Muted></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('EscrowDispute', { jobId: job._id })} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: C.border }}><Text style={{ fontWeight: '800' }}>Wage & Work Dispute</Text><Muted>Contract breaches, overtime, escrow mediation</Muted></TouchableOpacity>
          <View style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: C.border }}><Text style={{ fontWeight: '800' }}>Accident Cover</Text><Muted>LKR 500,000 complimentary injury & hospitalization cover</Muted></View>
        </Card>
        {mode && (<Card><Field label={mode === 'hazard' ? 'Describe the hazard' : 'Describe the incident'} multiline value={note} onChangeText={setNote} /><Btn title="Submit" disabled={!note.trim()} onPress={() => post(mode, note)} /></Card>)}

        <H>Daily PPE Roll-Call ({job.ppe.filter((p) => p.checked).length}/{job.ppe.length} checked)</H>
        <Card>{job.ppe.map((p) => <TouchableOpacity key={p.key} onPress={() => ppe(p)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}><Ionicons name={p.checked ? 'checkbox' : 'square-outline'} size={22} color={p.checked ? C.green : C.muted} /><Text style={{ marginLeft: 8, flex: 1 }}>{p.label}</Text>{p.checked && <Badge text="Verified" />}</TouchableOpacity>)}</Card>
        <Btn title="Request Replacement PPE Gear" icon="shirt" variant="outline" onPress={() => post('ppe_request', 'Replacement PPE requested')} />
        <Btn title="Report Hazard" icon="alert" variant="soft" onPress={() => setMode(mode === 'hazard' ? null : 'hazard')} />

        <Card style={{ backgroundColor: C.greenBg, marginTop: 8 }}><Text style={{ fontWeight: '800' }}>Commercial Bank Protected Escrow</Text><Muted>{money(job.escrowLocked)} held for this shift • 100% payout trust</Muted></Card>

        <H>Safety Log</H>
        {data.events.length ? data.events.map((e) => (
          <Card key={e._id}>
            <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800' }}>{KIND[e.kind]}</Text><Badge text={e.status.toUpperCase()} color={e.status === 'active' ? C.danger : C.green} bg={e.status === 'active' ? C.dangerBg : C.greenBg} /></Row>
            {e.note ? <Text style={{ marginTop: 4 }}>{e.note}</Text> : null}
            <Muted>{e.author?.name || e.author?.businessName} • {new Date(e.createdAt).toLocaleString()}</Muted>
            {e.author?._id === user._id && <Row style={{ gap: 8 }}>{e.status === 'active' && <Btn small title="Mark resolved" variant="green" onPress={() => resolve(e)} />}<Btn small title="Delete" variant="danger" onPress={() => del(e)} /></Row>}
          </Card>)) : <Muted>No safety events logged for this shift.</Muted>}
      </>)}
      <PickerModal visible={pickJob} title="Select worksite" items={(data?.jobs || []).map((j) => ({ key: j._id, label: j.title, sub: j.location }))} onPick={(it) => { setJobId(it.key); setPickJob(false); }} onClose={() => setPickJob(false)} />
    </Screen>
  );
}
