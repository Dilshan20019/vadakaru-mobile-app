import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, Modal, FlatList, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from 'expo-router/react-navigation';
import * as ImagePicker from 'expo-image-picker';
import { C } from './theme';
import { useAuth } from './AuthContext';

export const money = (n) => 'Rs. ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const run = async (fn, title = 'Something went wrong') => {
  try { return await fn(); } catch (e) { Alert.alert(title, e.message); }
};
export const confirm = (title, message, okText, onOk, destructive = true) =>
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: okText, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);

// loads data on mount and every time the screen regains focus
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    try { setError(null); setData(await fn()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, deps);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { data, loading, error, reload: load };
}

export function Screen({ title, children, onRefresh, loading, error, footer, noBack, right }) {
  const nav = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        {nav.canGoBack() && !noBack ? (
          <TouchableOpacity onPress={() => nav.goBack()} style={s.hBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></TouchableOpacity>
        ) : <View style={s.hBtn} />}
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {right || (
          <TouchableOpacity disabled={!user} onPress={() => nav.navigate(user.role === 'employer' ? 'SettingsHelp' : 'WorkerSettings')} style={s.avatarSm}>
            <Ionicons name="person" size={15} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {loading ? <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
        : error ? (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={C.muted} />
            <Text style={[s.muted, { textAlign: 'center', margin: 12 }]}>{error}</Text>
            {onRefresh && <Btn title="Retry" onPress={onRefresh} small />}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: footer ? 110 : 32 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); }} /> : undefined}
          >
            {children}
          </ScrollView>
        )}
      {footer && !loading && !error ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export async function pickImage() {
  const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.3 });
  if (r.canceled || !r.assets?.length || !r.assets[0].base64) return null;
  const a = r.assets[0];
  return `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`;
}

export const SettingRow = ({ icon, label, sub, value, onChange }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border }}>
    {icon ? <Ionicons name={icon} size={20} color={C.primary} style={{ marginRight: 10 }} /> : null}
    <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: C.text }}>{label}</Text>{sub ? <Text style={s.muted}>{sub}</Text> : null}</View>
    <Switch value={!!value} onValueChange={onChange} trackColor={{ true: C.green }} />
  </View>
);

export const NavRow = ({ icon, label, sub, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border }}>
    {icon ? <Ionicons name={icon} size={20} color={C.primary} style={{ marginRight: 10 }} /> : null}
    <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', color: C.text }}>{label}</Text>{sub ? <Text style={s.muted}>{sub}</Text> : null}</View>
    <Ionicons name="chevron-forward" size={18} color={C.muted} />
  </TouchableOpacity>
);

export function Collapse({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: 1, borderColor: C.border }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </TouchableOpacity>
      {open ? <View style={{ paddingBottom: 12 }}>{children}</View> : null}
    </View>
  );
}

export const Stepper = ({ value, onChange, step = 1, min = 0, format = (v) => v }) => (
  <Row>
    <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))} style={s.step}><Text style={s.stepT}>−</Text></TouchableOpacity>
    <Text style={{ minWidth: 54, textAlign: 'center', fontWeight: '800' }}>{format(value)}</Text>
    <TouchableOpacity onPress={() => onChange(value + step)} style={s.step}><Text style={s.stepT}>+</Text></TouchableOpacity>
  </Row>
);

export const timeStr = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const H = ({ children, style }) => <Text style={[s.h, style]}>{children}</Text>;
export const Muted = ({ children, style, ...p }) => <Text style={[s.muted, style]} {...p}>{children}</Text>;
export const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

export function Btn({ title, onPress, variant = 'primary', icon, disabled, loading, small, style }) {
  const bg = { primary: C.primary, amber: C.amber, green: C.green, outline: '#fff', soft: C.blueBg, danger: C.dangerBg }[variant];
  const fg = { primary: '#fff', amber: '#1F2937', green: '#fff', outline: C.primary, soft: C.primary, danger: C.danger }[variant];
  return (
    <TouchableOpacity activeOpacity={0.8} disabled={disabled || loading} onPress={onPress}
      style={[s.btn, small && { paddingVertical: 8, paddingHorizontal: 14 }, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: C.primary }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <Row style={{ justifyContent: 'center' }}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 17} color={fg} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
        </Row>
      )}
    </TouchableOpacity>
  );
}

