import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBalanceStore } from '../../src/store';
import { GlassCard } from '../../src/components/GlassCard';
import { TransactionRepository } from '../../src/db/repositories/TransactionRepository';
import { useAuthStore } from '../../src/store/auth';

const formatCurrency = (paisa: number) => {
  return '৳' + (paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
};

export default function HomeScreen() {
  const balances = useBalanceStore();
  const { householdId } = useAuthStore();

  useEffect(() => {
    if (householdId) {
      TransactionRepository.calculateBalances(householdId).then(res => {
        balances.setBalances(res);
      });
    }
  }, [householdId]);

  const getSyncStateText = () => {
    switch (balances.syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'error': return 'Sync Error';
      case 'idle': return 'Synced';
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.month}>Current Month</Text>
        <Text style={[styles.syncState, balances.syncStatus === 'error' && styles.syncError]}>{getSyncStateText()}</Text>
      </View>

      <GlassCard intensity={30} style={styles.mainCard}>
        <Text style={styles.mainCardLabel}>Remaining This Month</Text>
        <Text style={styles.mainCardValue}>{formatCurrency(balances.remaining)}</Text>
        <Text style={styles.mainCardSub}>Total Spent: {formatCurrency(balances.totalSpent)}</Text>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  month: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  syncState: {
    fontSize: 12,
    color: '#34d399',
  },
  syncError: {
    color: '#ef4444',
  },
  mainCard: {
    margin: 16,
    padding: 24,
  },
  mainCardLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mainCardValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  mainCardSub: {
    fontSize: 14,
    color: '#cbd5e1',
  },
});
