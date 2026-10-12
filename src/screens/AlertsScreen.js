import React, { useCallback, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Chip, ChipRow, Muted, Row, Stepper, Empty, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { DISTRICTS, TRADES } from '../constants';
import { colors } from '../theme';

export default function AlertsScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [trade, setTrade] = useState(user.primaryTrade || '');
  const [district, setDistrict] = useState(user.homeDistrict || '');
  const [minWage, setMinWage] = useState(0);

  // READ alerts (each shows how many open jobs match right now)
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/alerts');
      setAlerts(data.alerts);
    } catch (e) {
      Alert.alert('Could not load alerts', errMsg(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // CREATE alert
  const add = async () => {
    try {
      await api.post('/alerts', { trade, district, minWage });
      load();
    } catch (e) {
      Alert.alert('Could not create alert', errMsg(e));
    }
  };

  // UPDATE enabled flag
  const toggle = async (a, enabled) => {
    setAlerts((cur) => cur.map((x) => (x._id === a._id ? { ...x, enabled } : x)));
    try {
      await api.put(`/alerts/${a._id}`, { enabled });
    } catch (e) {
      Alert.alert('Could not update alert', errMsg(e));
      load();
    }
  };

  // DELETE alert
  const remove = (a) =>
    Alert.alert('Delete alert', `Delete "${a.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/alerts/${a._id}`); load(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  return (
    <Screen>
      <Card tone="orange">
        <Text style={{ fontWeight: '800' }}>SMS Job Alerts</Text>
        <Muted style={{ marginTop: 4 }}>We send a free SMS the moment a matching job is posted. Free service • Standard SMS rates may apply.</Muted>
      </Card>

      <Card>
        <SectionTitle icon="add-circle-outline">New Alert</SectionTitle>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Trade</Text>
        <ChipRow>
          <Chip label="Any" selected={!trade} onPress={() => setTrade('')} />
          {TRADES.map((t) => <Chip key={t} label={t} selected={trade === t} onPress={() => setTrade(t)} />)}
        </ChipRow>
        <Text style={{ fontWeight: '700', marginVertical: 6 }}>District</Text>
        <ChipRow scroll>
          <Chip label="Any" selected={!district} onPress={() => setDistrict('')} />
          {DISTRICTS.map((d) => <Chip key={d} label={d} selected={district === d} onPress={() => setDistrict(d)} />)}
        </ChipRow>
        <Text style={{ fontWeight: '700', marginVertical: 6 }}>Minimum daily wage (0 = any)</Text>
        <Stepper value={minWage} onChange={setMinWage} step={500} min={0} max={20000} format={(v) => v.toLocaleString('en-US')} />
        <Button title="Create Alert" icon="notifications-outline" onPress={add} style={{ marginTop: 12 }} />
      </Card>

      <SectionTitle icon="notifications-outline">My Alerts ({alerts.length})</SectionTitle>
      {alerts.length === 0 ? <Empty text="No alerts yet. Create one above to hear about new jobs first." /> : null}
      {alerts.map((a) => (
        <Card key={a._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontWeight: '800' }}>{a.label}</Text>
              <Muted>{a.minWage ? `From ${money(a.minWage)}/day • ` : ''}{a.matches} open job(s) match now</Muted>
            </View>
            <Switch value={a.enabled} onValueChange={(v) => toggle(a, v)} trackColor={{ true: colors.primary }} />
            <TouchableOpacity onPress={() => remove(a)} style={{ marginLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
