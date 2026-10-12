import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, Muted, Row, Badge, Loading, money } from '../components/ui';
import { useJobActions } from '../hooks/useJobActions';
import api, { errMsg } from '../api/client';
import { PERKS } from '../constants';
import { callPhone, openMaps, startLabel } from '../utils';
import { colors } from '../theme';

export default function JobDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { jobId: jobIdParam } = useLocalSearchParams();
  const jobId = Array.isArray(jobIdParam) ? jobIdParam[0] : jobIdParam;
  const [job, setJob] = useState(null);

  // READ job
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      setJob(data.job);
    } catch (e) {
      Alert.alert('Could not load job', errMsg(e), [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [jobId, router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { apply, toggleSave } = useJobActions(load);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Job Preview',
      headerRight: () => job ? (
        <TouchableOpacity onPress={() => toggleSave(job)}>
          <Ionicons name={job.saved ? 'heart' : 'heart-outline'} size={24} color={job.saved ? colors.danger : colors.primary} />
        </TouchableOpacity>
      ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, job]);

  // DELETE application (withdraw) from the detail page
  const withdraw = async () => {
    try {
      await api.delete(`/applications/${job.applicationId}`);
      load();
    } catch (e) { Alert.alert('Could not withdraw', errMsg(e)); }
  };

  if (!job) return <Loading />;
  const emp = job.employer || {};
  const perks = PERKS.filter((p) => job.perks?.[p.key]);

  const Bullets = ({ items }) => items.map((t, i) => (
    <Row key={i} style={{ alignItems: 'flex-start', marginTop: 4 }}>
      <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6, marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: 13 }}>{t}</Text>
    </Row>
  ));

  const footer = (
    <Row>
      <Button title="Call Employer" icon="call-outline" variant="soft" onPress={() => callPhone(emp.phone)} style={{ flex: 1, marginRight: 8 }} />
      {job.applicationStatus ? (
        <Button title="View Application" variant="primary" onPress={() => router.push({ pathname: '/ApplicationStatus', params: { applicationId: job.applicationId } })} style={{ flex: 1.4 }} />
      ) : (
        <Button title="Quick Apply" icon="flash" variant="accent" disabled={job.status !== 'open'} onPress={() => apply(job)} style={{ flex: 1.4 }} />
      )}
    </Row>
  );

  return (
    <Screen footer={footer}>
      <Row style={{ flexWrap: 'wrap', marginBottom: 6 }}>
        <View style={{ marginRight: 6, marginBottom: 4 }}><Badge text={`${job.matchPercent}% Match`} tone="green" /></View>
        {job.urgent ? <View style={{ marginRight: 6, marginBottom: 4 }}><Badge text="URGENT" tone="red" /></View> : null}
        {job.status !== 'open' ? <Badge text={job.status.toUpperCase()} tone="orange" /> : null}
      </Row>
      <Text style={{ fontSize: 22, fontWeight: '900' }}>{job.title}</Text>

      <TouchableOpacity onPress={() => router.push({ pathname: '/EmployerProfile', params: { employerId: emp._id } })}>
        <Muted style={{ marginVertical: 6, color: colors.primary, fontWeight: '700' }}>
          {emp.companyName || emp.fullName}{job.employerRating ? ` • ${job.employerRating}★ (${job.employerReviews})` : ''}{emp.brVerified ? ' • Verified Contractor' : ''}  ›
        </Muted>
      </TouchableOpacity>

      <Card tone="orange">
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Muted style={{ fontWeight: '700' }}>DAILY WAGE</Muted>
            <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primary }}>{money(job.dailyWage)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Muted style={{ fontWeight: '700' }}>EXPECTED TOTAL</Muted>
            <Text style={{ fontSize: 20, fontWeight: '900' }}>{money(job.dailyWage * job.days)}</Text>
            <Muted>{job.days} day(s)</Muted>
          </View>
        </Row>
        {job.escrow ? <Muted style={{ marginTop: 8, color: '#92400E' }}>🔒 Wage is deposited into Vedakaru escrow before the shift starts.</Muted> : null}
      </Card>

      <Card>
        <SectionTitle icon="calendar-outline">Shift Schedule & Team</SectionTitle>
        {[
          ['Start', startLabel(job.startDate)],
          ['Shift time', `${job.shiftStart} • ${job.shiftHours} hrs`],
          ['Duration', `${job.days} day(s)`],
          ['Workers needed', `${job.workersNeeded} × ${job.trade}`],
        ].map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
            <Muted>{k}</Muted><Text style={{ fontWeight: '700' }}>{v}</Text>
          </Row>
        ))}
      </Card>

      {perks.length ? (
        <Card>
          <SectionTitle icon="gift-outline">Included Perks</SectionTitle>
          {perks.map((p) => (
            <Row key={p.key} style={{ paddingVertical: 5 }}>
              <Ionicons name={p.icon} size={18} color={colors.primary} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{p.label}</Text><Muted>{p.sub}</Muted></View>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionTitle icon="hammer-outline">Job Scope & Work</SectionTitle>
        {job.description ? <Text style={{ fontSize: 13, marginBottom: 4 }}>{job.description}</Text> : null}
        {job.scope?.length ? <Bullets items={job.scope} /> : null}
        {job.requirements?.length ? (
          <>
            <Text style={{ fontWeight: '800', marginTop: 12 }}>Worker Prerequisites</Text>
            <Bullets items={job.requirements} />
          </>
        ) : null}
      </Card>

      <Card>
        <SectionTitle icon="location-outline">Job Location & Route</SectionTitle>
        <Text style={{ fontWeight: '700' }}>{[job.town, job.district].filter(Boolean).join(', ')}</Text>
        {job.distanceKm != null ? <Muted>{job.distanceKm} km from your saved location</Muted> : null}
        <Button title="Open in Google Maps" icon="navigate-outline" variant="outline" small onPress={() => openMaps(job.lat, job.lng)} style={{ marginTop: 10 }} />
      </Card>

      <Card tone="blue">
        <Text style={{ fontWeight: '800' }}>Vedakaru Worker Promise</Text>
        <Muted style={{ marginTop: 4 }}>Zero commission • Wage held in escrow • Dispute hotline 1388.</Muted>
      </Card>

      {job.applicationStatus ? <Button title="Withdraw Application" variant="outline" small onPress={withdraw} /> : null}
    </Screen>
  );
}
