import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RULES } from '@kapara/config';
import { radius, shadow, space } from '@kapara/design';
import type { CrossedItem } from '@kapara/shared';
import { sendPing, useClearCrossed, useCrossed, useCrossedSettings, useSetCrossed } from '../../src/social/api';
import { Card, DemoNotice, Loading, Pill, Row, RowGroup, Section } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, EmptyState, Screen, Text } from '../../src/ui';
import { DEMO_MODE } from '../../src/api/client';
import { photoSource } from '../../src/demo/images';

type Perm = 'unknown' | 'granted' | 'denied';

/**
 * Croisés. Foreground only: the position is sampled while this screen is
 * open, coarsened on the device, blurred again by the server, and shown back
 * as "crossed recently" without time, place or count.
 */
export default function Crossed() {
  const { t } = useTranslation();
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
            <Text variant="quote">{t('crossed.offTitle')}</Text>
            <Text tone="textMuted">{t('crossed.offBody')}</Text>
          </Card>
          <HowItWorks />
          <Button label={t('crossed.enable')} loading={setCrossed.isPending} onPress={() => void enable()} />
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
  return (
    <Screen title={t('crossed.title')} subtitle={t('crossed.subtitle')}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.accent} />}>
      <DemoNotice />
      {q.isLoading ? <Loading /> : q.isError ? (
        <EmptyState title={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
      ) : items.length === 0 ? (
        <EmptyState title={t('crossed.empty')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, gap: space.md, marginBottom: space.xl }}>
          {items.map((it) => <CrossedCard key={it.userId} item={it} />)}
        </View>
      )}
      <Footer />
    </Screen>
  );
}

function CrossedCard({ item }: { item: CrossedItem }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.userId } })}
      accessibilityRole="button" accessibilityLabel={t('crossed.viewProfile', { name: item.firstName })}
      style={({ pressed }) => [{ width: '48%', flexGrow: 1, borderRadius: radius.lg, backgroundColor: c.surface, overflow: 'hidden', transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow.card]}>
      <View>
        {item.photoUrl ? <Image source={photoSource(item.photoUrl)} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" transition={250} accessible={false} />
          : <View style={{ width: '100%', aspectRatio: 3 / 4, backgroundColor: c.surfaceAlt }} />}
        {item.isDemo ? <View style={{ position: 'absolute', top: space.sm, left: space.sm }}><DemoBadge /></View> : null}
      </View>
      <View style={{ padding: space.md, gap: space.xs }}>
        <Text variant="bodyStrong" numberOfLines={1}>{item.firstName}, {item.age}{item.verified ? ' ✓' : ''}</Text>
        <Pill label={item.times === 'several' ? t('crossed.recentlySeveral') : t('crossed.recentlyOnce')} />
      </View>
    </Pressable>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <Card>
      <Text variant="overline" tone="textSubtle">{t('crossed.howTitle')}</Text>
      {(['how1', 'how2', 'how3', 'how4'] as const).map((k) => (
        <View key={k} style={{ flexDirection: 'row', gap: space.md }}>
          <Text tone="highlight" accessibilityElementsHidden>✦</Text>
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
  const clear = useClearCrossed();
  const setCrossed = useSetCrossed();
  return (
    <Section title={t('crossed.howTitle')}>
      <RowGroup>
        <Row first label={t('crossed.zones')} detail={t('crossed.zonesHint')} onPress={() => router.push('/crossed/zones')} right={<Text tone="textSubtle">›</Text>} />
        <Row label={t('crossed.clearHistory')} onPress={() => clear.mutate(undefined, { onSuccess: () => Alert.alert(t('crossed.clearDone')) })} />
        <Row danger label={t('crossed.disable')} onPress={() => Alert.alert(t('crossed.disable'), t('crossed.disableConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), style: 'destructive', onPress: () => setCrossed.mutate(false) },
        ])} />
      </RowGroup>
    </Section>
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
