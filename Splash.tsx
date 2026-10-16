import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

export default function Splash() {
  return (
    <View style={s.root}>
      <View style={s.logo}><Text style={s.coin}>₹</Text></View>
      <Text style={s.name}>ReelEarn</Text>
      <Text style={s.tag}>Watch reels. Share stories. Earn coins.</Text>
      <ActivityIndicator color={C.mute} style={{ marginTop: 28 }} />
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 92, height: 92, borderRadius: 28, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  coin: { color: '#fff', fontSize: 52, fontWeight: '800' },
  name: { color: C.text, fontSize: 34, fontWeight: '800', marginTop: 18, letterSpacing: 0.5 },
  tag: { color: C.mute, fontSize: 14, marginTop: 8 },
});
