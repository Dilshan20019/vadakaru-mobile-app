// Prototype screen: Settings (worker): availability, account, wallet & payouts, notifications, support
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Avatar, Field, SettingRow, NavRow, run, confirm, money } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { LANGS } from '../constants';
import { C } from '../theme';
import { Alert } from 'react-native';

export default function WorkerSettingsScreen({ navigation }) {
  const { user, refresh, logout } = useAuth();
  const st = user.settings || {};
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', location: user.location || '', trade: user.trade || '' });
  const [edit, setEdit] = useState(false);
  const [rate, setRate] = useState('');
  const [skill, setSkill] = useState('');

  const upd = (body, msg) => run(async () => { await api.put('/profile', body); await refresh(); if (msg) Alert.alert('Saved', msg); }, 'Could not save');
  const setting = (k) => (v) => run(async () => { await api.put('/profile/settings', { [k]: v }); await refresh(); });
  const addSkill = () => run(async () => { await api.post('/profile/skills', { skill }); setSkill(''); await refresh(); });
  const delSkill = (s) => run(async () => { await api.del(`/profile/skills/${encodeURIComponent(s)}`); await refresh(); });
  const del = () => confirm('Delete account?', 'This permanently deletes your profile and history.', 'Delete', () => run(async () => { await api.del('/profile'); await logout(); }));

  return (
    <Screen title="Settings">
      <Card>
        <Row><Avatar name={user.name} size={56} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontWeight: '800', fontSize: 17 }}>{user.name}</Text><Muted>{user.trade}</Muted><Muted>{user.phone}</Muted></View></Row>
        <Btn small title="View Ratings" variant="soft" onPress={() => navigation.navigate('WorkerRatings', { workerId: user._id })} />
      </Card>
      <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
        <Row style={{ justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>Available for immediate hire</Text><Text style={{ color: '#DDE6FF', fontSize: 12 }}>Open to review work today</Text></View>
          <Btn small title={user.available ? 'ON' : 'OFF'} variant={user.available ? 'amber' : 'outline'} onPress={() => upd({ available: !user.available })} /></Row>
      </Card>

      <H>Account</H>
      <Card>
        <Btn small title={edit ? 'Cancel' : 'Personal Details & Trade'} variant="soft" onPress={() => setEdit(!edit)} />
        {edit && (<View style={{ marginTop: 8 }}>
          <Field label="Full Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label="Trade" value={f.trade} onChangeText={(v) => setF({ ...f, trade: v })} />
          <Field label="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
          <Field label="Location" value={f.location} onChangeText={(v) => setF({ ...f, location: v })} />
          <Btn title="Save" onPress={() => upd(f, 'Profile updated.').then(() => setEdit(false))} />
        </View>)}
        <Text style={{ fontWeight: '700', marginTop: 10 }}>Skills</Text>
        <Row style={{ flexWrap: 'wrap', marginTop: 6 }}>{(user.skills || []).map((s) => <Chip key={s} label={`${s}  ✕`} onPress={() => delSkill(s)} />)}</Row>
        <Row style={{ gap: 8 }}><View style={{ flex: 1 }}><Field placeholder="Add a skill" value={skill} onChangeText={setSkill} /></View><Btn small title="Add" disabled={!skill.trim()} onPress={addSkill} /></Row>
        <Text style={{ fontWeight: '700', marginTop: 6 }}>Language</Text>
        <Row style={{ marginTop: 6 }}>{LANGS.map(([k, l]) => <Chip key={k} label={l} active={(st.language || 'en') === k} onPress={() => setting('language')(k)} />)}</Row>
      </Card>

      <H>Wallet & Payouts</H>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><View><Text style={{ fontWeight: '700' }}>Daily Standard Rate</Text><Text style={{ color: C.primary, fontWeight: '800', fontSize: 18 }}>{money(user.dailyRate)}</Text></View>
          <View style={{ width: 130 }}><Field keyboardType="numeric" placeholder="New rate" value={rate} onChangeText={setRate} /></View></Row>
        <Btn small title="Update Rate" disabled={!rate} onPress={() => upd({ dailyRate: Number(rate) }, 'Daily rate updated.').then(() => setRate(''))} />
        <NavRow icon="card" label="Bank Account & Settlement Methods" onPress={() => navigation.navigate('EarningsWallet')} />
        <NavRow icon="receipt" label="Payment History & Statements" onPress={() => navigation.navigate('EarningsWallet')} />
      </Card>

      <H>Notifications</H>
      <Card>
        <SettingRow icon="notifications" label="Job Alerts (District Alerts)" sub="Nearby jobs in your area" value={st.jobAlerts} onChange={setting('jobAlerts')} />
        <SettingRow icon="call" label="Direct Calls & Inquiries" sub="Direct contacts from employers" value={st.directCalls} onChange={setting('directCalls')} />
        <SettingRow icon="chatbubble" label="SMS Alerts" sub="Send SMS alerts when offline" value={st.smsAlerts} onChange={setting('smsAlerts')} />
      </Card>

      <H>Security & Support</H>
      <Card>
        <NavRow icon="shield-checkmark" label="Safety Center" onPress={() => navigation.navigate('SafetyCenter', {})} />
        <NavRow icon="help-circle" label="Help & Support (Report a Problem)" onPress={() => navigation.navigate('ReportProblem')} />
      </Card>

      <Btn title="Log Out" icon="log-out" variant="outline" onPress={() => confirm('Log out?', '', 'Log out', logout, false)} />
      <Btn title="Delete Account" icon="trash" variant="danger" onPress={del} />
    </Screen>
  );
}
