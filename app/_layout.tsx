import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, router, useSegments, usePathname } from 'expo-router';
import { MeshBackground } from '../src/components/MeshBackground';
import { initDB } from '../src/db';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const { user, session, householdId, setUser, setHouseholdId } = useAuthStore();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    initDB().then(() => setDbReady(true));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null, session);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthChecking || !dbReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user) {
      if (!householdId && pathname !== '/(auth)/household') {
        router.replace('/(auth)/household');
      } else if (householdId && inAuthGroup && pathname !== '/(auth)/household') {
        router.replace('/(tabs)');
      } else if (householdId && pathname === '/(auth)/household') {
        router.replace('/(tabs)');
      }
    }
  }, [user, householdId, segments, pathname, isAuthChecking, dbReady]);

  if (!dbReady || isAuthChecking) {
    return (
      <View style={styles.loadingContainer}>
        <MeshBackground />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <MeshBackground />
      <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' }, headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 16,
  },
});
