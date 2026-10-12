import React, { useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Chip, ChipRow, Field, Button, Stepper, Muted, Row, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { TRADES, AUTHORITY, LEVELS, SPECIALIZATION_SUGGESTIONS } from '../constants';
import { colors } from '../theme';

export default function TradesSkillsScreen() {
  const router = useRouter();
  const { onboarding: onboardingParam } = useLocalSearchParams();
  const onboarding = Array.isArray(onboardingParam)
    ? onboardingParam.includes('true')
    : onboardingParam === 'true';
  const { user, setUser } = useAuth();

  const [primary, setPrimary] = useState(user.primaryTrade);
  const [secondary, setSecondary] = useState(user.secondaryTrade);
  const [years, setYears] = useState(user.experienceYears || 0);
  const [authority, setAuthority] = useState(user.authority || 'Helper');
  const [seasonal, setSeasonal] = useState(user.seasonalTradesEnabled);
  const [busy, setBusy] = useState(false);

  const [newSpec, setNewSpec] = useState('');
  const [cert, setCert] = useState({ title: '', issuer: '', certNo: '' });
  const [newTool, setNewTool] = useState('');
  const [work, setWork] = useState({ title: '', imageUrl: '' });

  // Helper: run a sub-resource call, then store the returned user
  const run = async (fn, onOk) => {
    try {
      const { data } = await fn();
      if (data.user) setUser(data.user);
      onOk && onOk();
    } catch (e) {
      Alert.alert('Error', errMsg(e));
    }
  };

  const addSpec = (name) => {
    if (!name.trim()) return;
    run(() => api.post('/profile/specializations', { name: name.trim() }), () => setNewSpec(''));
  };
  const cycleLevel = (s) => {
    const next = LEVELS[(LEVELS.indexOf(s.level) + 1) % LEVELS.length];
    run(() => api.put(`/profile/specializations/${s._id}`, { level: next }));
  };

  const addCert = () => {
    if (!cert.title.trim()) return Alert.alert('Title required', 'Enter the certificate name.');
    run(() => api.post('/profile/certifications', cert), () => setCert({ title: '', issuer: '', certNo: '' }));
  };

  const addTool = () => newTool.trim() && run(() => api.post('/profile/tools', { name: newTool.trim() }), () => setNewTool(''));
  const cycleTool = (t) => run(() => api.put(`/profile/tools/${t._id}`, { mastery: t.mastery === 'Expert' ? 'Competent' : 'Expert' }));

  const addWork = () => {
    if (!work.title.trim()) return Alert.alert('Title required', 'Describe the job (e.g. Negombo Two-Storey Villa).');
    run(() => api.post('/profile/portfolio', work), () => setWork({ title: '', imageUrl: '' }));
  };

  const confirmDelete = (label, path) =>
    Alert.alert('Remove', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => api.delete(path)) },
    ]);

  // UPDATE trade summary
  const save = async () => {
    if (!primary) return Alert.alert('Select a trade', 'Choose your primary trade.');
    setBusy(true);
    try {
      const { data } = await api.put('/profile', {
        primaryTrade: primary, secondaryTrade: secondary, experienceYears: years, authority, seasonalTradesEnabled: seasonal,
      });
      setUser(data.user);
      if (onboarding) router.push({ pathname: '/Wage', params: { onboarding: 'true' } });
      else router.back();
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const Remove = ({ onPress }) => (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="trash-outline" size={20} color={colors.danger} />
    </TouchableOpacity>
  );

  return (
    <Screen footer={<Button title={onboarding ? 'Save & Set Wages' : 'Save Skills & Update Match Radar'} variant="accent" onPress={save} loading={busy} />}>
      {onboarding ? <Muted style={{ marginBottom: 6, fontWeight: '700' }}>STEP 3 OF 5 • Trades & Skills</Muted> : null}

      <Card>
        <SectionTitle icon="construct-outline">Primary Trade</SectionTitle>
        <ChipRow>{TRADES.map((t) => <Chip key={t} label={t} selected={primary === t} onPress={() => setPrimary(t)} />)}</ChipRow>
        <Field label="Secondary Trade" value={secondary} onChangeText={setSecondary} placeholder="e.g. Reinforced Concreting & Formwork" style={{ marginTop: 8 }} />
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Field Experience</Text>
        <Stepper value={years} onChange={setYears} min={0} max={60} suffix=" Years" />
        <Text style={{ fontWeight: '700', marginTop: 12, marginBottom: 6 }}>Worksite Authority</Text>
        <ChipRow>{AUTHORITY.map((a) => <Chip key={a} label={a} selected={authority === a} onPress={() => setAuthority(a)} />)}</ChipRow>
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontWeight: '700', flex: 1 }}>Seasonal Secondary Trades</Text>
          <Switch value={seasonal} onValueChange={setSeasonal} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="layers-outline">Specializations ({user.specializations.length})</SectionTitle>
        {user.specializations.length === 0 ? <Muted>No specializations yet. Add your first below.</Muted> : null}
        {user.specializations.map((s) => (
          <Row key={s._id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ flex: 1, fontWeight: '600' }}>{s.name}</Text>
            <TouchableOpacity onPress={() => cycleLevel(s)} style={{ marginRight: 12 }}><Badge text={`${s.level} ⟳`} tone={s.level === 'Master' || s.level === 'Expert' ? 'orange' : 'blue'} /></TouchableOpacity>
            <Remove onPress={() => confirmDelete(s.name, `/profile/specializations/${s._id}`)} />
          </Row>
        ))}
        <Muted style={{ marginTop: 8 }}>Suggested for your area (tap to add):</Muted>
        <ChipRow>
          {SPECIALIZATION_SUGGESTIONS.filter((x) => !user.specializations.some((s) => s.name === x)).map((x) => (
            <Chip key={x} label={`+ ${x}`} onPress={() => addSpec(x)} />
          ))}
        </ChipRow>
        <Row>
          <View style={{ flex: 1 }}><Field value={newSpec} onChangeText={setNewSpec} placeholder="Add custom specialization" style={{ marginBottom: 0 }} /></View>
          <Button title="Add" small onPress={() => addSpec(newSpec)} style={{ marginLeft: 8 }} />
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="ribbon-outline">Credentials & Certifications</SectionTitle>
        {user.certifications.map((c) => (
          <Row key={c._id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{c.title}</Text>
              <Muted>{[c.issuer, c.certNo].filter(Boolean).join(' • ')}</Muted>
            </View>
            <Remove onPress={() => confirmDelete(c.title, `/profile/certifications/${c._id}`)} />
          </Row>
        ))}
        <Field label="Certificate name" value={cert.title} onChangeText={(v) => setCert({ ...cert, title: v })} placeholder="NVQ Level 4 - Masonry" style={{ marginTop: 10 }} />
        <Field label="Issuer" value={cert.issuer} onChangeText={(v) => setCert({ ...cert, issuer: v })} placeholder="TVEC / NAITA" />
        <Field label="Certificate No." value={cert.certNo} onChangeText={(v) => setCert({ ...cert, certNo: v })} placeholder="SL-NVQ-2019-88412" />
        <Button title="Add Certificate" small variant="outline" onPress={addCert} />
      </Card>

      <Card>
        <SectionTitle icon="build-outline">Equipment & Power Tool Mastery</SectionTitle>
        {user.tools.map((t) => (
          <Row key={t._id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ flex: 1, fontWeight: '600' }}>{t.name}</Text>
            <TouchableOpacity onPress={() => cycleTool(t)} style={{ marginRight: 12 }}><Badge text={`${t.mastery} ⟳`} tone={t.mastery === 'Expert' ? 'green' : 'blue'} /></TouchableOpacity>
            <Remove onPress={() => confirmDelete(t.name, `/profile/tools/${t._id}`)} />
          </Row>
        ))}
        <Row style={{ marginTop: 10 }}>
          <View style={{ flex: 1 }}><Field value={newTool} onChangeText={setNewTool} placeholder="Add tool (e.g. Concrete Cutter)" style={{ marginBottom: 0 }} /></View>
          <Button title="Add" small onPress={addTool} style={{ marginLeft: 8 }} />
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="images-outline">Recent Site Workmanship</SectionTitle>
        {user.portfolio.map((p) => (
          <Row key={p._id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{p.title}</Text>
              {p.imageUrl ? <Muted numberOfLines={1}>{p.imageUrl}</Muted> : null}
            </View>
            <Remove onPress={() => confirmDelete(p.title, `/profile/portfolio/${p._id}`)} />
          </Row>
        ))}
        <Field label="Job title" value={work.title} onChangeText={(v) => setWork({ ...work, title: v })} placeholder="Negombo Two-Storey Villa" style={{ marginTop: 10 }} />
        <Field label="Photo link (optional)" value={work.imageUrl} onChangeText={(v) => setWork({ ...work, imageUrl: v })} placeholder="https://..." autoCapitalize="none" />
        <Button title="Add Photo Entry" small variant="outline" onPress={addWork} />
      </Card>
    </Screen>
  );
}
