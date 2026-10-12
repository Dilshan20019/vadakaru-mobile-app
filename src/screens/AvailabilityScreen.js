import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Muted, Row, Badge, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { STATUS_OPTIONS } from '../constants';
import { colors } from '../theme';

const pad = (n) => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const STATUS_STYLE = {
  open: { bg: '#fff', fg: colors.text, dot: colors.success },
  half: { bg: colors.accentSoft, fg: '#B45309', dot: colors.accent },
  ot: { bg: '#FCE7F3', fg: '#9D174D', dot: '#DB2777' },
  off: { bg: '#E2E8F0', fg: colors.muted, dot: colors.muted },
  booked: { bg: colors.primary, fg: '#fff', dot: '#fff' },
};

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState({});
  const [summary, setSummary] = useState({ open: 0, booked: 0, off: 0 });
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState('open');
  const [shifts, setShifts] = useState([]);
  const [busy, setBusy] = useState(false);

  const monthKey = `${year}-${pad(month + 1)}`;

  // READ availability for the visible month + upcoming accepted jobs
  const load = useCallback(async () => {
    try {
      const [a, j] = await Promise.all([api.get('/availability', { params: { month: monthKey } }), api.get('/jobs/applications/mine')]);
      const map = {};
      a.data.entries.forEach((e) => { map[e.date] = e; });
      setEntries(map);
      setSummary(a.data.summary);
      setShifts(j.data.applications.filter((x) => x.status === 'accepted'));
    } catch (e) {
      Alert.alert('Could not load calendar', errMsg(e));
    }
  }, [monthKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [year, month]);

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected([]);
  };

  const toggle = (key) => setSelected((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  // Quick action from the prototype: apply to remaining Thursdays & Fridays of the month
  const selectThuFri = () => {
    const days = new Date(year, month + 1, 0).getDate();
    const keys = [];
    for (let d = 1; d <= days; d++) {
      const dt = new Date(year, month, d);
      const isFuture = dt >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (isFuture && (dt.getDay() === 4 || dt.getDay() === 5)) keys.push(fmt(year, month, d));
    }
    setSelected(keys);
  };

  // CREATE / UPDATE selected dates
  const save = async () => {
    if (!selected.length) return Alert.alert('Select dates', 'Tap one or more dates on the calendar first.');
    setBusy(true);
    try {
      const { data } = await api.put('/availability', { dates: selected, status });
      if (data.skippedBooked?.length) Alert.alert('Some days were skipped', 'Confirmed (booked) shifts cannot be changed here.');
      setSelected([]);
      await load();
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // DELETE (clear) selected dates
  const clear = async () => {
    if (!selected.length) return Alert.alert('Select dates', 'Tap the dates you want to clear.');
    try {
      await api.delete('/availability', { params: { dates: selected.join(',') } });
      setSelected([]);
      await load();
    } catch (e) {
      Alert.alert('Clear failed', errMsg(e));
    }
  };

  const rateFor = (k) => ({ open: user.wage.fullDay, half: user.wage.halfDay, ot: user.wage.overtimeRate, off: 0 }[k]);

  return (
    <Screen
      footer={
        <Row>
          <Button title="Clear Selected" variant="outline" onPress={clear} style={{ flex: 1, marginRight: 8 }} />
          <Button title={`Save (${selected.length})`} variant="accent" onPress={save} loading={busy} style={{ flex: 1.4 }} />
        </Row>
      }
    >
      <Card>
        <Text style={{ fontWeight: '900', fontSize: 18 }}>{user.fullName}</Text>
        <Muted>{user.nearestTown || user.homeDistrict} • {user.rating ? `${user.rating}★` : 'New'} ({user.jobsCompleted} jobs)</Muted>
        <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
          {[['Days Open', summary.open, colors.success], ['Confirmed', summary.booked, colors.primary], ['Rest / Off', summary.off, colors.muted]].map(([l, v, c]) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', padding: 8, backgroundColor: colors.bg, borderRadius: 10, marginHorizontal: 3 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: c }}>{v}</Text>
              <Muted>{l}</Muted>
            </View>
          ))}
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => shiftMonth(-1)}><Ionicons name="chevron-back" size={24} color={colors.primary} /></TouchableOpacity>
          <Text style={{ fontWeight: '900', fontSize: 17 }}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)}><Ionicons name="chevron-forward" size={24} color={colors.primary} /></TouchableOpacity>
        </Row>
        <View style={s.grid}>
          {DOW.map((d, i) => <Text key={i} style={s.dow}>{d}</Text>)}
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={s.cell} />;
            const key = fmt(year, month, d);
            const e = entries[key];
            const st = STATUS_STYLE[e?.status];
            const sel = selected.includes(key);
            return (
              <TouchableOpacity key={key} style={s.cell} onPress={() => toggle(key)} activeOpacity={0.7}>
                <View style={[s.day, st && { backgroundColor: st.bg }, sel && { borderWidth: 2, borderColor: colors.accent }]}>
                  <Text style={{ fontWeight: '700', color: st ? st.fg : colors.text }}>{d}</Text>
                  {e ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: st.dot, marginTop: 2 }} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {[['Booked', colors.primary], ['Open', colors.success], ['Half-Day', colors.accent], ['OT', '#DB2777'], ['Off', colors.muted]].map(([l, c]) => (
            <Row key={l} style={{ marginRight: 12 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginRight: 4 }} /><Muted>{l}</Muted></Row>
          ))}
        </Row>
        <TouchableOpacity onPress={selectThuFri} style={{ marginTop: 10 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>↻ Select all remaining Thursdays & Fridays</Text>
        </TouchableOpacity>
      </Card>

      <SectionTitle icon="create-outline">Manage Selected Day(s) Status</SectionTitle>
      <Card>
        {STATUS_OPTIONS.map((o) => (
          <TouchableOpacity key={o.key} onPress={() => setStatus(o.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <Ionicons name={status === o.key ? 'radio-button-on' : 'radio-button-off'} size={22} color={status === o.key ? colors.primary : colors.muted} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{o.title}</Text>
              <Muted>{o.sub}</Muted>
            </View>
            <Text style={{ fontWeight: '800', color: colors.primary }}>{o.key === 'off' ? 'Blocked' : money(rateFor(o.key))}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <SectionTitle icon="calendar-outline">Upcoming Scheduled Shifts</SectionTitle>
      {shifts.length === 0 ? <Muted>No accepted jobs yet. Apply for jobs from the Jobs tab.</Muted> : null}
      {shifts.map((a) => (
        <Card key={a._id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800' }}>{a.job.title}</Text>
              <Muted>{a.job.employer?.companyName || a.job.employer?.fullName} • {a.job.town || a.job.district}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '900', color: colors.primary }}>{money(a.job.dailyWage * a.job.days)}</Text>
              <Badge text={`${a.job.days} day(s) • Escrow`} tone="green" />
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { width: '14.2857%', textAlign: 'center', color: colors.muted, fontWeight: '700', marginBottom: 6 },
  cell: { width: '14.2857%', alignItems: 'center', paddingVertical: 3 },
  day: { width: 38, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
