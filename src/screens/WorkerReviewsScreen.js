import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Field, Button, Chip, ChipRow, Muted, Row, Empty, Loading } from '../components/ui';
import api, { errMsg } from '../api/client';
import { callPhone, dateTimeLabel } from '../utils';
import { colors } from '../theme';

const FILTERS = [[0, 'All'], [5, '5★'], [4, '4★'], [3, '3★'], [2, '2★'], [1, '1★']];

export default function WorkerReviewsScreen({ route }) {
  const { workerId } = route.params;
  const [d, setD] = useState(null);
  const [filter, setFilter] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(null);

  // READ worker + reviews
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/workers/${workerId}`);
      setD(data);
    } catch (e) {
      Alert.alert('Could not load reviews', errMsg(e));
    }
  }, [workerId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!d) return <Loading />;
  const { stats, worker: w } = d;
  const mine = d.reviews.find((r) => r.mine);
  const list = d.reviews.filter((r) => !filter || r.rating === filter);
  const total = stats.reviewCount || 1;

  // UPDATE helpful / report
  const helpful = async (r) => { try { await api.post(`/workers/reviews/${r._id}/helpful`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); } };
  const report = (r) =>
    Alert.alert('Report review', 'Report this review as inappropriate or fake?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: async () => { try { await api.post(`/workers/reviews/${r._id}/report`); Alert.alert('Thank you', 'Our team will check this review.'); } catch (e) { Alert.alert('Failed', errMsg(e)); } } },
    ]);

  // CREATE or UPDATE my review
  const submit = async () => {
    try {
      if (editing) await api.put(`/workers/${workerId}/reviews/${editing}`, { rating, comment });
      else await api.post(`/workers/${workerId}/reviews`, { rating, comment });
      setEditing(null); setComment(''); setRating(5);
      load();
    } catch (e) {
      Alert.alert('Could not save review', errMsg(e));
    }
  };
  const startEdit = (r) => { setEditing(r._id); setRating(r.rating); setComment(r.comment); };

  // DELETE my review
  const remove = (r) =>
    Alert.alert('Delete review', 'Delete your review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/workers/${workerId}/reviews/${r._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); } } },
    ]);

  return (
    <Screen>
      <Card>
        <Row>
          <View style={{ alignItems: 'center', marginRight: 16 }}>
            <Text style={{ fontSize: 38, fontWeight: '900', color: colors.primary }}>{stats.rating || '—'}</Text>
            <Muted>{stats.reviewCount} reviews</Muted>
          </View>
          <View style={{ flex: 1 }}>
            {stats.breakdown.map((b) => (
              <Row key={b.star} style={{ marginVertical: 1 }}>
                <Muted style={{ width: 22 }}>{b.star}★</Muted>
                <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                  <View style={{ width: `${(b.count / total) * 100}%`, height: 7, backgroundColor: colors.accent }} />
                </View>
                <Muted style={{ width: 22, textAlign: 'right' }}>{b.count}</Muted>
              </Row>
            ))}
          </View>
        </Row>
        <Text style={{ fontWeight: '700', marginTop: 8 }}>{w.fullName}</Text>
      </Card>

      <ChipRow scroll>{FILTERS.map(([k, l]) => <Chip key={k} label={l} selected={filter === k} onPress={() => setFilter(k)} />)}</ChipRow>
      {list.length === 0 ? <Empty text="No reviews in this filter." /> : null}
      {list.map((r) => (
        <Card key={r._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800' }}>{r.employer?.companyName || r.employer?.fullName}</Text>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>{'★'.repeat(r.rating)}</Text>
          </Row>
          {r.jobTitle ? <Muted>{r.jobTitle}</Muted> : null}
          <Text style={{ marginVertical: 6 }}>{r.comment || 'No comment.'}</Text>
          <Muted>{dateTimeLabel(r.createdAt)}</Muted>
          <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => helpful(r)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <Ionicons name={r.markedHelpful ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 4, fontWeight: '700' }}>Helpful ({r.helpfulCount})</Text>
            </TouchableOpacity>
            {r.mine ? (
              <>
                <TouchableOpacity onPress={() => startEdit(r)} style={{ marginRight: 16 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(r)}><Text style={{ color: colors.danger, fontWeight: '700' }}>Delete</Text></TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => report(r)}><Text style={{ color: colors.danger, fontWeight: '700' }}>Report</Text></TouchableOpacity>
            )}
          </Row>
        </Card>
      ))}

      <Button title={`Call ${w.displayName || w.fullName.split(' ')[0]}`} icon="call" variant="outline" onPress={() => callPhone(w.phone)} style={{ marginVertical: 8 }} />

      {!mine || editing ? (
        <Card>
          <Text style={{ fontWeight: '800', marginBottom: 6 }}>{editing ? 'Edit your review' : 'Write a review'}</Text>
          <Row style={{ marginBottom: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color={colors.accent} /></TouchableOpacity>
            ))}
          </Row>
          <Field value={comment} onChangeText={setComment} multiline placeholder="How was this worker on site?" />
          <Button title={editing ? 'Update Review' : 'Submit Review'} onPress={submit} />
        </Card>
      ) : null}
    </Screen>
  );
}
