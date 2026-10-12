// Prototype screen: Job Published (success + matching radar + share)
import React from 'react';
import { View, Text, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Avatar, Badge, useLoad, money } from '../ui';
import { api } from '../api';
import { C } from '../theme';

export default function JobPublishedScreen({ route, navigation }) {
  const { id } = route.params;
  const { data, loading, error, reload } = useLoad(async () => {
    const [job, matches] = await Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/matches`)]);
    return { job, matches };
  }, [id]);
  const j = data?.job;
  const share = () => Share.share({ message: `Vedakaru shift ${j.shiftCode}: ${j.title} at ${j.location}. ${money(j.dailyWage)}/day. Apply in the Vedakaru app.` });

  return (
    <Screen title="Job Published" loading={loading} error={error} onRefresh={reload} noBack
      footer={<Btn title="View Applicants & Manage Job" variant="amber" icon="arrow-forward" onPress={() => navigation.replace('JobDetails', { id })} />}>
      {j && (<>
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <Ionicons name="checkmark-circle" size={70} color={C.green} />
          <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 6 }}>Job Successfully Published!</Text>
          <Muted style={{ textAlign: 'center', marginTop: 4 }}>Your shift is now live and broadcasting to verified craftsmen.</Muted>
        </View>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}><Badge text={`SHIFT ID #${j.shiftCode}`} color={C.primary} bg={C.blueBg} /><Badge text="Escrow Secured" icon="lock-closed" /></Row>
          <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 8 }}>{j.title}</Text>
          <Muted>{j.location}</Muted>
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <View><Muted>Daily Wage Rate</Muted><Text style={{ fontWeight: '800', fontSize: 16 }}>{money(j.dailyWage)}/day</Text></View>
            <View><Muted>Open Positions</Muted><Text style={{ fontWeight: '800', fontSize: 16 }}>{j.workersNeeded} spots</Text></View>
            <View><Muted>Escrow Locked</Muted><Text style={{ fontWeight: '800', fontSize: 16, color: C.green }}>{money(j.escrowLocked)}</Text></View>
          </Row>
        </Card>
        <H>Matching Radar Active ({data.matches.total} matched)</H>
        {data.matches.workers.map((w) => (
          <Card key={w._id}><Row><Avatar name={w.name} /><View style={{ flex: 1, marginLeft: 10 }}><Text style={{ fontWeight: '800' }}>{w.name}</Text><Muted>{w.trade} • ★ {w.rating}</Muted></View><Badge text="Available" /></Row></Card>
        ))}
        <H>Share Shift to Tradesmen Groups</H>
        <Row style={{ gap: 8 }}>
          <Btn small title="WhatsApp" icon="logo-whatsapp" variant="green" onPress={share} style={{ flex: 1 }} />
          <Btn small title="SMS Blast" icon="chatbubble" variant="soft" onPress={share} style={{ flex: 1 }} />
          <Btn small title="Copy Link" icon="link" variant="soft" onPress={share} style={{ flex: 1 }} />
        </Row>
        <Btn title="Return to Employer Dashboard" variant="outline" onPress={() => navigation.popToTop()} />
      </>)}
    </Screen>
  );
}
