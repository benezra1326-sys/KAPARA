import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, RefreshControl, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RULES } from '@kapara/config';
import { layout, radius, shadow, space } from '@kapara/design';
import type { CrossedItem } from '@kapara/shared';
import { sendPing, useClearCrossed, useCrossed, useCrossedSettings, useSetCrossed } from '../../src/social/api';
import { Card, DemoNotice, Loading, Row, RowGroup, Section } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, columnsFor, DemoBadge, EmptyState, Icon, Screen, Text, useLayout } from '../../src/ui';
import { DEMO_MODE } from '../../src/api/client';
import { photoSource } from '../../src/demo/images';
import { imageFade } from '../../src/ui/imageFade';

type Perm = 'unknown' | 'granted' | 'denied';

/**
 * Croisés. Foreground only: the position is sampled while this screen is
 * open, coarsened on the device, blurred again by the server, and shown back
 * as "crossed recently" without time, place or count.
 */
export default function Crossed() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const settings = useCrossedSettings();
  const setCrossed = useSetCrossed();
  const enabled = Boolean(settings.data?.enabled);
  const [perm, setPerm] = useState<Perm>('unknown');

  const askPermission = useCallback(async () => {
    if (DEMO_MODE) { setPerm('granted'); return true; }
    const r = await Location.requestForegroundPermissionsAsync();
    setPerm(r.granted ? 'granted' : 'denied');
    return r.granted;
  }, []);

  useEffect(() => {
    if (!enabled || DEMO_MODE) { if (DEMO_MODE) setPerm('granted'); return; }
    void Location.getForegroundPermissionsAsync().then((r) => setPerm(r.granted ? 'granted' : r.canAskAgain ? 'unknown' : 'denied'));
  }, [enabled]);

  usePings(enabled && perm === 'granted');

  const enable = async () => {
    if (await askPermission()) setCrossed.mutate(true);
  };

  if (settings.isLoading) return <Screen title={t('crossed.title')} subtitle={t('crossed.subtitle')}><Loading /></Screen>;
  if (settings.isError) return <Screen title={t('crossed.title')}><EmptyState title={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void settings.refetch() }} /></Screen>;

  if (!enabled) {
    return (
      <Screen title={t('crossed.title')} subtitle={t('crossed.subtitle')}>
        <DemoNotice />
        <View style={{ marginHorizontal: space.lg, gap: space.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="crossed" size={22} color={c.accent} />
              <Text variant="heading">{t('crossed.offTitle')}</Text>
            </View>
            <Text tone="textMuted">{t('crossed.offBody')}</Text>
            <Button label={t('crossed.enable')} loading={setCrossed.isPending} onPress={() => void enable()} />
          </Card>
          <HowItWorks />
          {perm === 'denied' ? <PermissionDenied /> : null}
        </View>
      </Screen>
    );
  }

  if (perm === 'denied') {
    return (
      <Screen title={t('crossed.title')} subtitle={t('crossed.subtitle')}>
        <View style={{ marginHorizontal: space.lg, gap: space.lg }}><PermissionDenied /></View>
        <Footer />
      </Screen>
    );
  }

  return <CrossedList />;
}

function CrossedList() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const q = useCrossed(true);
  const items = q.data ?? [];
  const { contentWidth } = useLayout();
  // Measured grid width (falls back to the layout estimate before the first layout).
  const [measured, setMeasured] = useState(0);
  const avail = measured || contentWidth('wide') - space.lg * 2;
  // Portrait cards: 2 columns on phones, up to 5 on desktop, never stretched.
  const cols = Math.max(2, columnsFor(avail, 176, 5));
  const cardWidth = Math.floor((avail - space.md * (cols - 1)) / cols);
  return (
    <Screen title={t('crossed.title')} subtitle={t('crossed.subtitle')} width="wide"
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.accent} />}>
      <DemoNotice />
      {q.isLoading ? <Loading /> : q.isError ? (
        <EmptyState title={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
      ) : items.length === 0 ? (
        <EmptyState title={t('crossed.empty')} />
      ) : (
        <View onLayout={(e) => setMeasured(Math.floor(e.nativeEvent.layout.width) - space.lg * 2)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, gap: space.md, marginBottom: space.xl }}>
          {items.map((it, i) => (
            <Animated.View key={it.userId} entering={FadeInDown.delay(60 * Math.min(i, 8)).duration(420)}>
              <CrossedCard item={it} width={cardWidth} />
            </Animated.View>
          ))}
        </View>
      )}
      <Footer />
    </Screen>
  );
}

