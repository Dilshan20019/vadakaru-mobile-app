// Prototype screen: Settings & Help (employer): escrow & shift controls, language, trust & legal, FAQs, profile
import React, { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { Screen, Card, H, Muted, Row, Btn, Chip, Badge, Avatar, Field, SettingRow, NavRow, Collapse, run, confirm } from '../ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { LANGS, FAQS } from '../constants';
import { C } from '../theme';
import { Alert } from 'react-native';

export default function SettingsHelpScreen({ navigation }) {
  const { user, refresh, logout } = useAuth();
  const st = user.settings || {};
  const [f, setF] = useState({ businessName: user.businessName || '', name: user.name || '', phone: user.phone || '', location: user.location || '' });
  const [edit, setEdit] = useState(false);

  const setting = (k) => (v) => run(async () => { await api.put('/profile/settings', { [k]: v }); await refresh(); });
  const saveProfile = () => run(async () => { await api.put('/profile', f); await refresh(); setEdit(false); Alert.alert('Saved', 'Profile updated.'); }, 'Could not save');
  const del = () => confirm('Delete account?', 'This permanently deletes your profile, jobs, messages and reports.', 'Delete', () => run(async () => { await api.del('/profile'); await logout(); }));

  return (
    <Screen title="Settings & Help">
      <Card>
        <Row><Avatar name={user.name} size={56} bg={C.navy} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontWeight: '800', fontSize: 17 }}>{user.name}</Text><Muted>{user.businessName}</Muted><Muted>{user.email}</Muted>{user.verified && <Badge text="Verified Employer" icon="checkmark" />}</View></Row>
        <Btn small title={edit ? 'Cancel' : 'Edit Profile'} variant="soft" onPress={() => setEdit(!edit)} />
        {edit && (<View style={{ marginTop: 8 }}>
          <Field label="Business Name" value={f.businessName} onChangeText={(v) => setF({ ...f, businessName: v })} />
          <Field label="Contact Person" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label="Phone" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
          <Field label="Location" value={f.location} onChangeText={(v) => setF({ ...f, location: v })} />
          <Btn title="Save Profile" onPress={saveProfile} />
        </View>)}
      </Card>

      <Card style={{ backgroundColor: C.primary, borderColor: C.primary }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Need immediate site support?</Text>
        <Text style={{ color: '#DDE6FF' }}>Our team is available 24/7 for disputes and emergencies.</Text>
        <Row style={{ gap: 8 }}><Btn small title="Call 1388" variant="amber" icon="call" onPress={() => Linking.openURL('tel:1388')} style={{ flex: 1 }} /><Btn small title="Report a Problem" variant="outline" onPress={() => navigation.navigate('ReportProblem')} style={{ flex: 1 }} /></Row>
      </Card>

      <H>Escrow & Shift Controls</H>
      <Card>
        <SettingRow icon="cash" label="Overtime Approval" sub="Approve overtime before it is added to payouts" value={st.overtimeApproval} onChange={setting('overtimeApproval')} />
        <SettingRow icon="checkmark-done" label="Auto-Signoff at 17:00" sub="Sign off shifts automatically at the end of day" value={st.autoSignoff} onChange={setting('autoSignoff')} />
        <SettingRow icon="flash" label="Auto-Release Escrow" sub="Release wages right after sign-off" value={st.autoRelease} onChange={setting('autoRelease')} />
      </Card>

      <H>Language & Alerts</H>
      <Card>
        <Row>{LANGS.map(([k, l]) => <Chip key={k} label={l} active={(st.language || 'en') === k} onPress={() => setting('language')(k)} />)}</Row>
        <SettingRow icon="chatbubble" label="SMS & WhatsApp Alerts" value={st.smsAlerts} onChange={setting('smsAlerts')} />
      </Card>

      <H>Trust, Safety & Legal</H>
      <Card>
        <NavRow icon="shield-checkmark" label="Safety Center" sub="SOS, hazards and PPE roll-call" onPress={() => navigation.navigate('SafetyCenter', {})} />
        <NavRow icon="flag" label="Report a Problem" onPress={() => navigation.navigate('ReportProblem')} />
        <NavRow icon="receipt" label="Payment History" onPress={() => navigation.navigate('EarningsWallet')} />
      </Card>

      <H>Help Topics & FAQs</H>
      <Card>{FAQS.map(([q, a]) => <Collapse key={q} title={q}><Muted>{a}</Muted></Collapse>)}</Card>

      <Btn title="Log Out" icon="log-out" variant="outline" onPress={() => confirm('Log out?', '', 'Log out', logout, false)} />
      <Btn title="Delete Account" icon="trash" variant="danger" onPress={del} />
      <Muted style={{ textAlign: 'center', marginTop: 10 }}>Vedakaru v1.0 • Made for Sri Lankan workers</Muted>
    </Screen>
  );
}