export function Field({ label, icon, style, ...p }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.inputWrap, p.multiline && { alignItems: 'flex-start' }]}>
        {icon ? <Ionicons name={icon} size={18} color={C.muted} style={{ marginRight: 8, marginTop: p.multiline ? 12 : 0 }} /> : null}
        <TextInput placeholderTextColor="#9CA3AF" {...p}
          style={[{ flex: 1, paddingVertical: 12, color: C.text, fontSize: 15 }, p.multiline && { minHeight: 80, textAlignVertical: 'top' }, style]} />
      </View>
    </View>
  );
}

export const Chip = ({ label, active, onPress, style }) => (
  <TouchableOpacity onPress={onPress} style={[s.chip, active && { backgroundColor: C.primary, borderColor: C.primary }, style]}>
    <Text style={{ color: active ? '#fff' : C.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
  </TouchableOpacity>
);

export const Badge = ({ text, color = C.green, bg = C.greenBg, icon }) => (
  <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}>
    {icon ? <Ionicons name={icon} size={11} color={color} style={{ marginRight: 3 }} /> : null}
    <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{text}</Text>
  </View>
);

export const Stat = ({ value, label, icon, color = C.primary }) => (
  <View style={[s.card, { flex: 1, marginBottom: 0, alignItems: 'center', paddingVertical: 12 }]}>
    {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
    <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>{value}</Text>
    <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>{label}</Text>
  </View>
);

export function Avatar({ name = '?', size = 36, bg = C.primary }) {
  const t = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size / 2.6 }}>{t}</Text>
    </View>
  );
}

export const Stars = ({ value = 0, onChange, size = 28 }) => (
  <Row>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} disabled={!onChange} onPress={() => onChange(n)}>
        <Ionicons name={n <= Math.round(value) ? 'star' : 'star-outline'} size={size} color={C.amber} />
      </TouchableOpacity>
    ))}
  </Row>
);

export const Empty = ({ icon = 'file-tray-outline', text }) => (
  <View style={{ alignItems: 'center', padding: 28 }}>
    <Ionicons name={icon} size={40} color="#CBD5E1" />
    <Text style={[s.muted, { marginTop: 8, textAlign: 'center' }]}>{text}</Text>
  </View>
);

export const Segment = ({ options, value, onChange }) => (
  <View style={{ flexDirection: 'row', backgroundColor: '#E5E9F5', borderRadius: 12, padding: 3, marginBottom: 14 }}>
    {options.map((o) => (
      <TouchableOpacity key={o.key} onPress={() => onChange(o.key)}
        style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: value === o.key ? '#fff' : 'transparent' }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: value === o.key ? C.primary : C.muted }}>{o.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export function PickerModal({ visible, title, items, onPick, onClose, emptyText = 'Nothing to show' }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 16 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={s.h}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </Row>
          <FlatList data={items} keyExtractor={(i) => i.key} ListEmptyComponent={<Empty text={emptyText} />}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onPick(item)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border }}>
                <Text style={{ fontWeight: '600', color: C.text }}>{item.label}</Text>
                {item.sub ? <Text style={s.muted}>{item.sub}</Text> : null}
              </TouchableOpacity>
            )} />
        </View>
      </View>
    </Modal>
  );
}

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: C.border },
  hBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: C.text },
  avatarSm: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  h: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 6 },
  muted: { fontSize: 12.5, color: C.muted },
  label: { fontSize: 12.5, fontWeight: '700', color: C.text, marginBottom: 5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F4FB', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  btn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, marginRight: 8, marginBottom: 8 },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blueBg, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 18, fontWeight: '800', color: C.primary, marginTop: -2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.border },
});
