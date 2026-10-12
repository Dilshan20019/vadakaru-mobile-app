// Prototype screen: Applicant Profile (match, track record, skills, reviews, hire)
import React from 'react';
import { View, Text, Linking } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, Avatar, Stars, Stat, useLoad, money, run } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function ApplicantProfileScreen({ route, navigation }) {
  const { workerId, jobId } = route.params;
  const { data, loading, error, reload } = useLoad(() => api.get(`/workers/${workerId}${jobId ? `?job=${jobId}` : ''}`), [workerId, jobId]);
  const w = data?.worker;
  const toggle = () => run(async () => { await api.post('/shortlist/toggle', { jobId, workerId }); reload(); });

  return (
    <Screen title="Applicant Profile" loading={loading} error={error} onRefresh={reload}
      footer={w && <Row style={{ gap: 8 }}>
        <Btn title="📞" variant="soft" onPress={() => Linking.openURL(`tel:${(w.phone || '').replace(/\s/g, '')}`)} />
        <Btn title="Chat" variant="soft" icon="chatbubble" onPress={() => navigation.navigate('Chat', { userId: workerId, jobId })} />
        {jobId && <Btn title={`Hire for Shift (${money(w.dailyRate)}/day)`} variant="amber" onPress={() => navigation.navigate('ConfirmHire', { workerId, jobId })} style={{ flex: 1 }} />}
      </Row>}>
      {w && (<>
        <Card>
          <Row>
            <Avatar name={w.name} size={60} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 19, fontWeight: '800' }}>{w.name}</Text><Muted>{w.trade}</Muted>
              <Row style={{ marginTop: 4, gap: 6 }}>{w.verified && <Badge text="Verified" icon="checkmark" />}{w.nvq ? <Badge text={w.nvq} color={C.primary} bg={C.blueBg} /> : null}</Row>
            </View>
            {jobId && <Text onPress={toggle} style={{ fontSize: 24 }}>{data.shortlisted ? '🔖' : '📑'}</Text>}
          </Row>
          {jobId && <Badge text={`${data.match}% match for this shift`} color={C.primary} bg={C.blueBg} />}
          <Muted style={{ marginTop: 6 }}>{w.available ? '● Available tomorrow' : '● Currently unavailable'} • {w.location} • {w.distanceKm ?? '-'} km away</Muted>
          <Row style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {w.policeCleared && <Badge text="Police Cleared" icon="shield-checkmark" />}
            <Badge text={`${w.yearsExp} yrs experience`} color={C.muted} bg="#EEF1F7" />
          </Row>
        </Card>

        <Card style={{ backgroundColor: C.blueBg }}>
          <Muted>Requested shift wage</Muted>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.primary }}>{money(w.dailyRate)}</Text>
          <Muted>Standard overtime applies after 8 hours • Escrow protected</Muted>
        </Card>

        <H>Performance Track Record</H>
        <Row style={{ gap: 10, marginBottom: 12 }}>
          <Stat value={w.rating || '-'} label="Overall Client Score" icon="star" color={C.amber} />
          <Stat value={`${w.onTimePct}%`} label="On-Time Check-in" icon="time" color={C.green} />
          <Stat value={w.jobsDone} label="Total Days Worked" icon="briefcase" />
        </Row>

        <H>Verified Skills & Specialties</H>
        <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>{(w.skills || []).map((s) => <Badge key={s} text={s} color={C.primary} bg={C.blueBg} />)}</Row>

        <Row style={{ justifyContent: 'space-between' }}><H>Recent Employer Reviews</H><Text onPress={() => navigation.navigate('WorkerRatings', { workerId })} style={{ color: C.primary, fontWeight: '800' }}>See all</Text></Row>
        {data.reviews.length ? data.reviews.map((r) => (
          <Card key={r._id}><Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800' }}>{r.author?.businessName || r.author?.name}</Text><Stars value={r.stars} size={14} /></Row>{r.note ? <Muted style={{ marginTop: 4 }}>{r.note}</Muted> : null}</Card>
        )) : <Muted>No reviews yet.</Muted>}
      </>)}
    </Screen>
  );
}
