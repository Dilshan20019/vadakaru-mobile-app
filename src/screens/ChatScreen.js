// Prototype screen: Chat (messages, location share, photo, quick actions, edit/delete own messages)
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Muted, Row, Chip, Avatar, Empty, useLoad, timeStr, pickImage, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function ChatScreen({ route, navigation }) {
  const { userId, jobId } = route.params;
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [job, setJob] = useState(null);
  const { data, loading, error, reload } = useLoad(() => api.get(`/messages/with/${userId}`), [userId]);

  useEffect(() => { if (jobId) api.get(`/jobs/${jobId}`).then(setJob).catch(() => {}); }, [jobId]);
  useEffect(() => { const t = setInterval(reload, 6000); return () => clearInterval(t); }, [reload]);

  const send = (body) => run(async () => { await api.post('/messages', { to: userId, jobId, ...body }); reload(); }, 'Message not sent');
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    if (editing) { const id = editing; setEditing(null); run(async () => { await api.put(`/messages/${id}`, { text: t }); reload(); }, 'Cannot edit'); } else send({ text: t });
  };
  const photo = async () => { const img = await pickImage(); if (img) send({ kind: 'photo', image: img, text: '' }); };
  const options = (m) => m.kind === 'system' || String(m.from) !== user._id ? null : confirm('Message options', '', 'Delete', () => run(async () => { await api.del(`/messages/${m._id}`); reload(); }));
  const long = (m) => {
    if (String(m.from) !== user._id || m.kind === 'system') return;
    if (m.kind === 'text') { setEditing(m._id); setText(m.text); } else options(m);
  };

  const quick = [
    ['Send Gate Pass', () => send({ text: `Gate pass for ${job?.title || 'your shift'}: code ${job?.shiftCode || 'will be sent shortly'}. Entry: ${job?.gate || 'Main gate'}.` })],
    ['Share Location', () => send({ kind: 'location', text: job?.location || 'Site location will be confirmed' })],
    ['Offer Overtime', () => send({ text: 'Can you stay for 2 extra hours today at the overtime rate?' })],
    ['Request Photo', () => send({ text: 'Please send a photo of the finished work.' })],
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={data?.other ? (data.other.businessName || data.other.name) : 'Chat'} loading={loading} error={error} onRefresh={reload}
        footer={<View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{quick.map(([l, fn]) => <Chip key={l} label={l} onPress={fn} />)}</ScrollView>
          {editing && <Muted style={{ marginBottom: 4 }}>Editing message — <Text onPress={() => { setEditing(null); setText(''); }} style={{ color: C.primary }}>cancel</Text></Muted>}
          <Row>
            <TouchableOpacity onPress={photo} style={{ padding: 8 }}><Ionicons name="image-outline" size={24} color={C.muted} /></TouchableOpacity>
            <TextInput value={text} onChangeText={setText} placeholder="Type a message..." style={{ flex: 1, backgroundColor: '#F1F4FB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 6 }} />
            <TouchableOpacity onPress={submit} style={{ backgroundColor: C.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
          </Row>
        </View>}>
        {data?.messages.length ? data.messages.map((m) => {
          const mine = String(m.from) === user._id;
          if (m.kind === 'system') return <View key={m._id} style={{ alignSelf: 'center', backgroundColor: C.greenBg, borderRadius: 10, padding: 8, marginVertical: 6, maxWidth: '90%' }}><Text style={{ color: C.green, fontSize: 12 }}>🛡 {m.text}</Text></View>;
          return (
            <TouchableOpacity key={m._id} activeOpacity={0.8} onLongPress={() => long(m)} onPress={() => mine && m.kind !== 'text' ? options(m) : null}
              style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', marginVertical: 4 }}>
              <View style={{ backgroundColor: mine ? C.primary : '#fff', borderRadius: 14, padding: 10, borderWidth: mine ? 0 : 1, borderColor: C.border }}>
                {m.kind === 'photo' && m.image ? <Image source={{ uri: m.image }} style={{ width: 200, height: 150, borderRadius: 10 }} /> : null}
                {m.kind === 'location' ? (<View><Text style={{ color: mine ? '#fff' : C.text, fontWeight: '800' }}>📍 Site location</Text><Text style={{ color: mine ? '#DDE6FF' : C.muted }}>{m.text}</Text>
                  <Text onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.text)}`)} style={{ color: mine ? '#fff' : C.primary, fontWeight: '800', marginTop: 4 }}>Open in Google Maps</Text></View>)
                  : m.text ? <Text style={{ color: mine ? '#fff' : C.text }}>{m.text}</Text> : null}
              </View>
              <Text style={{ fontSize: 10, color: C.muted, alignSelf: mine ? 'flex-end' : 'flex-start' }}>{timeStr(m.createdAt)}{mine ? (m.read ? ' ✓✓' : ' ✓') : ''}</Text>
            </TouchableOpacity>
          );
        }) : <Empty icon="chatbubble-outline" text="Say hello! Messages about this job are protected by Vedakaru." />}
        <Muted style={{ textAlign: 'center', marginTop: 10 }}>Tip: long-press your own message to edit or delete it.</Muted>
      </Screen>
    </KeyboardAvoidingView>
  );
}
