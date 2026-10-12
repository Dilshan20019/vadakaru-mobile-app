import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, Muted, Row, Badge, money } from './ui';
import { initials } from '../utils';
import { colors } from '../theme';

export default function WorkerCard({ worker: w, onPress, onInvite, onToggleSave, showMatch = true }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 18 }}>{initials(w.displayName || w.fullName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', fontSize: 16, flex: 1 }}>{w.fullName}{w.nicVerified ? ' ✓' : ''}</Text>
              {onToggleSave ? (
                <TouchableOpacity onPress={() => onToggleSave(w)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={w.saved ? 'bookmark' : 'bookmark-outline'} size={22} color={w.saved ? colors.primary : colors.muted} />
                </TouchableOpacity>
              ) : null}
            </Row>
            <Muted>{w.primaryTrade || 'Trade not set'} • {w.experienceYears || 0} yrs • {w.authority}</Muted>
            <Muted>{[w.nearestTown, w.homeDistrict].filter(Boolean).join(', ')}{w.distanceKm != null ? ` • ${w.distanceKm} km away` : ''}</Muted>
          </View>
        </Row>
        <Row style={{ marginTop: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Row>
            <Ionicons name="star" size={14} color={colors.accent} />
            <Text style={{ fontWeight: '700', marginLeft: 3 }}>{w.rating ? w.rating : '—'}</Text>
            <Muted style={{ marginLeft: 3 }}>({w.reviewCount || 0})</Muted>
            <Muted style={{ marginLeft: 10 }}>{w.jobsCompleted || 0} jobs</Muted>
          </Row>
          <Text style={{ fontWeight: '900', color: colors.primary }}>{money(w.wage?.fullDay)} <Text style={{ fontSize: 11, color: colors.muted }}>/ day</Text></Text>
        </Row>
        <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
          {w.availableToday ? <Badge text="Available Today" tone="green" /> : <Badge text="Not available today" tone="orange" />}
          {showMatch && w.matchPercent != null ? <View style={{ marginLeft: 6 }}><Badge text={`${w.matchPercent}% Match`} tone="blue" /></View> : null}
        </Row>
        {onInvite ? (
          <Row style={{ marginTop: 10 }}>
            <Button title="View Profile" variant="outline" small onPress={onPress} style={{ flex: 1, marginRight: 8 }} />
            <Button title="Invite to Job" icon="paper-plane-outline" small onPress={() => onInvite(w)} style={{ flex: 1 }} />
          </Row>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}
