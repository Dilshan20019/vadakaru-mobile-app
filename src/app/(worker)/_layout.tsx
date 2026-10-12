import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { Loading } from '../../components/ui';
import { colors } from '../../theme';

const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size }: { color: React.ComponentProps<typeof Ionicons>['color']; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

export default function WorkerLayout() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/Splash" />;
  if (user.role !== 'worker') return <Redirect href="/(employer)/Home" />;

  return (
    <Tabs
      initialRouteName="Jobs"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen name="Jobs" options={{ title: t('jobs'), headerTitle: 'Search Jobs', tabBarIcon: icon('search-outline') }} />
      <Tabs.Screen name="Saved" options={{ title: t('saved'), headerTitle: 'Saved Jobs', tabBarIcon: icon('heart-outline') }} />
      <Tabs.Screen name="Applications" options={{ title: t('applications'), headerTitle: 'My Applications', tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen name="Work" options={{ title: t('work'), headerTitle: 'Upcoming Work', tabBarIcon: icon('hammer-outline') }} />
      <Tabs.Screen name="Profile" options={{ title: t('profile'), tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
