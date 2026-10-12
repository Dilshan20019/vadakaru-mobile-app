// Prototype screen: Draft Jobs (Saved Drafts, templates)
import React from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, Empty, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { TEMPLATES } from '../constants';
import { C } from '../theme';

export default function DraftJobsScreen({ navigation }) {
  const { data, loading, error, reload } = useLoad(() => api.get('/jobs?status=draft'));

  const publish = (j) => run(async () => {
    await api.post(`/jobs/${j._id}/publish`);
    navigation.navigate('JobPublished', { id: j._id });
  }, 'Cannot publish');
  const remove = (j) => confirm('Delete draft?', j.title, 'Delete', () => run(async () => { await api.del(`/jobs/${j._id}`); reload(); }));
  const fromTemplate = (t) => run(async () => { await api.post('/jobs', t); reload(); });

  return (
    <Screen title={`Saved Drafts (${data?.length ?? 0})`} loading={loading} error={error} onRefresh={reload}>
      <Card style={{ borderStyle: 'dashed', alignItems: 'center' }}>
        <Text style={{ fontWeight: '800', color: C.text }}>Start a New Blank Draft</Text>
        <Muted style={{ marginBottom: 6 }}>Carpenter, Mason, Steel Fixer, or General helper</Muted>
        <Btn small title="New Draft" icon="add" onPress={() => navigation.navigate('JobForm')} />
      </Card>

      {data?.length ? data.map((j) => {
        const ready = j.location && j.dailyWage > 0;
        const escrow = (j.dailyWage + (j.travelAllowance || 0)) * j.durationDays * j.workersNeeded;
        return (
          <Card key={j._id}>
            <Row style={{ justifyContent: 'space-between' }}>
              {ready ? <Badge text="READY TO PUBLISH" icon="checkmark-circle" /> : <Badge text="NEEDS DETAILS" color={C.amber} bg={C.amberBg} />}
              <Text onPress={() => remove(j)} style={{ color: C.danger, fontWeight: '700' }}>Delete</Text>
            </Row>
            <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 6, color: C.text }}>{j.title}</Text>
            <Muted>{j.location || 'Location not set'}</Muted>
            <Row style={{ gap: 10, marginVertical: 8 }}>
              <View style={{ flex: 1, backgroundColor: C.bg, padding: 8, borderRadius: 10 }}><Muted>Workers</Muted><Text style={{ fontWeight: '800' }}>{j.workersNeeded} × {j.durationDays}d</Text></View>
              <View style={{ flex: 1, backgroundColor: C.bg, padding: 8, borderRadius: 10 }}><Muted>Escrow needed</Muted><Text style={{ fontWeight: '800', color: C.primary }}>{money(escrow)}</Text></View>
            </Row>
            <Btn title="Publish Shift Now" variant="amber" icon="paper-plane" onPress={() => publish(j)} disabled={!ready} />
            <Btn title="Edit Specs" variant="soft" icon="create-outline" onPress={() => navigation.navigate('JobForm', { job: j })} />
          </Card>
        );
      }) : <Empty text="No saved drafts yet" />}

      <H style={{ marginTop: 6 }}>Create Shift from Template</H>
      {TEMPLATES.map((t) => (
        <Card key={t.title}>
          <Text style={{ fontWeight: '800' }}>{t.title}</Text>
          <Muted>{money(t.dailyWage)} / day • {t.workersNeeded} workers • {t.durationDays} day(s)</Muted>
          <Btn small title="Create Shift from Template" variant="outline" onPress={() => fromTemplate(t)} />
        </Card>
      ))}
    </Screen>
  );
}
