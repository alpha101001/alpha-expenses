import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export function MeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020617' }]} />
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="grad1" cx="0%" cy="0%" r="50%">
            <Stop offset="0" stopColor="rgba(99,102,241,0.2)" />
            <Stop offset="1" stopColor="rgba(99,102,241,0)" />
          </RadialGradient>
          <RadialGradient id="grad2" cx="100%" cy="0%" r="50%">
            <Stop offset="0" stopColor="rgba(236,72,153,0.15)" />
            <Stop offset="1" stopColor="rgba(236,72,153,0)" />
          </RadialGradient>
          <RadialGradient id="grad3" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="rgba(20,184,166,0.1)" />
            <Stop offset="1" stopColor="rgba(20,184,166,0)" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad2)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad3)" />
      </Svg>
    </View>
  );
}
