import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Button, Muted, Row, Badge, Loading, money } from '../components/ui';
import api, { errMsg } from '../api/client';
import { dateTimeLabel, startLabel } from '../utils';
import { colors } from '../theme';

const NEXT_STEPS = [
  ['Employer reviews your profile', 'The contractor checks your trade experience, NIC badge and client ratings.'],
  ['Instant SMS & app alert', 'We send a push notification and SMS to your verified phone number on acceptance.'],
  ['Direct site manager contact', 'Unlock one-tap calling and chat with the site manager for arrival instructions.'],
];

export default function ApplicationSentScreen() {
  const router = useRouter();
  const { applicationId } = useLocalSearchParams();
  const [app, setApp] = useState(null);

  // READ the application we just created
  useEffect(() => {
    api.get(`/applications/${applicationId}`)
      .then(({ data }) => setApp(data.application))
      .catch((e) => Alert.alert('Could not load', errMsg(e)));
  }, [applicationId]);

  if (!app) return <Loading />;
  const job = app.job;
  const emp = job.employer || {};

  const goJobs = () => router.replace('/(worker)/Jobs');

  // DELETE: undo the application straight from the confirmation page
  const withdraw = () =>
    Alert.alert('Withdraw application', 'Withdraw from this job?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/applications/${applicationId}`); goJobs(); } catch (e) { Alert.alert('Failed', errMsg(e)); }
        },
      },
    ]);

  return (
    <Screen
      footer={
        <>
          <Button title="View Application" icon="document-text-outline" onPress={() => router.replace({ pathname: '/ApplicationStatus', params: { applicationId: String(applicationId) } })} />
          <Button title="Find More Jobs" variant="outline" onPress={goJobs} style={{ marginTop: 8 }} />
          <Button title="Withdraw Application" variant="danger" small onPress={withdraw} style={{ marginTop: 8 }} />
        </>
      }
    >
      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <View style={{ marginTop: 10 }}><Badge text="INSTANT DISPATCH" tone="green" /></View>
        <Text style={{ fontSize: 24, fontWeight: '900', marginTop: 8, textAlign: 'center' }}>Application Sent Successfully!</Text>
        <Muted style={{ textAlign: 'center', marginTop: 6, fontSize: 13 }}>
          Your application has been delivered directly to {emp.companyName || emp.fullName}.
        </Muted>
        <View style={{ marginTop: 10 }}><Badge text="Status: Pending Employer Review" tone="orange" /></View>
      </View>

      <Card>
        <Text style={{ fontWeight: '800', fontSize: 16 }}>{emp.companyName || emp.fullName}{emp.brVerified ? ' ✓' : ''}</Text>
        <Muted>Ref: #{app.refCode}</Muted>
        {[
          ['Position', job.title],
          ['Job location', [job.town, job.district].filter(Boolean).join(', ')],
          ['Wage offered', `${money(job.dailyWage)} / day`],
          ['Starts', `${startLabel(job.startDate)} ${job.shiftStart || ''}`],
          ['Sent', dateTimeLabel(app.createdAt)],
        ].map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border, marginTop: 6 }}>
            <Muted>{k}</Muted><Text style={{ fontWeight: '700', flex: 1, textAlign: 'right' }}>{v}</Text>
          </Row>
        ))}
      </Card>

      <Card tone="blue">
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>What Happens Next?</Text>
        {NEXT_STEPS.map(([t, d], i) => (
          <Row key={t} style={{ alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: i === 0 ? colors.primary : colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ color: i === 0 ? '#fff' : colors.primary, fontWeight: '800' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '700' }}>{t}</Text><Muted>{d}</Muted></View>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
