/**
 * REAL native AdMob ad (full-screen native advanced ad between reels).
 * Use: copy this file over src/ads/AdSlot.tsx, run `npx expo install react-native-google-mobile-ads`,
 * add the plugin block from README to app.json, then `npx expo run:android` / `run:ios` or an EAS development build.
 * It does NOT run in Expo Go or Expo Snack.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import mobileAds, { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './config';
import { C } from '../theme';

let started: Promise<unknown> | null = null;
const start = () => (started ??= mobileAds().initialize());

export default function AdSlot({ active }: { index: number; active: boolean }) {
  const [ad, setAd] = useState<NativeAd | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true; let loaded: NativeAd | null = null;
    start().then(() => NativeAd.createForAdRequest(AD_UNITS.nativeAdvanced)).then((a) => { if (alive) { loaded = a; setAd(a); } else a.destroy(); }).catch(() => alive && setFailed(true));
    return () => { alive = false; loaded?.destroy(); };
  }, []);
  if (failed) return <View style={s.wrap}><Text style={{ color: C.mute }}>Swipe up to continue</Text></View>;
  if (!ad) return <View style={s.wrap}><Text style={{ color: C.mute }}>Loading…</Text></View>;
  return (
    <NativeAdView nativeAd={ad} style={s.wrap}>
      <View style={s.badge}><Text style={s.badgeTxt}>Ad</Text></View>
      <NativeMediaView style={s.media} resizeMode="contain" />
      <NativeAsset assetType={NativeAssetType.HEADLINE}><Text style={s.title}>{ad.headline}</Text></NativeAsset>
      {ad.body ? <NativeAsset assetType={NativeAssetType.BODY}><Text style={s.sub}>{ad.body}</Text></NativeAsset> : null}
      {ad.callToAction ? <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}><Text style={s.cta}>{ad.callToAction}</Text></NativeAsset> : null}
    </NativeAdView>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0B0B', padding: 20 },
  badge: { backgroundColor: '#F5A623', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 12 },
  badgeTxt: { color: '#000', fontWeight: '800', fontSize: 12 },
  media: { width: '100%', height: 260, marginBottom: 14 },
  title: { color: C.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sub: { color: C.mute, textAlign: 'center', marginTop: 8 },
  cta: { color: '#fff', backgroundColor: C.blue, overflow: 'hidden', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12, marginTop: 16, fontWeight: '700' },
});
