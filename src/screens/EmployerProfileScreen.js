import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Field, Muted, Row, Badge, Chip, ChipRow, Loading, Empty, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { FACILITIES } from '../constants';
import { callPhone, initials, startLabel } from '../utils';
import { colors } from '../theme';

const TABS = [['overview', 'Overview'], ['vacancies', 'Vacancies'], ['history', 'History'], ['reviews', 'Reviews']];

function Stars({ value, onChange, size = 18 }) {
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} disabled={!onChange} onPress={() => onChange && onChange(n)}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={colors.accent} style={{ marginRight: 2 }} />
        </TouchableOpacity>
      ))}
    </Row>
  );
}

// Works for both views: a worker looking at a contractor, and an employer looking at their own business page
export default function EmployerProfileScreen() {
  const router = useRouter();
  const { employerId: employerIdParam } = useLocalSearchParams();
  const { user } = useAuth();
  const employerId = (Array.isArray(employerIdParam) ? employerIdParam[0] : employerIdParam) || user._id;
  const isSelf = String(employerId) === String(user._id);

  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);

  // READ public employer profile
  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/employers/${employerId}`);
      setData(d);
    } catch (e) {
      Alert.alert('Could not load profile', errMsg(e));
    }
  }, [employerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <Loading />;
  const { employer: emp, stats, vacancies, history, reviews } = data;
  const myReview = reviews.find((r) => String(r.worker?._id) === String(user._id));
  const canReview = user.role === 'worker' && !isSelf;
  const provisions = FACILITIES.filter((f) => emp.facilities?.[f.key]);

  // CREATE or UPDATE my review
  const submitReview = async () => {
    try {
      if (myReview && editing) await api.put(`/employers/${employerId}/reviews/${myReview._id}`, { rating, comment });
      else await api.post(`/employers/${employerId}/reviews`, { rating, comment });
      setEditing(false);
      setComment('');
      setRating(5);
      load();
    } catch (e) {
      Alert.alert('Could not save review', errMsg(e));
    }
  };

  const startEdit = () => {
    setRating(myReview.rating);
    setComment(myReview.comment || '');
    setEditing(true);
  };

  // DELETE my review
  const removeReview = () =>
    Alert.alert('Delete review', 'Remove your review of this employer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/employers/${employerId}/reviews/${myReview._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  const openJob = (v) => (isSelf
    ? router.push({ pathname: '/JobForm', params: { job: JSON.stringify(v) } })
    : router.push({ pathname: '/JobDetail', params: { jobId: v._id } }));

  const VacancyCard = ({ v }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => openJob(v)}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Badge text={v.urgent ? 'URGENT' : startLabel(v.startDate)} tone={v.urgent ? 'red' : 'green'} />
            <Text style={{ fontWeight: '800', fontSize: 16, marginTop: 6 }}>{v.title}</Text>
            <Muted>{v.workersNeeded} worker(s) • {[v.town, v.district].filter(Boolean).join(', ')}</Muted>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '900', fontSize: 17, color: colors.primary }}>{money(v.dailyWage)}</Text>
            <Muted>per day</Muted>
          </View>
        </Row>
      </Card>
    </TouchableOpacity>
  );

  const ReviewCard = ({ r }) => (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800' }}>{r.worker?.displayName || r.worker?.fullName || 'Worker'}</Text>
          <Muted>{r.worker?.primaryTrade || 'Craftsman'}</Muted>
        </View>
        <Stars value={r.rating} size={14} />
      </Row>
      {r.comment ? <Text style={{ marginTop: 6, fontSize: 13 }}>“{r.comment}”</Text> : null}
    </Card>
  );

  return (
    <Screen>
      <Card>
        <Row>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{initials(emp.companyName || emp.fullName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Row style={{ flexWrap: 'wrap' }}>
              {emp.brVerified ? <View style={{ marginRight: 6, marginBottom: 4 }}><Badge text="BR Verified" tone="green" /></View> : <View style={{ marginRight: 6, marginBottom: 4 }}><Badge text="Not verified" tone="orange" /></View>}
              {emp.tier ? <View style={{ marginBottom: 4 }}><Badge text={emp.tier} tone="blue" /></View> : null}
            </Row>
            <Text style={{ fontSize: 18, fontWeight: '900' }}>{emp.companyName || emp.fullName}</Text>
            <Muted>{emp.yardLocation || emp.homeDistrict}</Muted>
          </View>
        </Row>

        <Row style={{ marginTop: 12 }}>
          {[[stats.reviewCount ? `${stats.rating}★` : '—', `${stats.reviewCount} reviews`], [stats.jobsFiled, 'Jobs filed'], [`${emp.onTimePayRate ?? 100}%`, 'On-time pay']].map(([v, l]) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, padding: 10, marginHorizontal: 3 }}>
              <Text style={{ fontWeight: '900', fontSize: 17 }}>{v}</Text><Muted>{l}</Muted>
            </View>
          ))}
        </Row>

        <Row style={{ marginTop: 12 }}>
          {isSelf ? (
            <>
              <Button title="Edit Profile" icon="create-outline" onPress={() => router.push('/EmployerEdit')} style={{ flex: 1, marginRight: 8 }} />
              <Button title="Post Job" icon="add-circle-outline" variant="accent" onPress={() => router.push('/JobForm')} style={{ flex: 1 }} />
            </>
          ) : (
            <Button title="Call Employer" icon="call" onPress={() => callPhone(emp.phone)} style={{ flex: 1 }} />
          )}
        </Row>
      </Card>

      <ChipRow scroll>
        {TABS.map(([k, l]) => (
          <Chip key={k} label={k === 'vacancies' ? `${l} (${vacancies.length})` : k === 'history' ? `${l} (${stats.jobsFiled})` : l} selected={tab === k} onPress={() => setTab(k)} />
        ))}
      </ChipRow>

      {tab === 'overview' ? (
        <>
          <Card>
            <SectionTitle icon="business-outline" right={emp.establishedYear ? <Muted>Est. {emp.establishedYear}</Muted> : null}>About</SectionTitle>
            <Text style={{ fontSize: 14 }}>{emp.about || 'This employer has not added a description yet.'}</Text>
            {emp.industry ? <Muted style={{ marginTop: 6 }}>{emp.industry}</Muted> : null}
            {provisions.length ? (
              <View style={{ marginTop: 10 }}>
                <Muted style={{ fontWeight: '700', marginBottom: 4 }}>WORKSITE PROVISIONS</Muted>
                <ChipRow>{provisions.map((f) => <Chip key={f.key} label={f.label} />)}</ChipRow>
              </View>
            ) : null}
          </Card>

          <SectionTitle icon="flash-outline" right={vacancies.length > 2 ? <TouchableOpacity onPress={() => setTab('vacancies')}><Text style={{ color: colors.primary, fontWeight: '700' }}>View all ({vacancies.length})</Text></TouchableOpacity> : null}>Urgent Openings</SectionTitle>
          {vacancies.length === 0 ? <Muted style={{ marginBottom: 10 }}>No open vacancies right now.</Muted> : vacancies.slice(0, 2).map((v) => <VacancyCard key={v._id} v={v} />)}

          <Card tone="blue">
            <Muted>Complies with Sri Lanka Wages Board and SLBFE fair wage standards.</Muted>
          </Card>
        </>
      ) : null}

      {tab === 'vacancies' ? (vacancies.length ? vacancies.map((v) => <VacancyCard key={v._id} v={v} />) : <Empty text="No open vacancies right now." />) : null}

      {tab === 'history' ? (
        history.length ? history.map((h) => (
          <Card key={h._id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }}>{h.title}</Text>
                <Muted>{h.workersNeeded} worker(s) • {h.startDate}</Muted>
              </View>
              <Badge text="100% Paid" tone="green" />
            </Row>
          </Card>
        )) : <Empty text="No completed jobs yet." />
      ) : null}

      {tab === 'reviews' ? (
        <>
          {canReview ? (
            myReview && !editing ? (
              <Card tone="blue">
                <Text style={{ fontWeight: '800', marginBottom: 4 }}>Your review</Text>
                <Stars value={myReview.rating} />
                {myReview.comment ? <Text style={{ marginTop: 6 }}>{myReview.comment}</Text> : null}
                <Row style={{ marginTop: 10 }}>
                  <Button title="Edit" small variant="soft" onPress={startEdit} style={{ marginRight: 8 }} />
                  <Button title="Delete" small variant="danger" onPress={removeReview} />
                </Row>
              </Card>
            ) : (
              <Card>
                <SectionTitle icon="star-outline">{editing ? 'Edit your review' : 'Rate this employer'}</SectionTitle>
                <Stars value={rating} onChange={setRating} size={28} />
                <Field style={{ marginTop: 10 }} value={comment} onChangeText={setComment} multiline placeholder="Were wages paid on time? Safe site? Fair treatment?" maxLength={500} />
                <Row>
                  <Button title={editing ? 'Save Changes' : 'Post Review'} small onPress={submitReview} style={{ marginRight: 8 }} />
                  {editing ? <Button title="Cancel" small variant="outline" onPress={() => { setEditing(false); setComment(''); setRating(5); }} /> : null}
                </Row>
              </Card>
            )
          ) : null}
          {reviews.length ? reviews.map((r) => <ReviewCard key={r._id} r={r} />) : <Empty text="No reviews yet. Be the first to share your experience." />}
        </>
      ) : null}
    </Screen>
  );
}
