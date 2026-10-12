// Prototype screens: Earnings & Wallet / Payouts (weekly trend, composition, settlement methods, shift ledger)
import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Field, Empty, PickerModal, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { PAYOUT_OPTIONS } from '../constants';
import { C } from '../theme';

export default function EarningsWalletScreen({ navigation }) {
  const [range, setRange] = useState('week');
  const [pick, setPick] = useState(false);
  const [acct, setAcct] = useState('');
  const { data: d, loading, error, reload } = useLoad(() => api.get(`/payments/summary?range=${range}`), [range]);
  const emp = d?.role === 'employer';

  const max = Math.max(1, ...(d?.daily || []).map((x) => x.amount));
  const addMethod = (it) => run(async () => { await api.post('/profile/payout-methods', { method: it.key, account: acct }); setAcct(''); setPick(false); reload(); });
  const primary = (m) => run(async () => { await api.put(`/profile/payout-methods/${m._id}`, { primary: true }); reload(); });
  const removeM = (m) => confirm('Remove method?', m.method, 'Remove', () => run(async () => { await api.del(`/profile/payout-methods/${m._id}`); reload(); }));
  const withdraw = () => run(async () => { const p = await api.post('/payments/withdraw', {}); Alert.alert('Withdrawal requested', `${money(p.amount)} is on its way to ${p.method}.`); reload(); }, 'Cannot withdraw');
  const topup = (n) => run(async () => { await api.post('/payments/topup', { amount: n }); reload(); }, 'Top-up failed');

  return (
    <Screen title={emp ? 'Payouts' : 'Earnings & Wallet'} loading={loading} error={error} onRefresh={reload} noBack>
      {d && (<>
        <Row>{[['week', 'This Week'], ['two_weeks', 'Two Weeks'], ['month', 'Last 30 Days']].map(([k, l]) => <Chip key={k} label={l} active={range === k} onPress={() => setRange(k)} />)}</Row>
        <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
          <Text style={{ color: '#BFD0FF', fontSize: 12 }}>{emp ? 'Net confirmed payouts (disbursed)' : 'Net earnings'}</Text>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }}>LKR {Math.round(d.total).toLocaleString('en-US')}</Text>
          <Row style={{ gap: 20, marginTop: 8 }}>
            {emp ? (<>
              <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Escrow held</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{money(d.escrowHeld)}</Text></View>
              <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Vault balance</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{money(d.vault)}</Text></View>
              <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Ready to settle</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{d.readyCount} shift(s)</Text></View>
            </>) : (<>
              <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>Available</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{money(d.available)}</Text></View>
              <View><Text style={{ color: '#BFD0FF', fontSize: 11 }}>In escrow</Text><Text style={{ color: '#fff', fontWeight: '800' }}>{money(d.pending)}</Text></View>
            </>)}
          </Row>
          {emp ? <Btn title="Release Ready Payouts" variant="amber" onPress={() => navigation.navigate('CrewPayouts')} /> : <Btn title="Withdraw to Bank / Instant Cash" variant="amber" disabled={!(d.available > 0)} onPress={withdraw} />}
        </Card>

        {emp && (<Card><H>Add funds to escrow vault</H><Row style={{ flexWrap: 'wrap' }}>{[10000, 25000, 50000].map((n) => <Chip key={n} label={`+ ${money(n)}`} onPress={() => topup(n)} />)}</Row></Card>)}

        <H>Weekly Trend</H>
        <Card><Row style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 110 }}>
          {d.daily.map((x, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ width: 18, height: Math.max(4, (x.amount / max) * 80), backgroundColor: x.amount ? C.primary : '#D1D5DB', borderRadius: 4 }} />
              <Muted>{x.label}</Muted>
            </View>))}
        </Row></Card>

        <H>Earnings Composition</H>
        <Card>{[['Base shift wages', d.composition.base], ['Overtime', d.composition.overtime], ['Travel allowance', d.composition.travel], ['Bonus / extras', d.composition.bonus]].map(([l, v]) => (
          <Row key={l} style={{ justifyContent: 'space-between', paddingVertical: 4 }}><Text>{l}</Text><Text style={{ fontWeight: '800' }}>{money(v)}</Text></Row>))}</Card>

        <H>Direct Settlement Methods</H>
        <Card>
          {d.methods.length ? d.methods.map((m) => (
            <Row key={m._id} style={{ paddingVertical: 6 }}>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{m.method}</Text><Muted>{m.account || 'No account details'}</Muted></View>
              {m.primary ? <Badge text="PRIMARY" /> : <Text onPress={() => primary(m)} style={{ color: C.primary, fontWeight: '700' }}>Make primary</Text>}
              <Text onPress={() => removeM(m)} style={{ color: C.danger, fontWeight: '800', marginLeft: 12 }}>✕</Text>
            </Row>)) : <Muted>No settlement methods yet.</Muted>}
          <Field style={{ marginTop: 8 }} placeholder="Account / phone (optional)" value={acct} onChangeText={setAcct} />
          <Btn small title="Add Method" variant="soft" icon="add" onPress={() => setPick(true)} />
        </Card>

        <H>Shift Ledger & Releases</H>
        {d.ledger.length ? d.ledger.map((p) => (
          <Card key={p._id}>
            <Row style={{ justifyContent: 'space-between' }}><Badge text={p.status === 'disputed' ? 'DISPUTED' : 'COMPLETED'} color={p.status === 'disputed' ? C.danger : C.green} bg={p.status === 'disputed' ? C.dangerBg : C.greenBg} /><Text style={{ fontWeight: '800', color: C.primary, fontSize: 16 }}>+{money(p.amount)}</Text></Row>
            <Text style={{ fontWeight: '800', marginTop: 4 }}>{p.job?.title}</Text>
            <Muted>{emp ? `To ${p.payee?.name}` : `From ${p.payer?.businessName || p.payer?.name}`} • {new Date(p.createdAt).toLocaleDateString()}</Muted>
            <Btn small title="Details" variant="soft" onPress={() => navigation.navigate('PaymentDetails', { id: p._id })} />
          </Card>)) : <Empty text="No payouts in this period." />}
        <Card style={{ backgroundColor: C.greenBg }}><Muted>🛡 Vedakaru Fair Pay Guarantee • Helpline 1388</Muted></Card>
      </>)}
      <PickerModal visible={pick} title="Choose settlement method" items={PAYOUT_OPTIONS.map((o) => ({ key: o, label: o }))} onPick={addMethod} onClose={() => setPick(false)} />
    </Screen>
  );
}
