// Prototype screen: Confirm Hire & Shift Lock (escrow breakdown, vault debit, guarantees)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, H, Muted, Row, Btn, Badge, Avatar, useLoad, money, run } from '../ui';
import { api } from '../api';
import { C } from '../theme';

const GUARANTEES = ['GPS & Site Verification: attendance is verified by geofenced roll-call on arrival', 'Daily Evening Release: wages are released after you approve the shift', 'Automatic Site Pass: gate pass and supervisor details are sent to the worker'];
const METHODS = ['Commercial Bank Direct SLIPS', 'LankaQR / Mastercard / Visa'];

export default function ConfirmHireScreen({ route, navigation }) {
  const { workerId, jobId } = route.params;
  const [method, setMethod] = useState(METHODS[0]);
  const [ok, setOk] = useState([true, true, true]);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(async () => {
    const [w, job, me] = await Promise.all([api.get(`/workers/${workerId}?job=${jobId}`), api.get(`/jobs/${jobId}`), api.get('/profile')]);
    return { w, job, vault: me.vault };
  }, [workerId, jobId]);

  const b = data?.job.escrowEstimate;
  const short = data && data.vault < b.total;
  const topup = () => run(async () => { await api.post('/payments/topup', { amount: Math.ceil((b.total - data.vault) / 5000) * 5000, method }); reload(); }, 'Top-up failed');
  const lock = async () => {
    setBusy(true);
    const done = await run(async () => { await api.post(`/jobs/${jobId}/hire`, { workerId, method }); return true; }, 'Cannot lock shift');
    setBusy(false);
    if (done) navigation.navigate('RollCall', { jobId });
  };

  return (
    <Screen title="Confirm Hire & Shift Lock" loading={loading} error={error} onRefresh={reload}
      footer={data && <Row style={{ justifyContent: 'space-between' }}>
        <View><Muted>Deposit required now</Muted><Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>{money(b.total)}</Text></View>
        <Btn title="Lock Shift & Deposit" variant="amber" icon="lock-closed" loading={busy} disabled={short || ok.includes(false)} onPress={lock} style={{ flex: 1, marginLeft: 16 }} />
      </Row>}>
      {data && (<>
        <Card>
          <Row><Avatar name={data.w.worker.name} size={54} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontWeight: '800', fontSize: 17 }}>{data.w.worker.name}</Text><Muted>★ {data.w.worker.rating} • {data.w.worker.jobsDone} jobs • {data.w.match}% match</Muted></View></Row>
        </Card>
        <Card>
          <H>Shift Scope & Site</H>
          <Text style={{ fontWeight: '700' }}>{data.job.title}</Text><Muted>{data.job.location}</Muted>
          <Muted style={{ marginTop: 4 }}>Starts {data.job.startDate || 'TBA'} • {data.job.startTime}–{data.job.endTime} • {data.job.durationDays} day(s)</Muted>
        </Card>

        <H>Escrow Deposit Breakdown</H>
        <Card>
          {[[`Master wage (${data.job.durationDays} days × ${money(data.job.dailyWage)})`, b.wage], ['Daily travel allowance', b.travel], ['Builder platform fee', b.fee], ['Refundable safety buffer', b.buffer]].map(([l, v]) => (
            <Row key={l} style={{ justifyContent: 'space-between', paddingVertical: 5 }}><Text style={{ flex: 1 }}>{l}</Text>{l.includes('fee') ? <Badge text="FREE" /> : <Text style={{ fontWeight: '800' }}>{money(v)}</Text>}</Row>
          ))}
          <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.border, paddingTop: 8, marginTop: 4 }}><Text style={{ fontWeight: '800' }}>Total escrow lock</Text><Text style={{ fontWeight: '800', color: C.primary, fontSize: 17 }}>{money(b.total)}</Text></Row>
          <Muted style={{ marginTop: 4 }}>Vault balance: {money(data.vault)}</Muted>
        </Card>
        {short && <Card style={{ backgroundColor: C.dangerBg }}><Text style={{ color: C.danger, fontWeight: '700' }}>Your vault is short by {money(b.total - data.vault)}.</Text><Btn small title="Top up vault now" onPress={topup} /></Card>}

        <H>Vault Debit Method</H>
        {METHODS.map((m) => (
          <TouchableOpacity key={m} onPress={() => setMethod(m)}>
            <Card style={method === m ? { borderColor: C.primary, borderWidth: 2 } : null}><Row><Ionicons name={method === m ? 'radio-button-on' : 'radio-button-off'} size={20} color={C.primary} /><Text style={{ marginLeft: 8, fontWeight: '700' }}>{m}</Text></Row></Card>
          </TouchableOpacity>
        ))}

        <H>Worksite Guarantees</H>
        <Card>{GUARANTEES.map((g, i) => (
          <TouchableOpacity key={g} onPress={() => setOk((p) => p.map((x, k) => (k === i ? !x : x)))} style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <Ionicons name={ok[i] ? 'checkbox' : 'square-outline'} size={22} color={C.primary} /><Text style={{ flex: 1, marginLeft: 8, fontSize: 13 }}>{g}</Text>
          </TouchableOpacity>))}
        </Card>
      </>)}
    </Screen>
  );
}
