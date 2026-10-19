import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

export default function Splash() {
  const logo = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
      Animated.timing(text, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [logo, text]);
  return (
    <View style={s.root}>
      <Animated.View style={[s.logo, { opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
        <Text style={s.coin}>₹</Text>
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Text style={s.name}>ReelEarn</Text>
        <Text style={s.tag}>Share what you create. Grow your audience.</Text>
      </Animated.View>
      <ActivityIndicator color={C.mute} style={{ marginTop: 32 }} />
      <Text style={s.from}>from ReelEarn</Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 96, height: 96, borderRadius: 28, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  coin: { color: '#fff', fontSize: 54, fontWeight: '800' },
  name: { color: C.text, fontSize: 36, fontWeight: '800', letterSpacing: 0.5 },
  tag: { color: C.mute, fontSize: 14, marginTop: 8 },
  from: { position: 'absolute', bottom: 36, color: C.mute, fontSize: 12 },
});
