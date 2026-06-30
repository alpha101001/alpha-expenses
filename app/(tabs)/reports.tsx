import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassCard } from '../../src/components/GlassCard';

export default function ReportsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reports</Text>
      
      <GlassCard intensity={20} style={styles.card}>
        <Text style={styles.cardTitle}>Current Month Summary</Text>
        <Text style={styles.placeholder}>Analytics and charts will appear here.</Text>
      </GlassCard>

      <GlassCard intensity={20} style={styles.card}>
        <Text style={styles.cardTitle}>Export Options</Text>
        <Text style={styles.placeholder}>PDF Export features will be available soon.</Text>
      </GlassCard>
    </ScrollView>
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
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  placeholder: {
    color: '#94a3b8',
    fontSize: 14,
  }
});
