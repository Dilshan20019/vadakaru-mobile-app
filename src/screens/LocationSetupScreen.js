import React, { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, SectionTitle, Chip, ChipRow, Field, Button, Stepper, Muted, Row } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api, { errMsg } from '../api/client';
import { DISTRICTS, TRANSPORT } from '../constants';
import { colors } from '../theme';

export default function LocationSetupScreen() {
  const router = useRouter();
  const { onboarding: onboardingParam } = useLocalSearchParams();
  const onboarding = Array.isArray(onboardingParam)
    ? onboardingParam.includes('true')
    : onboardingParam === 'true';
  const { user, setUser } = useAuth();

  const [district, setDistrict] = useState(user.homeDistrict);
  const [radius, setRadius] = useState(user.travelRadius || 15);
  const [transport, setTransport] = useState(user.transport || []);
  const [stayOnSite, setStayOnSite] = useState(user.stayOnSite);
  const [urgent, setUrgent] = useState(user.urgentAlerts);
  const [coords, setCoords] = useState(user.location || null);
  const [placeName, setPlaceName] = useState(user.nearestTown || '');
  const [newTown, setNewTown] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTransport = (t) => setTransport((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  // READ device GPS
  const scanGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission needed', 'Allow location access to auto-detect your area.');
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      if (place) setPlaceName([place.city || place.subregion, place.region].filter(Boolean).join(', '));
    } catch (e) {
      Alert.alert('GPS error', errMsg(e));
    }
  };

  // CREATE preferred town
  const addTown = async () => {
    if (!newTown.trim()) return;
    try {
      const { data } = await api.post('/profile/towns', { town: newTown.trim() });
      setUser(data.user);
      setNewTown('');
    } catch (e) {
      Alert.alert('Could not add town', errMsg(e));
    }
  };

  // DELETE preferred town
  const removeTown = async (town) => {
    try {
      const { data } = await api.delete(`/profile/towns/${encodeURIComponent(town)}`);
      setUser(data.user);
    } catch (e) {
      Alert.alert('Could not remove town', errMsg(e));
    }
  };

  // UPDATE location settings
  const save = async () => {
    if (!district) return Alert.alert('Select district', 'Choose your base home district first.');
    setBusy(true);
    try {
      const { data } = await api.put('/profile', {
        homeDistrict: district, travelRadius: radius, transport, stayOnSite, urgentAlerts: urgent,
        location: coords || undefined, nearestTown: placeName || user.nearestTown,
      });
      setUser(data.user);
      if (onboarding) router.push({ pathname: '/TradesSkills', params: { onboarding: 'true' } });
      else router.back();
    } catch (e) {
      Alert.alert('Save failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title={onboarding ? 'Confirm Location & Continue' : 'Save Location'} variant="accent" onPress={save} loading={busy} />}>
      {onboarding ? <Muted style={{ marginBottom: 6, fontWeight: '700' }}>STEP 2 OF 5 • Location & Work Zone</Muted> : null}
      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Where Can You Work?</Text>
      <Muted style={{ marginVertical: 6 }}>We'll match you with high-paying daily wage jobs close to your hometown so you can save on travel time.</Muted>

      <Card>
        <SectionTitle icon="locate-outline">Current GPS Location</SectionTitle>
        <Text style={{ fontWeight: '700' }}>{placeName || 'Not detected yet'}</Text>
        {coords ? <Muted>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</Muted> : null}
        <Button title="Re-scan GPS" variant="soft" small icon="refresh" onPress={scanGps} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </Card>

      <Card>
        <SectionTitle icon="map-outline">Home District</SectionTitle>
        <ChipRow scroll>
          {DISTRICTS.map((d) => <Chip key={d} label={d} selected={district === d} onPress={() => setDistrict(d)} />)}
        </ChipRow>
        <Text style={{ fontWeight: '700', marginTop: 10, marginBottom: 6 }}>Preferred Work Towns</Text>
        <ChipRow>
          {user.workTowns.map((t) => <Chip key={t} label={t} selected onRemove={() => removeTown(t)} />)}
        </ChipRow>
        <Row>
          <View style={{ flex: 1 }}><Field value={newTown} onChangeText={setNewTown} placeholder="Add a town (e.g. Wattala)" style={{ marginBottom: 0 }} /></View>
          <Button title="Add" small onPress={addTown} style={{ marginLeft: 8 }} />
        </Row>
      </Card>

      <Card>
        <SectionTitle icon="navigate-outline">Maximum Travel Distance</SectionTitle>
        <Stepper value={radius} onChange={setRadius} step={5} min={5} max={100} suffix=" km" />
        <Muted style={{ marginTop: 6 }}>Recommended: 15 km. Travel allowance applies to jobs beyond 10 km.</Muted>
      </Card>

      <Card>
        <SectionTitle icon="bus-outline">Daily Travel Transport</SectionTitle>
        <ChipRow>{TRANSPORT.map((t) => <Chip key={t} label={t} selected={transport.includes(t)} onPress={() => toggleTransport(t)} />)}</ChipRow>
      </Card>

      <Card>
        <SectionTitle icon="options-outline">Work Preferences & Flexibility</SectionTitle>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontWeight: '700' }}>Stay on Site Jobs</Text>
            <Muted>Willing to take jobs that offer overnight boarding for extra daily pay.</Muted>
          </View>
          <Switch value={stayOnSite} onValueChange={setStayOnSite} trackColor={{ true: colors.primary }} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontWeight: '700' }}>Urgent Morning Shifts (5:00 AM)</Text>
            <Muted>Receive high-rate instant requests for early starts.</Muted>
          </View>
          <Switch value={urgent} onValueChange={setUrgent} trackColor={{ true: colors.primary }} />
        </Row>
      </Card>
    </Screen>
  );
}
