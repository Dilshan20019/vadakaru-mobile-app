// Prototype screen: Job Details (worker: apply / withdraw; employer: applicants, edit, publish, delete)
import React from 'react';
import { View, Text, Linking } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, Avatar, Empty, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function JobDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const isEmp = user.role === 'employer';
  const { data, loading, error, reload } = useLoad(async () => {
    const job = await api.get(`/jobs/${id}`);
    const apps = isEmp && String(job.employer._id) === user._id ? await api.get(`/jobs/${id}/applications`) : [];
    return { job, apps };
  }, [id]);
  const j = data?.job;
  const owner = j && isEmp && String(j.employer._id) === user._id;

  const apply = () => run(async () => { await api.post(`/jobs/${id}/apply`); reload(); }, 'Cannot apply');
  const withdraw = () => run(async () => { await api.del(`/jobs/${id}/apply`); reload(); }, 'Cannot withdraw');
  const decide = (a, status) => run(async () => { await api.put(`/applications/${a._id}`, { status }); reload(); }, 'Cannot update');
  const publish = () => run(async () => { await api.post(`/jobs/${id}/publish`); navigation.replace('JobPublished', { id }); }, 'Cannot publish');
  const remove = () => confirm('Delete this job?', j.title, 'Delete', () => run(async () => { await api.del(`/jobs/${id}`); navigation.goBack(); }));

  const footer = !j ? null : owner ? (j.status === 'draft' ? <Btn title="Publish Shift" variant="amber" onPress={publish} /> : null)
    : !isEmp && j.status === 'published' ? (j.hasApplied ? <Btn title="Withdraw Application" variant="danger" onPress={withdraw} /> : <Btn title="Apply (Instant Shift)" variant="amber" onPress={apply} />) : null;

  return (
    <Screen title="Job Details" loading={loading} error={error} onRefresh={reload} footer={footer}>
      {j && (<>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge text={j.category} color={C.primary} bg={C.blueBg} />
          <Badge text={j.status.replace('_', ' ').toUpperCase()} color={C.amber} bg={C.amberBg} />
        </Row>
        <Text style={{ fontSize: 22, fontWeight: '800', marginVertical: 6, color: C.text }}>{j.title}</Text>
        <Card style={{ backgroundColor: C.blueBg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View><Muted>Guaranteed daily wage</Muted><Text style={{ fontSize: 24, fontWeight: '800', color: C.primary }}>{money(j.dailyWage)}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Muted>{j.durationDays}-day total</Muted><Text style={{ fontWeight: '800' }}>{money(j.perWorker)}</Text></View>
          </Row>
          <Muted style={{ marginTop: 6 }}>🔒 100% escrow secured by Vedakaru • Travel allowance {money(j.travelAllowance)}/day</Muted>
        </Card>

        <H>Shift Schedule & Timing</H>
        <Card><Muted>{j.workersNeeded} position(s) • {j.durationDays} day(s) • starts {j.startDate || 'TBA'}</Muted><Text style={{ fontWeight: '700', marginTop: 4 }}>{j.startTime} – {j.endTime}</Text></Card>
        <H>Job Scope & Responsibilities</H>
        <Card><Text style={{ color: C.text, lineHeight: 20 }}>{j.description || 'No description provided.'}</Text></Card>
        <H>Worksite Geofence & Access</H>
        <Card>
          <Text style={{ fontWeight: '700' }}>{j.location}</Text>
          <Row style={{ gap: 8 }}>
            <Btn small title="Open Route" icon="navigate" variant="soft" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.location || '')}`)} style={{ flex: 1 }} />
            <Btn small title="Site Access" icon="location" variant="soft" onPress={() => navigation.navigate('WorksiteLocation', { id })} style={{ flex: 1 }} />
          </Row>
        </Card>
        <Card>
          <Row><Avatar name={j.employer.businessName || j.employer.name} bg={C.navy} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={{ fontWeight: '800' }}>{j.employer.businessName}</Text><Muted>★ {j.employer.rating || 'New'} • {j.employer.verified ? 'Verified Employer' : 'Employer'}</Muted></View></Row>
        </Card>

        {owner && (<>
          <H>Applicants ({data.apps.length})</H>
          {data.apps.length ? data.apps.map((a) => (
            <Card key={a._id}>
              <Row>
                <Avatar name={a.worker.name} bg={C.green} />
                <View style={{ flex: 1, marginLeft: 10 }}><Text style={{ fontWeight: '800' }}>{a.worker.name}</Text><Muted>{a.worker.trade} • ★ {a.worker.rating} • {money(a.worker.dailyRate)}/day</Muted></View>
                <Badge text={a.status.toUpperCase()} color={a.status === 'accepted' ? C.green : a.status === 'rejected' ? C.danger : C.amber} bg={a.status === 'accepted' ? C.greenBg : a.status === 'rejected' ? C.dangerBg : C.amberBg} />
              </Row>
              {a.status === 'pending' && <Row style={{ gap: 8 }}><Btn small title="Accept" variant="green" onPress={() => decide(a, 'accepted')} style={{ flex: 1 }} /><Btn small title="Reject" variant="danger" onPress={() => decide(a, 'rejected')} style={{ flex: 1 }} /></Row>}
            </Card>
          )) : <Empty text="No applicants yet" />}
          {!j.paid && <Btn title="Edit Specs" variant="soft" icon="create-outline" onPress={() => navigation.navigate('JobForm', { job: j })} />}
          {j.status !== 'completed' && <Btn title="Delete Job" variant="danger" icon="trash" onPress={remove} />}
        </>)}
      </>)}
    </Screen>
  );
}
