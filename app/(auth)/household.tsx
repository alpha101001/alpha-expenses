import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { GlassCard } from '../../src/components/GlassCard';
import { useAuthStore } from '../../src/store/auth';
import { router } from 'expo-router';

export default function HouseholdScreen() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [households, setHouseholds] = useState<any[]>([]);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const { user, setHouseholdId } = useAuthStore();

  useEffect(() => {
    loadHouseholds();
  }, []);

  const loadHouseholds = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('households')
      .select('id, name')
      .order('created_at', { ascending: false });

    setLoading(false);
    if (error) {
      Alert.alert('Error loading households', error.message);
    } else {
      setHouseholds(data || []);
    }
  };

  const handleSelectHousehold = (id: string) => {
    setHouseholdId(id);
    router.replace('/(tabs)');
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a name for your household.');
      return;
    }
    setCreating(true);
    
    const { data: bootstrapData, error: rpcError } = await supabase.rpc('create_household', {
      household_name: newHouseholdName
    });

    setCreating(false);
    
    if (rpcError || !bootstrapData) {
      Alert.alert('Error', rpcError?.message || 'Failed to create household');
      return;
    }

    const householdId = bootstrapData.household.id;
    setHouseholdId(householdId);
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Household</Text>
      
      {households.length > 0 && (
        <GlassCard style={styles.card} intensity={20}>
          <Text style={styles.label}>Select existing:</Text>
          {households.map(hh => (
            <TouchableOpacity key={hh.id} style={styles.hhButton} onPress={() => handleSelectHousehold(hh.id)}>
              <Text style={styles.hhButtonText}>{hh.name}</Text>
            </TouchableOpacity>
          ))}
        </GlassCard>
      )}

      <GlassCard style={[styles.card, { marginTop: 24 }]} intensity={20}>
        <Text style={styles.label}>Or create a new one:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Roy Family"
          placeholderTextColor="#475569"
          value={newHouseholdName}
          onChangeText={setNewHouseholdName}
          editable={!creating}
        />
        <TouchableOpacity style={styles.button} onPress={handleCreateHousehold} disabled={creating}>
          {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Household</Text>}
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 48,
  },
  card: {
    padding: 24,
    borderRadius: 24,
  },
  label: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: '#0f172a80',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  hhButton: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  hhButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
