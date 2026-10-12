import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Muted, Row, Badge, Chip, ChipRow, SectionTitle, Loading, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone, initials } from '../utils';
import { colors } from '../theme';

const DAY_TONE = { open: 'green', half: 'blue', ot: 'orange', off: 'red', booked: 'red' };
const DAY_LABEL = { open: 'Open', half: 'Half-day', ot: 'Evening OT', off: 'Off', booked: 'Booked' };

export default function WorkerProfileScreen() {
  const router = useRouter();
  const { workerId } = useLocalSearchParams();
  const [d, setD] = useState(null);

  // READ public profile
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/workers/${workerId}`);
      setD(data);
    } catch (e) {
      Alert.alert('Could not load profile', errMsg(e));
    }
  }, [workerId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!d) return <Loading />;
  const w = d.worker;

  // CREATE / DELETE bookmark
  const toggleSave = async () => {
    try {
      if (d.saved) await api.delete(`/workers/${w._id}/save`);
      else await api.post(`/workers/${w._id}/save`);
      setD({ ...d, saved: !d.saved });
    } catch (e) {
      Alert.alert('Failed', errMsg(e));
    }
  };

  const message = () =>
    Alert.alert('In-app messaging', 'In-app messaging is not part of this version. Call the worker instead?', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Call', onPress: () => callPhone(w.phone) },
    ]);

  return (
    <Screen
      footer={
        <Row>
          <Button title="Message" icon="chatbubble-outline" variant="outline" onPress={message} style={{ flex: 1, marginRight: 8 }} />
          <Button title="Select Worker" icon="person-add-outline" onPress={() => router.push({ pathname: '/InviteWorker', params: { worker: JSON.stringify(w) } })} style={{ flex: 1.4 }} />
        </Row>
      }
    >
      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{initials(w.fullName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '900' }}>{w.fullName}</Text>
            <Muted>{[w.authority, w.primaryTrade].filter(Boolean).join(' • ')}</Muted>
            <Muted>{[w.nearestTown, w.homeDistrict].filter(Boolean).join(', ')}</Muted>
          </View>
          <TouchableOpacity onPress={toggleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={d.saved ? 'bookmark' : 'bookmark-outline'} size={26} color={colors.primary} />
          </TouchableOpacity>
        </Row>
        <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
          {w.availableToday ? <Badge text="Available Today" tone="green" /> : <Badge text="Not available today" tone="orange" />}
          {w.nicVerified ? <View style={{ marginLeft: 6 }}><Badge text="NIC Verified" tone="green" /></View> : null}
        </Row>
        <Row style={{ marginTop: 12 }}>
          {[[d.stats.rating ? `${d.stats.rating}★` : '—', 'Rating'], [d.stats.jobsCompleted, 'Jobs Done'], [`${w.experienceYears} yrs`, 'Experience'], [money(w.wage?.fullDay), 'Per day']].map(([v, l]) => (
            <View key={l} style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontWeight: '900' }}>{v}</Text><Muted>{l}</Muted></View>
          ))}
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="calendar-outline">Availability</SectionTitle>
        {d.calendar.length === 0 ? <Muted>This worker has not published a calendar. Call to confirm availability.</Muted> : null}
        <ChipRow>
          {d.calendar.map((c) => (
            <View key={c._id} style={{ marginRight: 6, marginBottom: 6, alignItems: 'center' }}>
              <Muted>{c.date.slice(5)}</Muted>
              <Badge text={DAY_LABEL[c.status]} tone={DAY_TONE[c.status]} />
            </View>
          ))}
        </ChipRow>
      </Card>

      <Card>
        <SectionTitle icon="construct-outline">Skills</SectionTitle>
        {w.specializations.length === 0 ? <Muted>No specializations listed.</Muted> : null}
        {w.specializations.map((s) => (
          <Row key={s._id} style={{ justifyContent: 'space-between', paddingVertical: 3 }}><Text>{s.name}</Text><Badge text={s.level} /></Row>
        ))}
        {w.certifications.length ? <Muted style={{ marginTop: 8 }}>Certificates: {w.certifications.map((c) => c.title).join(', ')}</Muted> : null}
        {w.tools.length ? <Muted style={{ marginTop: 4 }}>Own tools: {w.tools.map((t) => t.name).join(', ')}</Muted> : null}
      </Card>

      <Card>
        <SectionTitle icon="information-circle-outline">About</SectionTitle>
        <Text>{w.about || `${w.fullName} works as a ${w.primaryTrade || 'craftsman'} with ${w.experienceYears} years of experience${w.workTowns?.length ? ` around ${w.workTowns.join(', ')}` : ''}.`}</Text>
      </Card>

      <Card>
        <SectionTitle icon="checkmark-done-outline">Completed Jobs</SectionTitle>
        {d.completedJobs.length === 0 ? <Muted>No completed jobs through Vedakaru yet.</Muted> : null}
        {d.completedJobs.map((j) => (
          <View key={j._id} style={{ paddingVertical: 4 }}>
            <Text style={{ fontWeight: '700' }}>{j.title}</Text>
            <Muted>{j.trade} • {[j.town, j.district].filter(Boolean).join(', ')}</Muted>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle icon="star-outline" right={<TouchableOpacity onPress={() => router.push({ pathname: '/WorkerReviews', params: { workerId: w._id } })}><Text style={{ color: colors.primary, fontWeight: '700' }}>See all</Text></TouchableOpacity>}>Reviews ({d.stats.reviewCount})</SectionTitle>
        {d.reviews.length === 0 ? <Muted>No reviews yet.</Muted> : null}
        {d.reviews.slice(0, 2).map((r) => (
          <View key={r._id} style={{ paddingVertical: 6 }}>
            <Text style={{ fontWeight: '700' }}>{'★'.repeat(r.rating)}<Text style={{ color: colors.border }}>{'★'.repeat(5 - r.rating)}</Text>  <Muted>{r.employer?.companyName || r.employer?.fullName}</Muted></Text>
            <Text>{r.comment}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
