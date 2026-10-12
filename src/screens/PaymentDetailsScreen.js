// Prototype screen: Payment Details (settlement routing, wage ledger, audit trail, receipt, dispute)
import React, { useEffect, useState } from 'react';
import { View, Text, Share } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Badge, Field, useLoad, money, run } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function PaymentDetailsScreen({ route, navigation }) {
  const { user } = useAuth();
  const { data: p, loading, error, reload } = useLoad(() => api.get(`/payments/${route.params.id}`), [route.params.id]);
  const [note, setNote] = useState('');
  useEffect(() => { if (p) setNote(p.note || ''); }, [p?._id]);
  const saveNote = () => run(async () => { await api.put(`/payments/${p._id}/note`, { note }); reload(); });
  const confirmReceipt = () => run(async () => { await api.post(`/payments/${p._id}/confirm`); reload(); }, 'Cannot confirm');
  const b = p?.breakdown || {};
  const receipt = () => Share.share({ message: `Vedakaru Payment Receipt\nRef: ${p.reference}\nJob: ${p.job?.title}\nFrom: ${p.payer?.businessName || p.payer?.name}\nTo: ${p.payee?.name}\nBase: ${money(b.base)}\nOvertime: ${money(b.overtime)}\nTravel: ${money(b.travel)}\nBonus: ${money(b.bonus)}\nTotal: ${money(p.amount)}\nMethod: ${p.method}\nStatus: ${p.status}` });

  return (
    <Screen title="Payment Details" loading={loading} error={error} onRefresh={reload}>
      {p && (<>
        <Card style={{ backgroundColor: C.navy, borderColor: C.navy }}>
          <Badge text={p.status === 'disputed' ? 'DISPUTED' : 'PAYMENT SETTLED & VERIFIED'} color={p.status === 'disputed' ? C.danger : C.green} bg={p.status === 'disputed' ? C.dangerBg : C.greenBg} />
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 8 }}>LKR {Math.round(p.amount).toLocaleString('en-US')}</Text>
          <Text style={{ color: '#BFD0FF' }}>{p.job?.title}</Text>
          <Text style={{ color: '#BFD0FF', marginTop: 4, fontSize: 12 }}>Txn ID: {p.reference} • {new Date(p.createdAt).toLocaleString()}</Text>
        </Card>

        <H>Settlement Routing</H>
        <Card>
          <Muted>Employer / Payer</Muted><Text style={{ fontWeight: '800', marginBottom: 6 }}>{p.payer?.businessName || p.payer?.name}</Text>
          <Muted>Beneficiary</Muted><Text style={{ fontWeight: '800', marginBottom: 6 }}>{p.payee?.name}</Text>
          <Muted>Settlement channel</Muted><Text style={{ fontWeight: '800' }}>{p.method}</Text>
        </Card>

        <H>Shift Wage Ledger</H>
        <Card>
          {[['Base daily wage', b.base], ['Overtime', b.overtime], ['Travel allowance', b.travel], ['Bonus / extras', b.bonus]].map(([l, v]) => <Row key={l} style={{ justifyContent: 'space-between', paddingVertical: 5 }}><Text>{l}</Text><Text style={{ fontWeight: '700' }}>{money(v || 0)}</Text></Row>)}
          <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.border, paddingTop: 8, marginTop: 4 }}><Text style={{ fontWeight: '800' }}>TOTAL NET PAYOUT</Text><Text style={{ fontWeight: '800', color: C.primary, fontSize: 17 }}>{money(p.amount)}</Text></Row>
        </Card>

        <H>Audit Trail & Verification</H>
        <Card>{p.audit.map((a, i) => (
          <Row key={i} style={{ paddingVertical: 6 }}><Text style={{ color: C.green, marginRight: 8 }}>✔</Text><View style={{ flex: 1 }}><Text style={{ fontWeight: '600' }}>{a.label}</Text><Muted>{new Date(a.at).toLocaleString()}</Muted></View></Row>))}
        </Card>

        <H>My Note</H>
        <Field multiline maxLength={300} placeholder="Add a private note about this payment..." value={note} onChangeText={setNote} />
        <Btn small title="Save Note" variant="soft" onPress={saveNote} />
        {user.role === 'worker' && p.kind === 'wage' && (p.confirmedAt ? <Badge text="RECEIPT CONFIRMED" /> : <Btn title="Confirm I Received This Payment" variant="green" icon="checkmark-circle" onPress={confirmReceipt} />)}
        <Btn title="Download Official Bank Receipt" icon="download" variant="amber" onPress={receipt} />
        <Btn title="Share Receipt via WhatsApp / SMS" icon="share-social" variant="soft" onPress={receipt} />
        {p.job && <Btn title="Report Payment Discrepancy" icon="flag" variant="danger" onPress={() => navigation.navigate('EscrowDispute', { jobId: p.job._id, paymentId: p._id })} />}
        <Muted style={{ textAlign: 'center', marginTop: 10 }}>Fair Wage Helpline 1388 (toll-free)</Muted>
      </>)}
    </Screen>
  );
}
