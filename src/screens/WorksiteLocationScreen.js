// Prototype screen: Worksite Location (access details, transit, roll-call)
import React from 'react';
import { View, Text, Linking } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, useLoad, money, run } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function WorksiteLocationScreen({ route }) {
  const { id } = route.params;
  const { user } = useAuth();
  const { data: j, loading, error, reload } = useLoad(() => api.get(`/jobs/${id}`), [id]);
  const me = j?.roster.find((r) => r.worker._id === user._id);

  const arrive = () => run(async () => { await api.post(`/jobs/${id}/checkin`, { value: !me.checkedIn }); reload(); }, 'Roll-call failed');
  const maps = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.location || '')}`);

  return (
    <Screen title="Worksite Location" loading={loading} error={error} onRefresh={reload}
      footer={<Row style={{ gap: 8 }}><Btn title="Open in Google Maps" icon="map" variant="amber" onPress={maps} style={{ flex: 1 }} />
        {me && <Btn title={me.checkedIn ? 'Checked in ✓' : 'I Have Arrived'} variant={me.checkedIn ? 'green' : 'primary'} onPress={arrive} style={{ flex: 1 }} />}</Row>}>
      {j && (<>
        <Card style={{ backgroundColor: C.blueBg }}>
          <Row style={{ justifyContent: 'space-between' }}><Badge text="GUARANTEED" /><Text style={{ fontWeight: '800', color: C.primary, fontSize: 18 }}>{money(j.dailyWage)}</Text></Row>
          <Text style={{ fontWeight: '800', fontSize: 17, marginTop: 6 }}>{j.title}</Text>
          <Muted>{j.startTime} – {j.endTime} • Escrow {j.escrowLocked ? 'locked' : 'released'}</Muted>
        </Card>
        <H>Arrival & Access Details</H>
        <Card>
          <Muted>Exact address</Muted><Text style={{ fontWeight: '700', marginBottom: 8 }}>{j.location || 'Not set'}</Text>
          <Muted>Designated worker entry</Muted><Text style={{ fontWeight: '700', marginBottom: 8 }}>{j.gate || 'Main gate'}</Text>
          <Muted>Access notes</Muted><Text style={{ marginBottom: 8 }}>{j.accessNotes || 'Show your Vedakaru ID to the site supervisor.'}</Text>
          {j.employer.phone ? <Btn small title={`Call ${j.employer.businessName || 'Supervisor'}`} icon="call" variant="soft" onPress={() => Linking.openURL(`tel:${j.employer.phone.replace(/\s/g, '')}`)} /> : null}
        </Card>
        <H>Transit & Parking</H>
        <Card><Text>{j.transit || 'No transit tips provided by the employer.'}</Text></Card>
        <H>Site Rules & Amenities</H>
        <Card>{['Mandatory PPE & tools: hard hat provided at gate', 'Gate check-in with your Vedakaru ID', 'Complimentary morning tea'].map((t) => <Text key={t} style={{ paddingVertical: 4 }}>• {t}</Text>)}</Card>
        <H>Roll-Call ({j.roster.filter((r) => r.checkedIn).length}/{j.roster.length})</H>
        {j.roster.map((r) => <Card key={r.worker._id}><Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '700' }}>{r.worker.name}</Text><Badge text={r.checkedIn ? 'ON SITE' : 'NOT YET'} color={r.checkedIn ? C.green : C.muted} bg={r.checkedIn ? C.greenBg : '#E5E7EB'} /></Row></Card>)}
      </>)}
    </Screen>
  );
}
