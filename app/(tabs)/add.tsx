import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { GlassCard } from '../../src/components/GlassCard';
import { TransactionRepository } from '../../src/db/repositories/TransactionRepository';
import { useBalanceStore } from '../../src/store';
import { useAuthStore } from '../../src/store/auth';
import { router } from 'expo-router';

export default function AddScreen() {
  const [amount, setAmount] = useState('');
  const [item, setItem] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const balances = useBalanceStore();
  const { householdId, user } = useAuthStore();

  const handleSave = async () => {
    if (!householdId || !user) {
      Alert.alert('Error', 'Missing household context.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    // Convert to paisa
    const amountPaisa = Math.round(parsedAmount * 100);

    setIsSubmitting(true);
    try {
      await TransactionRepository.recordTransaction({
        household_id: householdId,
        type: 'expense',
        status: 'completed',
        date: new Date().toISOString(),
        amount: amountPaisa,
        item: item,
        notes: notes,
        creator_id: user.id,
        postings: [
          {
            account_id: 'cash_1', // Using a default cash account for now
            funding_pool: 'current_month',
            amount: -amountPaisa // Outflow
          }
        ]
      });
      
      // Update store
      const updated = await TransactionRepository.calculateBalances(householdId);
      balances.setBalances(updated);
      
      // Navigate back
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>New Expense</Text>
      
      <GlassCard style={styles.formCard} intensity={20}>
        <Text style={styles.label}>Amount (৳)</Text>
        <TextInput 
          style={styles.inputLarge}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#475569"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />

        <Text style={styles.label}>Item</Text>
        <TextInput 
          style={styles.input}
          placeholder="What did you buy?"
          placeholderTextColor="#475569"
          value={item}
          onChangeText={setItem}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput 
          style={styles.input}
          placeholder="Additional details..."
          placeholderTextColor="#475569"
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity 
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text style={styles.saveButtonText}>Save Expense</Text>
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 24,
    textAlign: 'center',
  },
  formCard: {
    padding: 24,
    borderRadius: 24,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  inputLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    color: '#f1f5f9',
    backgroundColor: '#0f172a80',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#1e3a8a',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  }
});
