// Prototype screen: Employer Verification (trust score, escrow vault, documents)
import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Field, Badge, useLoad, money, run } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

const DOCS = [['businessReg', 'Business Registration (BR)'], ['taxId', 'Taxpayer Identification (TIN / IRD)'], ['safety', 'Worker Safety Insurance'], ['office', 'Office & Yard Geotagged']];

export default function EmployerVerificationScreen() {
  const { refresh } = useAuth();
  const { data, loading, error, reload } = useLoad(() => api.get('/profile/verification'));
  const [funds, setFunds] = useState('');
  const u = data?.user;

  const setDoc = (k, v) => run(async () => { await api.put('/profile/verification', { docs: { [k]: v } }); await refresh(); reload(); });
  const addFunds = (n) => run(async () => { await api.put('/profile/verification', { addFunds: n }); setFunds(''); await refresh(); reload(); }, 'Cannot add funds');
  const submitAll = () => run(async () => { await api.put('/profile/verification', { docs: { businessReg: true, taxId: true, safety: true, office: true } }); await refresh(); reload(); });

  return (
    <Screen title="Employer Verification" loading={loading} error={error} onRefresh={reload}>
      {u && (<>
        <Card style={{ backgroundColor: C.navy, borderColor: C.navy }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>{u.businessName}</Text><Text style={{ color: '#BFD0FF' }}>{u.location}</Text></View>
            <Badge text={`Tier ${u.tier}`} color="#fff" bg="rgba(255,255,255,0.2)" />
          </Row>
          <Row style={{ marginTop: 12, gap: 20 }}>
            <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Credit score</Text><Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{u.creditScore}%</Text></View>
            <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>On-time pay</Text><Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{data.stats.onTimePay}%</Text></View>
            <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Paid jobs</Text><Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{data.stats.paidJobs}</Text></View>
          </Row>
        </Card>

        <H>Wage Guarantee Vault</H>
        <Card>
          <Muted>Active escrow balance</Muted>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.primary }}>{money(u.vault)}</Text>
          <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>{[10000, 25000, 50000].map((n) => <Chip key={n} label={`+ ${money(n)}`} onPress={() => addFunds(n)} />)}</Row>
          <Row style={{ gap: 8 }}><View style={{ flex: 1 }}><Field keyboardType="numeric" placeholder="Custom amount" value={funds} onChangeText={setFunds} /></View><Btn small title="Add Funds" disabled={!funds} onPress={() => addFunds(Number(funds))} /></Row>
        </Card>

        <H>Business Verification Vault</H>
        <Card>
          {DOCS.map(([k, label]) => (
            <Row key={k} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border }}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{label}</Text><Muted>{u.docs[k] ? 'Verified' : 'Not submitted'}</Muted></View>
              <Switch value={!!u.docs[k]} onValueChange={(v) => setDoc(k, v)} trackColor={{ true: C.green }} />
            </Row>
          ))}
        </Card>
        <Btn title={u.tier === 3 ? 'Tier 3 Enterprise Verified ✓' : 'Submit Documents for Tier 3 Enterprise Badge'} variant={u.tier === 3 ? 'green' : 'primary'} onPress={submitAll} disabled={u.tier === 3} />
        <Muted style={{ textAlign: 'center', marginTop: 10 }}>Verification is simulated in this academic build.</Muted>
      </>)}
    </Screen>
  );
}
