import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Field, Button, Muted } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function LoginScreen() {
  const { role } = useLocalSearchParams();
  const isEmployer = role === 'employer';
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !password) return Alert.alert('Missing details', 'Enter your phone number and password.');
    setBusy(true);
    try {
      await login(phone, password);
    } catch (e) {
      Alert.alert('Sign in failed', errMsg(e));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Sign In" onPress={submit} loading={busy} />}>
      <Text style={{ fontSize: 22, fontWeight: '900', marginBottom: 4 }}>{isEmployer ? 'Employer Login' : 'Welcome back'}</Text>
      <Muted style={{ marginBottom: 16 }}>Sign in with the mobile number you registered with.</Muted>
      <Field label="Mobile Number" value={phone} onChangeText={setPhone} placeholder="077 123 4567" keyboardType="phone-pad" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />
      <Button
        title="Continue with Google"
        variant="outline"
        icon="logo-google"
        onPress={() => Alert.alert('Not available in this build', 'Google sign-in needs an OAuth client set up in Google Cloud. Please sign in with your mobile number and password.')}
        style={{ marginTop: 6 }}
      />
    </Screen>
  );
}
