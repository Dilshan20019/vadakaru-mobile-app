import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Screen({ children, footer, scroll = true, contentStyle }) {
  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[s.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export const Card = ({ children, style, tone }) => (
  <View style={[s.card, tone === 'blue' && { backgroundColor: colors.primarySoft }, tone === 'orange' && { backgroundColor: colors.accentSoft }, style]}>
    {children}
  </View>
);

export const SectionTitle = ({ icon, children, right }) => (
  <View style={s.sectionRow}>
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: 6 }} /> : null}
      <Text style={s.sectionTitle}>{children}</Text>
    </View>
    {right}
  </View>
);

export const Muted = ({ children, style, ...rest }) => (
  <Text {...rest} style={[{ color: colors.muted, fontSize: 12 }, style]}>{children}</Text>
);

export function Field({ label, hint, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[s.input, props.multiline && { height: 90, textAlignVertical: 'top' }, error && { borderColor: colors.danger }]}
      />
      {hint ? <Muted style={{ marginTop: 3 }}>{hint}</Muted> : null}
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 3 }}>{error}</Text> : null}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, icon, style }) {
  const bg = { primary: colors.primary, accent: colors.accent, outline: 'transparent', danger: colors.danger, soft: colors.primarySoft }[variant];
  const fg = variant === 'outline' ? colors.primary : variant === 'soft' ? colors.primary : '#fff';
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1, paddingVertical: small ? 8 : 14 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 18} color={fg} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 16 }}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Chip({ label, selected, onPress, onRemove, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }, style]}
    >
      <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color={selected ? '#fff' : colors.muted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

export const ChipRow = ({ children, scroll }) =>
  scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>
  );

export function Stepper({ value, onChange, step = 1, min = 0, max = 99999, format, suffix }) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={s.stepper}>
      <TouchableOpacity onPress={dec} style={s.stepBtn}><Ionicons name="remove" size={20} color={colors.primary} /></TouchableOpacity>
      <Text style={s.stepValue}>{format ? format(value) : value}{suffix || ''}</Text>
      <TouchableOpacity onPress={inc} style={s.stepBtn}><Ionicons name="add" size={20} color={colors.primary} /></TouchableOpacity>
    </View>
  );
}

export const Badge = ({ text, tone = 'blue' }) => {
  const map = { blue: [colors.primarySoft, colors.primary], green: [colors.successSoft, colors.success], orange: [colors.accentSoft, '#B45309'], red: [colors.dangerSoft, colors.danger] };
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
};

export const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

export const Empty = ({ text }) => (
  <View style={{ alignItems: 'center', padding: 24 }}>
    <Ionicons name="file-tray-outline" size={36} color={colors.muted} />
    <Text style={{ color: colors.muted, marginTop: 8, textAlign: 'center' }}>{text}</Text>
  </View>
);

export const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const money = (n) => `LKR ${Number(n || 0).toLocaleString('en-US')}`;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  footer: { padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text },
  btn: { borderRadius: radius.md, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignSelf: 'flex-start' },
  stepBtn: { padding: 10 },
  stepValue: { minWidth: 90, textAlign: 'center', fontWeight: '800', fontSize: 16, color: colors.text },
});
