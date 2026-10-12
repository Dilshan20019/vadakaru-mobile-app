import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Muted, Row, Badge, money } from './ui';
import { PERKS } from '../constants';
import { startLabel, callPhone } from '../utils';
import { colors } from '../theme';

const STATUS_TONE = { pending: 'orange', shortlisted: 'blue', accepted: 'green', rejected: 'red', filled: 'red' };

export default function JobCard({ job: j, onPress, onApply, onToggleSave, applyLabel = 'Apply Now' }) {
  const perks = PERKS.filter((p) => j.perks?.[p.key] && p.key !== 'fairPay').slice(0, 3);
  const employerName = j.employer?.companyName || j.employer?.fullName;

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            {j.urgent ? <Badge text="URGENT HIRE • Same-day start" tone="red" /> : <Badge text={`DAILY CONTRACT${j.employer?.brVerified ? ' • Verified Site' : ''}`} tone="blue" />}
          </View>
          <Row>
            <Badge text={`${j.matchPercent}% Match`} tone="green" />
            {onToggleSave ? (
              <TouchableOpacity onPress={() => onToggleSave(j)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 8 }}>
                <Ionicons name={j.saved ? 'heart' : 'heart-outline'} size={22} color={j.saved ? colors.danger : colors.muted} />
              </TouchableOpacity>
            ) : null}
          </Row>
        </Row>

        <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 8, color: colors.text }}>{j.title}</Text>
        <Muted>
          {employerName}{j.employerRating ? ` • ${j.employerRating}★` : ''} • {[j.town, j.district].filter(Boolean).join(', ')}
          {j.distanceKm != null ? ` • ${j.distanceKm} km` : ''}
        </Muted>

        <View style={{ backgroundColor: colors.accentSoft, borderRadius: 10, padding: 10, marginTop: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Muted style={{ fontWeight: '700' }}>WAGE OFFERED</Muted>
              <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{money(j.dailyWage)} <Text style={{ fontSize: 12, color: colors.muted }}>/ day</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Muted>{j.days} Day(s) • {j.workersNeeded} {j.trade}{j.workersNeeded > 1 ? 's' : ''}</Muted>
              <Muted style={{ color: j.urgent ? colors.danger : colors.muted, fontWeight: '700' }}>{startLabel(j.startDate)}{j.shiftStart ? ` • ${j.shiftStart}` : ''}</Muted>
            </View>
          </Row>
        </View>

        {perks.length ? (
          <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
            {perks.map((p) => (
              <Row key={p.key} style={{ backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 4 }}>
                <Ionicons name={p.icon} size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '600' }}>{p.label}</Text>
              </Row>
            ))}
          </Row>
        ) : null}

        <Row style={{ marginTop: 10 }}>
          {j.applicationStatus ? (
            <Badge text={`Applied • ${j.applicationStatus}`} tone={STATUS_TONE[j.applicationStatus]} />
          ) : (
            <Button title={applyLabel} icon="flash" variant="accent" small onPress={() => onApply(j)} style={{ flex: 1, marginRight: 8 }} />
          )}
          <View style={{ flex: j.applicationStatus ? 0 : 1, marginLeft: j.applicationStatus ? 'auto' : 0 }}>
            <Button title="Call Employer" icon="call-outline" variant="soft" small onPress={() => callPhone(j.employer?.phone)} />
          </View>
        </Row>
      </Card>
    </TouchableOpacity>
  );
}
