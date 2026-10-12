import React, { useCallback, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Muted, Row, Badge, Chip, ChipRow, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import api, { errMsg } from '../api/client';
import { colors } from '../theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, refresh, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const isWorker = user.role === 'worker';
  const [busy, setBusy] = useState(false);

  // READ latest profile whenever the tab is focused
  useFocusEffect(useCallback(() => { refresh().catch(() => {}); }, [refresh]));

  // UPDATE availability toggle
  const toggleAvailable = async (v) => {
    setUser({ ...user, availableToday: v });
    try {
      const { data } = await api.put('/profile', { availableToday: v });
      setUser(data.user);
    } catch (e) {
      setUser({ ...user, availableToday: !v });
      Alert.alert('Could not update', errMsg(e));
    }
  };

  // UPDATE language preference
  const changeLang = async (l) => {
    setLang(l);
    try {
      const { data } = await api.put('/profile', { language: l });
      setUser(data.user);
    } catch (e) { /* language still applies locally */ }
  };

  // UPDATE role (dual-account flexibility from the prototype)
  const switchRole = () => {
    const next = isWorker ? 'employer' : 'worker';
    Alert.alert('Switch mode', `Switch to ${next} mode?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          try {
            const { data } = await api.put('/profile', { role: next, onboardingComplete: true, companyName: user.companyName || user.fullName });
            setUser(data.user);
          } catch (e) { Alert.alert('Could not switch', errMsg(e)); }
        },
      },
    ]);
  };

  // DELETE account
  const deleteAccount = () =>
    Alert.alert('Delete account', 'This permanently deletes your profile. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try { await api.delete('/auth/me'); await logout(); } catch (e) { Alert.alert('Failed', errMsg(e)); setBusy(false); }
        },
      },
    ]);

  // confirmation dialog before signing out
  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need your mobile number and password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);

  const Link = ({ icon, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 12 }} />
      <Text style={{ flex: 1, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );

  return (
    <Screen>
      <Card>
        <Row>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>{(user.displayName || user.fullName || '?')[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '900' }}>{user.fullName}</Text>
            <Muted>{isWorker ? [user.authority, user.primaryTrade].filter(Boolean).join(' • ') : user.companyName || 'Employer'}</Muted>
            <Muted>{[user.nearestTown, user.homeDistrict].filter(Boolean).join(', ')}</Muted>
          </View>
        </Row>
        <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
          {user.phoneVerified ? <Badge text="Phone Verified" tone="green" /> : <Badge text="Phone not verified" tone="orange" />}
          {isWorker && user.nic ? <View style={{ marginLeft: 6 }}><Badge text={user.nicVerified ? 'NIC Verified' : 'NIC Pending'} tone={user.nicVerified ? 'green' : 'orange'} /></View> : null}
        </Row>
        <Button title="Edit Profile" variant="outline" small onPress={() => router.push('/EditProfile')} style={{ marginTop: 12 }} />
      </Card>

      {isWorker ? (
        <>
          <Card tone="blue">
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }}>Available for Work Today</Text>
                <Muted>Instantly visible to nearby contractors.</Muted>
              </View>
              <Switch value={user.availableToday} onValueChange={toggleAvailable} trackColor={{ true: colors.primary }} />
            </Row>
            <Text style={{ fontWeight: '900', fontSize: 20, color: colors.primary, marginTop: 8 }}>{money(user.wage.fullDay)} <Text style={{ fontSize: 12 }}>/ day</Text></Text>
          </Card>

          <Row style={{ marginBottom: 12 }}>
            {[[user.rating ? `${user.rating}★` : '—', 'Rating'], [user.jobsCompleted, 'Jobs Done'], [`${user.experienceYears} yrs`, 'Experience']].map(([v, l]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 10, marginHorizontal: 3, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontWeight: '900', fontSize: 17 }}>{v}</Text><Muted>{l}</Muted>
              </View>
            ))}
          </Row>

          <Card>
            <SectionTitle icon="construct-outline" right={<TouchableOpacity onPress={() => router.push('/TradesSkills')}><Text style={{ color: colors.primary, fontWeight: '700' }}>Manage</Text></TouchableOpacity>}>Skills & Specializations</SectionTitle>
            {user.specializations.length === 0 ? <Muted>No specializations added yet.</Muted> : null}
            {user.specializations.map((s) => (
              <Row key={s._id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text>{s.name}</Text><Badge text={s.level} />
              </Row>
            ))}
          </Card>

          <Card>
            <SectionTitle icon="ribbon-outline">Certifications</SectionTitle>
            {user.certifications.length === 0 ? <Muted>No certificates added yet.</Muted> : null}
            {user.certifications.map((c) => (
              <View key={c._id} style={{ paddingVertical: 4 }}>
                <Text style={{ fontWeight: '700' }}>{c.title}</Text>
                <Muted>{[c.issuer, c.certNo].filter(Boolean).join(' • ')}</Muted>
              </View>
            ))}
          </Card>

          <Card>
            <SectionTitle icon="build-outline">Equipment Owned</SectionTitle>
            <ChipRow>{user.tools.map((t2) => <Chip key={t2._id} label={t2.name} />)}</ChipRow>
            {user.tools.length === 0 ? <Muted>No equipment listed.</Muted> : null}
          </Card>

          <Card>
            <Link icon="location-outline" label="Location & Work Zones" onPress={() => router.push('/LocationSetup')} />
            <Link icon="cash-outline" label="Wage Preferences" onPress={() => router.push('/Wage')} />
            <Link icon="calendar-outline" label="Availability Calendar" onPress={() => router.push('/Availability')} />
            <Link icon="mail-open-outline" label="Job Invitations" onPress={() => router.push('/Invitations')} />
            <Link icon="notifications-outline" label="Job Alerts" onPress={() => router.push('/Alerts')} />
            <Link icon="swap-horizontal-outline" label="Switch to Employer Mode" onPress={switchRole} />
          </Card>
        </>
      ) : (
        <Card>
          <Link icon="swap-horizontal-outline" label="Switch to Worker Mode" onPress={switchRole} />
        </Card>
      )}

      <Card>
        <SectionTitle icon="settings-outline">Account & Preferences</SectionTitle>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>App Language</Text>
        <ChipRow>
          {[['en', 'English'], ['si', 'සිංහල'], ['ta', 'தமிழ்']].map(([k, l]) => <Chip key={k} label={l} selected={lang === k} onPress={() => changeLang(k)} />)}
        </ChipRow>
      </Card>

      <Button title={t('logout')} variant="outline" onPress={confirmLogout} style={{ marginBottom: 10 }} />
      <Button title="Delete My Account" variant="danger" small onPress={deleteAccount} loading={busy} />
    </Screen>
  );
}
