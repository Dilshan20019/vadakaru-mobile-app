// Prototype screen: Job Categories (browse crafts, search, find jobs)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Field, Badge, Empty, useLoad, money } from '../ui';
import { api } from '../api';
import { CATEGORIES } from '../constants';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function JobCategoriesScreen({ navigation }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const { data: summary, loading, error, reload } = useLoad(() => api.get('/jobs/categories/summary'));
  const jobs = useLoad(() => api.get(`/jobs?${cat ? `category=${encodeURIComponent(cat)}&` : ''}q=${encodeURIComponent(q)}`), [cat, q]);

  const info = (c) => (summary || []).find((s) => s.category === c);
  const shown = CATEGORIES.filter((c) => c.toLowerCase().includes(q.toLowerCase()) || !q);

  return (
    <Screen title="Job Categories" loading={loading} error={error} onRefresh={reload} noBack={user.role === 'worker'}>
      <Field icon="search" placeholder="Search jobs or categories..." value={q} onChangeText={setQ} />
      <H>Featured Crafts</H>
      {shown.map((c) => {
        const i = info(c);
        return (
          <TouchableOpacity key={c} onPress={() => setCat(cat === c ? null : c)}>
            <Card style={cat === c ? { borderColor: C.primary, borderWidth: 2 } : null}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View><Text style={{ fontWeight: '800', fontSize: 16 }}>{c}</Text><Muted>{i ? `${money(i.min)} – ${money(i.max)} / day` : 'No open shifts right now'}</Muted></View>
                <Badge text={`${i?.count || 0} open`} color={C.primary} bg={C.blueBg} />
              </Row>
              {cat === c && <Muted style={{ marginTop: 4 }}>Showing jobs below ↓</Muted>}
            </Card>
          </TouchableOpacity>
        );
      })}

      <H>{cat ? `${cat} Jobs` : 'Latest Open Shifts'}</H>
      {jobs.data?.length ? jobs.data.map((j) => (
        <TouchableOpacity key={j._id} onPress={() => navigation.navigate('JobDetails', { id: j._id })}>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', flex: 1 }}>{j.title}</Text><Text style={{ fontWeight: '800', color: C.primary }}>{money(j.dailyWage)}</Text></Row>
            <Muted>{j.location} • {j.workersNeeded} spot(s)</Muted>
          </Card>
        </TouchableOpacity>
      )) : <Empty text="No matching jobs" />}

      {user.role === 'employer' && (
        <Card style={{ backgroundColor: C.blueBg }}>
          <Text style={{ fontWeight: '800' }}>Can't find your specific skill?</Text>
          <Btn small title="Post Custom Request" icon="add" onPress={() => navigation.navigate('JobForm')} />
        </Card>
      )}
    </Screen>
  );
}
