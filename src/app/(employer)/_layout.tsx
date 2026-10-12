import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { Loading } from '../../components/ui';
import { colors } from '../../theme';

const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
  ({ color, size }: { color: React.ComponentProps<typeof Ionicons>['color']; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

export default function EmployerLayout() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/Splash" />;
  if (user.role !== 'employer') return <Redirect href="/(worker)/Jobs" />;

  return (
    <Tabs
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Tabs.Screen name="Home" options={{ title: 'Home', headerTitle: 'Vedakaru', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="Postings" options={{ title: t('postings'), headerTitle: 'My Postings', tabBarIcon: icon('briefcase-outline') }} />
      <Tabs.Screen name="Workers" options={{ title: 'Workers', headerTitle: 'Find Workers', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="ManageApplications" options={{ title: 'Applications', headerTitle: 'Application Management', tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen
        name="Business"
        options={({ navigation }) => ({
          title: t('business'),
          headerTitle: 'Employer Profile',
          tabBarIcon: icon('business-outline'),
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Account')} style={{ marginRight: 14 }}>
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
    </Tabs>
  );
}
