// Worker-side list: my applications (withdraw) and my shifts (worksite / review). Added so workers can reach the shared screens.
import React from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, Empty, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function WorkerShiftsScreen({ navigation }) {
  const { data, loading, error, reload } = useLoad(async () => {
    const [apps, shifts] = await Promise.all([api.get('/applications/mine'), api.get('/jobs?mine=1&status=published,in_progress,completed')]);
    return { apps, shifts };
  });
  const withdraw = (a) => confirm('Withdraw application?', a.job?.title, 'Withdraw', () => run(async () => { await api.del(`/applications/${a._id}`); reload(); }));

  return (
    <Screen title="My Shifts" loading={loading} error={error} onRefresh={reload} noBack>
      <H>My Shifts ({data?.shifts.length ?? 0})</H>
      {data?.shifts.length ? data.shifts.map((j) => (
        <Card key={j._id}>
          <Row style={{ justifyContent: 'space-between' }}><Badge text={j.paid ? 'PAID' : j.status.replace('_', ' ').toUpperCase()} color={C.primary} bg={C.blueBg} /><Text style={{ fontWeight: '800', color: C.primary }}>{money(j.dailyWage)}</Text></Row>
          <Text style={{ fontWeight: '800', marginTop: 6 }}>{j.title}</Text><Muted>{j.location}</Muted>
          <Row style={{ gap: 8 }}>
            <Btn small title="Worksite" variant="soft" onPress={() => navigation.navigate('WorksiteLocation', { id: j._id })} style={{ flex: 1 }} />
            {j.status === 'completed' && <Btn small title="Review Employer" variant="amber" onPress={() => navigation.navigate('ReviewShift', { id: j._id })} style={{ flex: 1 }} />}
          </Row>
        </Card>
      )) : <Empty text="No assigned shifts yet. Apply to a job from Browse." />}

      <H>My Applications</H>
      {data?.apps.length ? data.apps.map((a) => (
        <Card key={a._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800' }}>{a.job?.title}</Text><Muted>{a.job?.location}</Muted></View>
            <Badge text={a.status.toUpperCase()} color={a.status === 'accepted' ? C.green : a.status === 'rejected' ? C.danger : C.amber} bg={a.status === 'accepted' ? C.greenBg : a.status === 'rejected' ? C.dangerBg : C.amberBg} />
          </Row>
          {a.status === 'pending' && <Btn small title="Withdraw" variant="danger" onPress={() => withdraw(a)} />}
        </Card>
      )) : <Empty text="You have not applied to any job yet." />}
    </Screen>
  );
}
