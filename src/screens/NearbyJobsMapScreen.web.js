import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
import { Button, Muted, Row, Badge, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { useJobActions } from '../hooks/useJobActions';
import api, { errMsg } from '../api/client';
import { callPhone, openMaps, startLabel } from '../utils';
import { colors } from '../theme';

const DEFAULT_CENTER = { latitude: 7.1693, longitude: 79.8849 };

export default function NearbyJobsMapScreen({ navigation }) {
  const { user } = useAuth();
  const { filters, toParams } = useFilters();
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);

  const center = user.location
    ? { latitude: user.location.lat, longitude: user.location.lng }
    : DEFAULT_CENTER;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/jobs', { params: toParams(filters) });
      const pinned = data.jobs.filter((job) => {
        const lat = Number(job.lat);
        const lng = Number(job.lng);
        return Number.isFinite(lat) && lat >= -90 && lat <= 90
          && Number.isFinite(lng) && lng >= -180 && lng <= 180;
      });
      setJobs(pinned);
      setSelected((current) => pinned.find((job) => job._id === current?._id) || pinned[0] || null);
    } catch (error) {
      Alert.alert('Could not load map jobs', errMsg(error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { apply } = useJobActions(load);
  const mapCenter = selected
    ? { latitude: Number(selected.lat), longitude: Number(selected.lng) }
    : center;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.longitude - 0.08},${mapCenter.latitude - 0.08},${mapCenter.longitude + 0.08},${mapCenter.latitude + 0.08}&layer=mapnik${selected ? `&marker=${mapCenter.latitude},${mapCenter.longitude}` : ''}`;

  return (
    <View style={s.container}>
      <iframe title="Nearby jobs map" src={mapUrl} style={s.mapFrame} />

      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800' }}>{user.nearestTown || user.homeDistrict || 'Nearby'}</Text>
          <Muted>{jobs.length} job(s) on the map within your filters</Muted>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.listBtn}>
          <Ionicons name="list" size={18} color={colors.primary} />
          <Text style={{ fontWeight: '700', marginLeft: 4 }}>List</Text>
        </TouchableOpacity>
      </View>

      <View style={s.bottomPanel}>
        {jobs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.jobList}>
            {jobs.map((job) => (
              <TouchableOpacity
                key={job._id}
                onPress={() => setSelected(job)}
                style={[s.jobChip, selected?._id === job._id && s.selectedJobChip]}
              >
                <Text numberOfLines={1} style={[s.jobChipTitle, selected?._id === job._id && s.selectedJobText]}>
                  {job.title}
                </Text>
                <Text style={[s.jobChipWage, selected?._id === job._id && s.selectedJobText]}>
                  {money(job.dailyWage)} /day
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Muted>No jobs with a map location match your filters.</Muted>
        )}

        {selected ? (
          <View style={s.details}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge text={`${selected.matchPercent}% Trade Match`} tone="green" />
              <TouchableOpacity onPress={() => openMaps(selected.lat, selected.lng)}>
                <Text style={s.openMapText}>Open in Maps</Text>
              </TouchableOpacity>
            </Row>
            <TouchableOpacity onPress={() => navigation.navigate('JobDetail', { jobId: selected._id })}>
              <Text style={s.title} numberOfLines={1}>{selected.title}</Text>
              <Muted>
                {selected.employer?.companyName || selected.employer?.fullName}
                {' · '}
                {[selected.town, selected.district].filter(Boolean).join(', ')}
                {selected.distanceKm != null ? ` · ${selected.distanceKm} km` : ''}
              </Muted>
              <Muted style={{ fontWeight: '700', marginTop: 2 }}>
                {startLabel(selected.startDate)} {selected.shiftStart}
              </Muted>
            </TouchableOpacity>
            <Row style={{ marginTop: 10 }}>
              {selected.applicationStatus ? (
                <Badge text={`Applied · ${selected.applicationStatus}`} tone="blue" />
              ) : (
                <Button title="Quick Apply" icon="flash" variant="accent" onPress={() => apply(selected)} style={{ flex: 1 }} />
              )}
              <Button title="" icon="call" variant="soft" onPress={() => callPhone(selected.employer?.phone)} style={{ marginLeft: 8, paddingHorizontal: 14 }} />
              <Button title="" icon="navigate" variant="soft" onPress={() => openMaps(selected.lat, selected.lng)} style={{ marginLeft: 8, paddingHorizontal: 14 }} />
            </Row>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, minHeight: '100vh', position: 'relative' },
  mapFrame: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 },
  topBar: { position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.15)' },
  listBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bottomPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 24, boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.15)' },
  jobList: { maxHeight: 62, marginBottom: 10 },
  jobChip: { maxWidth: 190, justifyContent: 'center', backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  selectedJobChip: { backgroundColor: colors.primary },
  jobChipTitle: { fontWeight: '700', color: colors.text },
  jobChipWage: { fontSize: 12, color: colors.muted, marginTop: 2 },
  selectedJobText: { color: '#fff' },
  details: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  openMapText: { color: colors.primary, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '800', marginTop: 6 },
});
