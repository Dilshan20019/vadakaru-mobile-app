import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FilterProvider } from '../context/FilterContext';
import { LanguageProvider } from '../context/LanguageContext';
import { WorkerFilterProvider } from '../context/WorkerFilterContext';
import { colors } from '../theme';

const authRoutes = new Set(['Splash', 'Language', 'RoleSelect', 'Onboarding', 'Login', 'Register']);
const workerSetupRoutes = new Set(['LocationSetup', 'TradesSkills', 'Wage', 'Availability']);

function AppNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const currentRoute: string = segments[0] || 'index';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (!authRoutes.has(currentRoute) && currentRoute !== 'index') router.replace('/Splash');
      return;
    }

    if (authRoutes.has(currentRoute) || currentRoute === 'index') {
      if (!user.onboardingComplete) {
        router.replace(user.role === 'employer' ? '/EmployerOnboarding' : '/LocationSetup?onboarding=true');
      } else {
        router.replace(user.role === 'employer' ? '/(employer)/Home' : '/(worker)/Jobs');
      }
      return;
    }

    if (!user.onboardingComplete) {
      const validSetupRoute =
        user.role === 'employer'
          ? currentRoute === 'EmployerOnboarding'
          : workerSetupRoutes.has(currentRoute);
      if (!validSetupRoute) {
        router.replace(user.role === 'employer' ? '/EmployerOnboarding' : '/LocationSetup?onboarding=true');
      }
      return;
    }

    if (currentRoute === '(worker)' && user.role !== 'worker') {
      router.replace('/(employer)/Home');
    } else if (currentRoute === '(employer)' && user.role !== 'employer') {
      router.replace('/(worker)/Jobs');
    }
  }, [currentRoute, loading, router, user]);

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        headerStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(worker)" options={{ headerShown: false }} />
      <Stack.Screen name="(employer)" options={{ headerShown: false }} />
      <Stack.Screen name="Splash" options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <FilterProvider>
            <WorkerFilterProvider>
              <AppNavigator />
            </WorkerFilterProvider>
          </FilterProvider>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
