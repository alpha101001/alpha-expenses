import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { Home, PlusCircle, Activity, BarChart2, Calendar } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        elevation: 0,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
      },
      tabBarBackground: () => (
        <BlurView tint="dark" intensity={20} style={StyleSheet.absoluteFill} />
      ),
      headerShown: false,
      tabBarActiveTintColor: '#c7d2fe',
      tabBarInactiveTintColor: '#64748b',
      sceneStyle: { backgroundColor: 'transparent' },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => (
            <View style={styles.addIconContainer}>
              <PlusCircle size={32} color="#ffffff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addIconContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.8)',
    marginTop: -16,
  }
});
