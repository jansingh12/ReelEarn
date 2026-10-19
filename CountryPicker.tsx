import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRIES, Country } from './countries';
import { C } from './theme';

export function CountryPicker({ value, onChange }: { value: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = COUNTRIES.filter((c) => !q.trim() || (c.name + c.dial).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Country code ${value.dial}, tap to change`} style={s.btn}>
        <Text style={s.flag}>{value.flag}</Text><Text style={s.dial}>{value.dial}</Text><Text style={s.chev}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.head}>
            <Text style={s.title}>Select country</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}><Text style={{ color: C.blue, fontWeight: '700' }}>Close</Text></Pressable>
          </View>
          <TextInput value={q} onChangeText={setQ} placeholder="Search country or code" placeholderTextColor={C.mute} style={s.search} autoCorrect={false} />
          <FlatList data={list} keyExtractor={(c) => c.name} keyboardShouldPersistTaps="handled" renderItem={({ item }) => (
            <Pressable onPress={() => { onChange(item); setOpen(false); setQ(''); }} style={s.row}>
              <Text style={s.flag}>{item.flag}</Text><Text style={s.name}>{item.name}</Text><Text style={s.rdial}>{item.dial}</Text>
            </Pressable>
          )} />
        </SafeAreaView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 52, marginRight: 10 },
  flag: { fontSize: 22, marginRight: 6 }, dial: { color: C.text, fontSize: 16, fontWeight: '600' }, chev: { color: C.mute, marginLeft: 6 },
  modal: { flex: 1, backgroundColor: C.bg, padding: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: '700' },
  search: { backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 12, color: C.text, padding: 12, fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { color: C.text, fontSize: 16, flex: 1 }, rdial: { color: C.mute, fontSize: 15 },
});
