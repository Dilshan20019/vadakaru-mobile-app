// Prototype screen: Messages (search, filters, conversation list)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Screen, Card, Muted, Row, Chip, Badge, Avatar, Field, Empty, useLoad, run, confirm } from '../ui';
import { api } from '../api';
import { C } from '../theme';

const fmt = (d) => { const x = new Date(d); return x.toDateString() === new Date().toDateString() ? x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString([], { month: 'short', day: 'numeric' }); };

export default function MessagesScreen({ navigation }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const { data, loading, error, reload } = useLoad(() => api.get(`/messages/threads?q=${encodeURIComponent(q)}`), [q]);
  const all = data || [];
  const list = all.filter((t) => filter === 'all' || (filter === 'unread' && t.unread > 0) || (filter === 'active' && t.job && ['published', 'in_progress'].includes(t.job.status)) || (filter === 'settled' && t.job?.paid));
  const unread = all.filter((t) => t.unread > 0).length;
  const readAll = () => run(async () => { await api.put('/messages/read-all'); reload(); });
  const delThread = (t) => confirm('Delete conversation?', `All messages with ${t.with.businessName || t.with.name} will be removed.`, 'Delete', () => run(async () => { await api.del(`/messages/thread/${t.with._id}`); reload(); }));

  return (
    <Screen title="Messages" loading={loading} error={error} onRefresh={reload} noBack>
      <Field icon="search" placeholder="Search messages or workers..." value={q} onChangeText={setQ} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[['all', `All ${all.length}`], ['unread', `Unread ${unread}`], ['active', 'Active Jobs'], ['settled', 'Settled']].map(([k, l]) => <Chip key={k} label={l} active={filter === k} onPress={() => setFilter(k)} />)}
      </ScrollView>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}><Muted>Long-press a conversation to delete it</Muted><Text onPress={readAll} style={{ color: C.primary, fontWeight: '800' }}>Mark all read</Text></Row>
      {list.length ? list.map((t) => (
        <TouchableOpacity key={t.with._id} onLongPress={() => delThread(t)} onPress={() => navigation.navigate('Chat', { userId: t.with._id, jobId: t.job?._id })}>
          <Card>
            <Row>
              <Avatar name={t.with.name} size={46} bg={t.with.role === 'employer' ? C.navy : C.green} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', fontSize: 15 }}>{t.with.businessName || t.with.name}</Text><Muted style={{ color: t.unread ? C.primary : C.muted }}>{fmt(t.last.at)}</Muted></Row>
                {t.job ? <Badge text={t.job.title} color={C.primary} bg={C.blueBg} /> : null}
                <Text numberOfLines={1} style={{ color: t.unread ? C.text : C.muted, fontWeight: t.unread ? '700' : '400', marginTop: 2 }}>{t.last.mine ? '✓ ' : ''}{t.last.text}</Text>
              </View>
              {t.unread > 0 && <View style={{ backgroundColor: C.primary, borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{t.unread}</Text></View>}
            </Row>
          </Card>
        </TouchableOpacity>
      )) : <Empty icon="chatbubbles-outline" text="No conversations yet. Message a worker from the Applicants tab." />}
      <Card style={{ backgroundColor: C.blueBg }}><Muted>💡 Send the site address and start time early in the evening before the shift so daily-wage tradesmen can plan transport.</Muted></Card>
    </Screen>
  );
}
