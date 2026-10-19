import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib';
import { C } from '../theme';
import AdSlot from '../ads/AdSlot';
import { AD_GAPS } from '../ads/config';

type Post = { id: string; client_id: string; owner_id: string; caption: string | null; media_url: string; username: string; photo_url: string | null };
type Item = { type: 'reel'; key: string; post: Post } | { type: 'ad'; key: string; n: number };

/** Puts an ad after every 3rd reel, then every 4th, alternating (3, 4, 3, 4 …). */
export function withAds(posts: Post[]): Item[] {
  const out: Item[] = []; let sinceAd = 0, gap = 0, n = 0;
  for (const p of posts) {
    out.push({ type: 'reel', key: p.id, post: p }); sinceAd++;
    if (sinceAd >= AD_GAPS[gap % AD_GAPS.length]) { out.push({ type: 'ad', key: 'ad-' + n, n }); n++; gap++; sinceAd = 0; }
  }
  return out;
}
const isVideo = (u: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(u);

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [h, setH] = useState(0);
  const [cur, setCur] = useState(0);

  const load = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase.from('posts').select('id,client_id,owner_id,caption,media_url').order('created_at', { ascending: false }).limit(40);
    if (error) { setErr('Could not load reels. Pull to retry.'); setPosts([]); return; }
    const ids = [...new Set((data ?? []).map((p: any) => p.owner_id))];
    const { data: profs } = ids.length ? await supabase.from('profiles').select('id,username,photo_url').in('id', ids) : { data: [] as any[] };
    const by = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p] as [string, any]));
    setPosts((data ?? []).map((p: any) => ({ ...p, username: by.get(p.owner_id)?.username ?? 'creator', photo_url: by.get(p.owner_id)?.photo_url ?? null })));
    if (user) {
      const [l, f] = await Promise.all([supabase.from('likes').select('post_id').eq('owner_id', user.id), supabase.from('follows').select('followee_id').eq('follower_id', user.id)]);
      setLiked(new Set((l.data ?? []).map((x: any) => x.post_id))); setFollowing(new Set((f.data ?? []).map((x: any) => x.followee_id)));
    }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => withAds(posts ?? []), [posts]);
  const onView = useRef(({ viewableItems }: any) => { if (viewableItems[0]) setCur(viewableItems[0].index ?? 0); }).current;

  async function toggleLike(p: Post) {
    const on = liked.has(p.client_id); const next = new Set(liked); on ? next.delete(p.client_id) : next.add(p.client_id); setLiked(next);
    const { error } = on ? await supabase.from('likes').delete().eq('post_id', p.client_id).eq('owner_id', user!.id) : await supabase.from('likes').insert({ post_id: p.client_id });
    if (error) setLiked(liked);
  }
  async function toggleFollow(p: Post) {
    const on = following.has(p.owner_id); const next = new Set(following); on ? next.delete(p.owner_id) : next.add(p.owner_id); setFollowing(next);
    const { error } = on ? await supabase.from('follows').delete().eq('followee_id', p.owner_id).eq('follower_id', user!.id) : await supabase.from('follows').insert({ followee_id: p.owner_id });
    if (error) setFollowing(following);
  }

  if (posts === null) return <View style={s.center}><ActivityIndicator color="#fff" /></View>;
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {err ? <Text style={s.err}>{err}</Text> : null}
      {!items.length ? <View style={s.center}><Text style={{ color: C.mute }}>No reels yet. Upload the first one from the ReelEarn web app.</Text></View> : h > 0 ? (
        <FlatList data={items} keyExtractor={(i) => i.key} pagingEnabled snapToInterval={h} decelerationRate="fast" showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })} onViewableItemsChanged={onView} viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          windowSize={3} maxToRenderPerBatch={2} initialNumToRender={2} refreshing={false} onRefresh={load}
          renderItem={({ item, index }) => item.type === 'ad'
            ? <View style={{ height: h }}><AdSlot index={item.n} active={index === cur} /></View>
            : <View style={{ height: h, backgroundColor: '#000' }}>
                {isVideo(item.post.media_url)
                  ? <Video source={{ uri: item.post.media_url }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} isLooping shouldPlay={index === cur} />
                  : <Image source={{ uri: item.post.media_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                <View style={s.shade} />
                <View style={s.rail}>
                  <Pressable onPress={() => toggleLike(item.post)} accessibilityLabel="Like" hitSlop={10}><Text style={[s.icon, liked.has(item.post.client_id) && { color: C.red }]}>{liked.has(item.post.client_id) ? '♥' : '♡'}</Text></Pressable>
                </View>
                <View style={s.info}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {item.post.photo_url ? <Image source={{ uri: item.post.photo_url }} style={s.av} /> : <View style={[s.av, { backgroundColor: C.field2, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{item.post.username[0]?.toUpperCase()}</Text></View>}
                    <Text style={s.user}>@{item.post.username}</Text>
                    {item.post.owner_id !== user?.id ? <Pressable onPress={() => toggleFollow(item.post)} style={s.follow}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{following.has(item.post.owner_id) ? 'Following' : 'Follow'}</Text></Pressable> : null}
                  </View>
                  {item.post.caption ? <Text style={s.cap} numberOfLines={3}>{item.post.caption}</Text> : null}
                </View>
              </View>} />) : null}
    </View>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  err: { color: C.red, textAlign: 'center', padding: 8 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200, backgroundColor: 'rgba(0,0,0,0.35)' },
  rail: { position: 'absolute', right: 14, bottom: 120 },
  icon: { color: '#fff', fontSize: 38 },
  info: { position: 'absolute', left: 14, right: 70, bottom: 24 },
  av: { width: 38, height: 38, borderRadius: 19 },
  user: { color: '#fff', fontWeight: '700', fontSize: 16 },
  follow: { borderColor: '#fff', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cap: { color: '#fff', marginTop: 10, lineHeight: 20 },
});
