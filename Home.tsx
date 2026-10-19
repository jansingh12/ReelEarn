import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import { C } from '../theme';
import { Btn } from '../ui';
import Feed from './Feed';
import Wallet from './Wallet';

type Tab = 'feed' | 'wallet' | 'me';
/** The signed-in app: Reels feed (with ads), Wallet / Creator Fund / Withdrawals, and Profile. */
export default function Home() {
  const [tab, setTab] = useState<Tab>('feed');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>{tab === 'feed' ? <Feed /> : tab === 'wallet' ? <Wallet /> : <Me />}</View>
      <View style={s.bar}>
        {([['feed', 'Reels'], ['wallet', 'Wallet'], ['me', 'Profile']] as [Tab, string][]).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={s.btn} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[s.txt, tab === k && { color: C.text }]}>{l}</Text>{tab === k ? <View style={s.dot} /> : null}
          </Pressable>))}
      </View>
    </SafeAreaView>
  );
}
function Me() {
  const { profile, user, signOut } = useAuth();
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>{profile?.name ?? profile?.username}</Text>
      <Text style={{ color: C.mute, marginBottom: 4 }}>@{profile?.username}</Text>
      <Text style={{ color: C.mute, marginBottom: 28 }}>{user?.email ?? user?.phone}</Text>
      <Btn title="Log out" variant="outline" onPress={signOut} />
    </View>
  );
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopColor: C.border, borderTopWidth: 1, backgroundColor: C.bg },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12 }, txt: { color: C.mute, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.blue, marginTop: 4 },
});
