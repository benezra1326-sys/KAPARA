import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View, type ScrollViewInstance, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { ProfilePublic } from '@kapara/shared';
import { palette, radius, shadow, space } from '@kapara/design';
import { photoSource } from '../demo/images';
import { DemoBadge } from './DemoBadge';
import { Icon } from './Icon';
import { useLayout } from './layout';
import { Text } from './Text';

/**
 * A person's photos, full screen, one at a time: swipe (or the arrows on a
 * computer) to go through them, the heart to react to the one on screen.
 * The background stays aubergine whatever the theme, so the photo leads.
 */
export function PhotoViewer({ profile: p, index, onClose, onReact }: {
  profile?: ProfilePublic; index: number | null; onClose: () => void; onReact?: (photoId: string) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useLayout();
  const scroller = useRef<ScrollViewInstance>(null);
  const [at, setAt] = useState(index ?? 0);
  const photos = p?.photos ?? [];
  const visible = index != null && !!p;

  // Open on the photo that was tapped.
  useEffect(() => {
    if (index == null) return;
    setAt(index);
    const go = () => scroller.current?.scrollTo({ x: index * width, animated: false });
    go(); const id = setTimeout(go, 30); // web lays the pages out a frame later
    return () => clearTimeout(id);
  }, [index, width]);

  const goTo = (n: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, n));
    setAt(next);
    scroller.current?.scrollTo({ x: next * width, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const n = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (n !== at && n >= 0 && n < photos.length) setAt(n);
  };
  const current = photos[at];
  const desktop = Platform.OS === 'web' && width >= 720;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent={false}>
      <View style={{ flex: 1, backgroundColor: palette.night }} accessibilityViewIsModal>
        <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}
          style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
          {photos.map((ph, n) => (
            <View key={ph.id} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={photoSource(ph.url)} style={{ width: desktop ? Math.min(width - 200, height * 0.8) : width, height: desktop ? height - 120 : height * 0.78 }}
                contentFit="contain" accessibilityLabel={ph.caption ?? t('pick.photoOf', { name: p?.firstName ?? '', n: n + 1 })} />
            </View>
          ))}
        </ScrollView>

        {/* Top: close, whose photos, where we are. */}
        <View style={{ position: 'absolute', top: insets.top + space.md, start: space.lg, end: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('ui.close')} hitSlop={8}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" style={{ color: '#FFFFFF' }} numberOfLines={1}>{p?.firstName}</Text>
            {photos.length > 1 ? <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }} accessibilityLiveRegion="polite">{t('liked.photoCount', { n: at + 1, total: photos.length })}</Text> : null}
          </View>
          {p?.isDemo ? <DemoBadge compact /> : null}
        </View>

        {/* Dots: how many photos, which one. */}
        {photos.length > 1 ? (
          <View style={{ position: 'absolute', top: insets.top + space.md + 60, alignSelf: 'center', flexDirection: 'row', gap: 6 }} accessible={false}>
            {photos.map((ph, n) => <View key={ph.id} style={{ width: n === at ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: n === at ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }} />)}
          </View>
        ) : null}

        {desktop && at > 0 ? <Arrow side="start" label={t('liked.previousPhoto')} onPress={() => goTo(at - 1)} /> : null}
        {desktop && at < photos.length - 1 ? <Arrow side="end" label={t('liked.nextPhoto')} onPress={() => goTo(at + 1)} /> : null}

        {/* Bottom: the caption, and reacting to this photo in particular. */}
        <View style={{ position: 'absolute', bottom: insets.bottom + space.xl, start: space.lg, end: space.lg, flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <View style={{ flex: 1 }}>
            {current?.caption ? <Text variant="body" style={{ color: '#FFFFFF' }} numberOfLines={3}>{current.caption}</Text> : null}
          </View>
          {onReact && current ? (
            <Pressable onPress={() => onReact(current.id)} accessibilityRole="button" accessibilityLabel={t('pick.reactToPhoto')}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56, paddingHorizontal: space.xl, borderRadius: radius.pill,
                backgroundColor: palette.grenatLift, transform: [{ scale: pressed ? 0.95 : 1 }] }, shadow.float]}>
              <Icon name="heart" size={22} color="#FFFFFF" />
              <Text variant="label" style={{ color: '#FFFFFF' }}>{t('liked.likePhoto')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Arrow({ side, label, onPress }: { side: 'start' | 'end'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ position: 'absolute', top: '50%', [side]: space.xl, marginTop: -28, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
        transform: side === 'start' ? [{ scaleX: -1 }] : undefined }}>
      <Icon name="chevron" size={24} color="#FFFFFF" />
    </Pressable>
  );
}
