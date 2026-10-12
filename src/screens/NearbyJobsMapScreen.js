import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button, Muted, Row, Badge, money } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { useJobActions } from '../hooks/useJobActions';
import api, { errMsg } from '../api/client';
import { callPhone, openMaps, startLabel } from '../utils';
import { colors } from '../theme';

const DEFAULT_CENTER = { latitude: 7.1693, longitude: 79.8849 }; // Gampaha / Negombo area

export default function NearbyJobsMapScreen({ navigation }) {
  const { user } = useAuth();
  const { filters, toParams } = useFilters();
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);

  const center = user.location ? { latitude: user.location.lat, longitude: user.location.lng } : DEFAULT_CENTER;

  // READ jobs that have a map pin
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/jobs', { params: toParams(filters) });
      const pinned = data.jobs.filter((j) => j.lat != null && j.lng != null);
      setJobs(pinned);
      setSelected((cur) => pinned.find((j) => j._id === cur?._id) || pinned[0] || null);
    } catch (e) {
      Alert.alert('Could not load map jobs', errMsg(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { apply } = useJobActions(load);

  const recenter = () => mapRef.current?.animateToRegion({ ...center, latitudeDelta: 0.15, longitudeDelta: 0.15 }, 500);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...center, latitudeDelta: 0.18, longitudeDelta: 0.18 }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {jobs.map((j) => (
          <Marker key={j._id} coordinate={{ latitude: j.lat, longitude: j.lng }} onPress={() => setSelected(j)}>
            <View style={[s.pin, selected?._id === j._id && { backgroundColor: colors.primary }]}>
              <Text style={[s.pinText, selected?._id === j._id && { color: '#fff' }]}>Rs. {j.dailyWage.toLocaleString('en-US')}/d</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800' }}>{user.nearestTown || user.homeDistrict || 'Nearby'}</Text>
          <Muted>{jobs.length} job(s) on the map • within your filters</Muted>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.listBtn}>
          <Ionicons name="list" size={18} color={colors.primary} />
          <Text style={{ fontWeight: '700', marginLeft: 4 }}>List</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={recenter} style={s.locate}><Ionicons name="locate" size={22} color={colors.primary} /></TouchableOpacity>

      {selected ? (
        <View style={s.sheet}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge text={`${selected.matchPercent}% Trade Match`} tone="green" />
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>{money(selected.dailyWage)}<Text style={{ fontSize: 11, color: colors.muted }}> /day</Text></Text>
          </Row>
          <TouchableOpacity onPress={() => navigation.navigate('JobDetail', { jobId: selected._id })}>
            <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 6 }} numberOfLines={1}>{selected.title}</Text>
            <Muted>{selected.employer?.companyName || selected.employer?.fullName} • {[selected.town, selected.district].filter(Boolean).join(', ')}{selected.distanceKm != null ? ` • ${selected.distanceKm} km` : ''}</Muted>
            <Muted style={{ fontWeight: '700', marginTop: 2 }}>{startLabel(selected.startDate)} {selected.shiftStart}</Muted>
          </TouchableOpacity>
          <Row style={{ marginTop: 10 }}>
            {selected.applicationStatus ? (
              <Badge text={`Applied • ${selected.applicationStatus}`} tone="blue" />
            ) : (
              <Button title="Quick Apply" icon="flash" variant="accent" onPress={() => apply(selected)} style={{ flex: 1 }} />
            )}
            <Button title="" icon="call" variant="soft" onPress={() => callPhone(selected.employer?.phone)} style={{ marginLeft: 8, paddingHorizontal: 14 }} />
            <Button title="" icon="navigate" variant="soft" onPress={() => openMaps(selected.lat, selected.lng)} style={{ marginLeft: 8, paddingHorizontal: 14 }} />
          </Row>
        </View>
      ) : (
        <View style={s.sheet}><Muted>No jobs with a map location match your filters.</Muted></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topBar: { position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 },
  listBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  locate: { position: 'absolute', right: 16, top: 90, backgroundColor: '#fff', borderRadius: 24, padding: 10, elevation: 4 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 24, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10 },
  pin: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  pinText: { fontWeight: '800', fontSize: 12, color: colors.primary },
});
