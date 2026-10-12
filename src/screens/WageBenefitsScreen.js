// Prototype screen: Wage & Benefits (worker earnings, hospitality, welfare, payout method)
import React, { useState } from 'react';
import { View, Text, Share, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Field, Badge, useLoad, money, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function WageBenefitsScreen({ route }) {
  const { user, refresh } = useAuth();
  const workerId = route.params?.workerId || user._id;
  const own = workerId === user._id && user.role === 'worker';
  const { data: w, loading, error, reload } = useLoad(() => api.get(`/workers/${workerId}/wages`), [workerId]);
  const [rate, setRate] = useState('');
  const [acct, setAcct] = useState('');

  const saveRate = () => run(async () => { await api.put('/profile', { dailyRate: Number(rate) }); setRate(''); await refresh(); reload(); }, 'Cannot update rate');
  const setPayout = (method) => run(async () => { await api.put('/profile/payout', { method, account: acct }); reload(); });
  const clearPayout = () => confirm('Remove payout method?', 'You will need one to receive wages.', 'Remove', () => run(async () => { await api.del('/profile/payout'); reload(); }));
  const agreement = () => Share.share({ message: `Vedakaru Wage Agreement\nWorker: ${w.worker.name} (${w.worker.trade})\nDaily wage: ${money(w.base)}\nTravel: ${money(w.travel)}\nOvertime/hr: ${money(w.overtimeRate)}\nPayout: ${w.payout?.method || 'Not set'}` });

  return (
    <Screen title="Wage & Benefits" loading={loading} error={error} onRefresh={reload} noBack={user.role === 'worker'}>
      {w && (<>
        <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{w.worker.name}</Text>
          <Text style={{ color: '#BFD0FF' }}>{w.worker.trade} • {w.worker.location}</Text>
          <Text style={{ color: '#BFD0FF', marginTop: 8, fontSize: 11 }}>Guaranteed Minimum Daily Rate</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{money(w.guaranteedRate)}</Text>
        </Card>

        <H>Daily Earnings Breakdown</H>
        <Card>
          {[['Base Shift (8 hours)', money(w.base)], ['Overtime (per hour)', money(w.overtimeRate)], ['Heavy Task / Height Bonus', `+${money(w.heavyTaskBonus)}`], ['Travel Allowance', money(w.travel)]].map(([a, b]) => (
            <Row key={a} style={{ justifyContent: 'space-between', paddingVertical: 6 }}><Text>{a}</Text><Text style={{ fontWeight: '800' }}>{b}</Text></Row>
          ))}
          <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.border, paddingTop: 8 }}><Text style={{ fontWeight: '800' }}>Daily total (base + travel)</Text><Text style={{ fontWeight: '800', color: C.primary }}>{money(w.dailyTotal)}</Text></Row>
        </Card>

        <H>Mandatory Hospitality & Perks</H>
        <Card>{w.hospitality.map((h) => <Row key={h.label} style={{ justifyContent: 'space-between', paddingVertical: 5 }}><Text>{h.label}</Text><Badge text={h.value} /></Row>)}</Card>
        <H>Welfare & Medical Shield</H>
        <Card>{w.welfare.map((h) => <Row key={h.label} style={{ justifyContent: 'space-between', paddingVertical: 5 }}><Text>{h.label}</Text><Text style={{ fontWeight: '800' }}>{h.value}</Text></Row>)}</Card>

        <H>Payout Method & Routing</H>
        <Card>
          {w.payout?.method ? (
            <Row style={{ justifyContent: 'space-between' }}><View><Text style={{ fontWeight: '800' }}>{w.payout.method}</Text><Muted>{w.payout.account || 'No account details'}</Muted></View>{own && <Text onPress={clearPayout} style={{ color: C.danger, fontWeight: '700' }}>Remove</Text>}</Row>
          ) : <Muted>No payout method set</Muted>}
          {own && (<>
            <Field style={{ marginTop: 8 }} placeholder="Account / phone number" value={acct} onChangeText={setAcct} />
            {w.payoutOptions.map((o) => <TouchableOpacity key={o} onPress={() => setPayout(o)} style={{ paddingVertical: 8 }}><Row><Ionicons name={w.payout?.method === o ? 'radio-button-on' : 'radio-button-off'} size={20} color={C.primary} /><Text style={{ marginLeft: 8 }}>{o}</Text></Row></TouchableOpacity>)}
          </>)}
        </Card>

        {own && (<>
          <H>Update Expected Daily Rate</H>
          <Field keyboardType="numeric" placeholder={String(w.guaranteedRate)} value={rate} onChangeText={setRate} />
          <Btn title="Update Expected Daily Rate" disabled={!rate} onPress={saveRate} />
        </>)}
        <Btn title="Download Wage Agreement" icon="download" variant="soft" onPress={agreement} />
      </>)}
    </Screen>
  );
}
