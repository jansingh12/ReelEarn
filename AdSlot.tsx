/**
 * Expo Snack / Expo Go version: shows a clearly labelled placeholder ad card.
 * Native AdMob needs native code that Snack and Expo Go do not contain.
 * For a real build, replace this file's contents with AdSlot.admob.tsx (see README) and make a development build.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

export default function AdSlot({ index }: { index: number; active: boolean }) {
  return (
    <View style={s.wrap}>
      <View style={s.badge}><Text style={s.badgeTxt}>Ad</Text></View>
      <Text style={s.title}>Sponsored placeholder #{index + 1}</Text>
      <Text style={s.sub}>A native AdMob ad shows here in a development build. Swipe up to continue.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0B0B', padding: 28 },
  badge: { backgroundColor: '#F5A623', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 16 },
  badgeTxt: { color: '#000', fontWeight: '800', fontSize: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sub: { color: C.mute, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