function CrossedCard({ item, width }: { item: CrossedItem; width: number }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  // Full-bleed portrait, name set on the photo: the face first, chrome last.
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.userId } })}
      accessibilityRole="button" accessibilityLabel={t('crossed.viewProfile', { name: item.firstName })}
      style={({ pressed }) => [{ width, aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, overflow: 'hidden',
        transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card,
        Platform.OS === 'web' ? ({ transitionDuration: '200ms', transitionProperty: 'transform' } as object) : null]}>
      {item.photoUrl ? <Image source={photoSource(item.photoUrl)} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={imageFade(300)} accessible={false} /> : null}
      <LinearGradient colors={['transparent', 'rgba(10,10,12,0.78)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }} pointerEvents="none" />
      {item.isDemo ? <View style={{ position: 'absolute', top: space.sm, start: space.sm }}><DemoBadge compact /></View> : null}
      <View style={{ position: 'absolute', start: space.md, end: space.md, bottom: space.md, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="heading" numberOfLines={1} style={{ color: '#FFFFFF', flexShrink: 1, fontSize: 24 }}>{item.firstName}, {item.age}</Text>
          {item.verified && !item.isDemo ? <Icon name="check" size={15} color={c.live} /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icon name="crossed" size={13} color={c.accent} />
          <Text variant="caption" numberOfLines={1} style={{ flex: 1, color: 'rgba(255,255,255,0.86)', fontSize: 12 }}>{item.times === 'several' ? t('crossed.recentlySeveral') : t('crossed.recentlyOnce')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <Card>
      <Text variant="overline" tone="textSubtle">{t('crossed.howTitle')}</Text>
      {(['how1', 'how2', 'how3', 'how4'] as const).map((k) => (
        <View key={k} style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ paddingTop: 3 }}><Icon name="sparkle" size={16} color={c.highlight} filled /></View>
          <Text tone="textMuted" style={{ flex: 1 }}>{t(`crossed.${k}`)}</Text>
        </View>
      ))}
    </Card>
  );
}

function PermissionDenied() {
  const { t } = useTranslation();
  return (
    <Card>
      <Text variant="heading">{t('crossed.permissionTitle')}</Text>
      <Text tone="textMuted">{t('crossed.permissionDenied')}</Text>
      <Button kind="secondary" label={t('crossed.openSettings')} onPress={() => void Linking.openSettings()} />
    </Card>
  );
}

function Footer() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const clear = useClearCrossed();
  const setCrossed = useSetCrossed();
  return (
    <View style={{ maxWidth: layout.readable }}>
    <Section title={t('crossed.howTitle')}>
      <RowGroup>
        <Row first label={t('crossed.zones')} detail={t('crossed.zonesHint')} onPress={() => router.push('/crossed/zones')} right={<Icon name="chevron" size={18} color={c.textSubtle} />} />
        <Row label={t('crossed.clearHistory')} onPress={() => clear.mutate(undefined, { onSuccess: () => Alert.alert(t('crossed.clearDone')) })} />
        <Row danger label={t('crossed.disable')} onPress={() => Alert.alert(t('crossed.disable'), t('crossed.disableConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), style: 'destructive', onPress: () => setCrossed.mutate(false) },
        ])} />
      </RowGroup>
    </Section>
    </View>
  );
}

/** Samples while the screen is focused and the app is in the foreground. Never in background. */
function usePings(active: boolean) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useFocusEffect(useCallback(() => {
    if (!active) return undefined;
    const ping = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await sendPing({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // Location unavailable or offline: try again at the next interval.
      }
    };
    void ping();
    timer.current = setInterval(() => void ping(), RULES.crossedPingMinutes * 60_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void ping(); });
    return () => { if (timer.current) clearInterval(timer.current); sub.remove(); };
  }, [active]));
}
