import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { GlassCard } from '../../src/components/GlassCard';
import { TransactionRepository } from '../../src/db/repositories/TransactionRepository';
import { useAuthStore } from '../../src/store/auth';
import { useFocusEffect } from 'expo-router';

const formatCurrency = (paisa: number) => {
  return '৳' + (Math.abs(paisa) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ActivityScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { householdId } = useAuthStore();

  const loadTransactions = async () => {
    if (householdId) {
      const data = await TransactionRepository.getTransactions(householdId);
      setTransactions(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpense = item.type === 'expense';
    
    return (
      <GlassCard intensity={20} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemText}>{item.item || 'Unnamed Transaction'}</Text>
          <Text style={[styles.amountText, isExpense ? styles.expense : styles.income]}>
            {isExpense ? '-' : '+'}{formatCurrency(item.amount)}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity</Text>
      <FlatList
        data={transactions}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 48 
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  expense: {
    color: '#f87171',
  },
  income: {
    color: '#4ade80',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  notesText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 8,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
