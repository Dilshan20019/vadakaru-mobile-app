import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Screen, Card, SectionTitle, Field, Button, Muted, Chip, ChipRow } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { DISTRICTS } from '../constants';

const NIC_RE = /^(\d{9}[vVxX]|\d{12})$/;

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const isWorker = user.role === 'worker';

  const [f, setF] = useState({
    fullName: user.fullName, displayName: user.displayName, phone: user.phone, nic: user.nic,
    homeDistrict: user.homeDistrict, nearestTown: user.nearestTown, avatarUrl: user.avatarUrl,
    companyName: user.companyName, emergencyName: user.emergency?.name || '', emergencyPhone: user.emergency?.phone || '',
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  // UPDATE profile
  const save = async () => {
    if (f.fullName.trim().length < 3) return Alert.alert('Invalid name', 'Enter your full legal name.');
    if (isWorker && f.nic && !NIC_RE.test(f.nic.trim())) return Alert.alert('Invalid NIC', 'NIC must be 9 digits + V/X, or 12 digits.');
    setBusy(true);
    try {
      const { data } = await api.put('/profile', {
        fullName: f.fullName.trim(), displayName: f.displayName.trim(), phone: f.phone, nic: f.nic.trim(),
        homeDistrict: f.homeDistrict, nearestTown: f.nearestTown, avatarUrl: f.avatarUrl, companyName: f.companyName,
        emergency: { name: f.emergencyName, phone: f.emergencyPhone },
      });
      setUser(data.user);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // UPDATE password
  const changePassword = async () => {
    try {
      await api.put('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      Alert.alert('Done', 'Your password has been updated.');
    } catch (e) {
      Alert.alert('Could not change password', errMsg(e));
    }
  };

  return (
    <Screen footer={<Button title="Save Changes" variant="accent" onPress={save} loading={busy} />}>
      <SectionTitle icon="person-outline">Personal Information</SectionTitle>
      <Field label="Full Legal Name" value={f.fullName} onChangeText={set('fullName')} />
      <Field label="Display / Calling Name" value={f.displayName} onChangeText={set('displayName')} hint="Shown directly on employer shift search cards" />
      <Field label="Phone Number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Field label="Profile Photo Link (optional)" value={f.avatarUrl} onChangeText={set('avatarUrl')} autoCapitalize="none" placeholder="https://..." />

      {isWorker ? (
        <>
          <Field label="National Identity Card (NIC)" value={f.nic} onChangeText={set('nic')} autoCapitalize="characters" />
          <SectionTitle icon="location-outline">Location</SectionTitle>
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Base Home District</Text>
          <ChipRow scroll>{DISTRICTS.map((d) => <Chip key={d} label={d} selected={f.homeDistrict === d} onPress={() => set('homeDistrict')(d)} />)}</ChipRow>
          <Field style={{ marginTop: 8 }} label="Nearest Town" value={f.nearestTown} onChangeText={set('nearestTown')} />

          <SectionTitle icon="call-outline">Emergency Contact (Next of Kin)</SectionTitle>
          <Field label="Contact Person & Relationship" value={f.emergencyName} onChangeText={set('emergencyName')} placeholder="Nimali Perera (Spouse)" />
          <Field label="Emergency Phone Number" value={f.emergencyPhone} onChangeText={set('emergencyPhone')} keyboardType="phone-pad" />
          <Muted style={{ marginBottom: 12 }}>Trade, wage, skills and equipment are edited from the Profile tab → Manage.</Muted>
        </>
      ) : (
        <Field label="Company / Household Name" value={f.companyName} onChangeText={set('companyName')} />
      )}

      <Card>
        <SectionTitle icon="lock-closed-outline">Change Password</SectionTitle>
        <Field label="Current password" value={pw.currentPassword} onChangeText={(v) => setPw({ ...pw, currentPassword: v })} secureTextEntry />
        <Field label="New password" value={pw.newPassword} onChangeText={(v) => setPw({ ...pw, newPassword: v })} secureTextEntry />
        <Button title="Update Password" variant="outline" small onPress={changePassword} />
      </Card>
    </Screen>
  );
}
