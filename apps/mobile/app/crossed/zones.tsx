import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import type { SensitiveZone } from '@kapara/shared';
import { DEMO_MODE } from '../../src/api/client';
import { useAddZone, useRemoveZone, useZones } from '../../src/social/api';
import { Card, DemoNotice, Loading, Row, RowGroup, Section, StackHeader, useFormat } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, Text } from '../../src/ui';

const KINDS: SensitiveZone['kind'][] = ['home', 'work', 'other'];

/** Places where Croisés never records anything. Coordinates are never shown back. */
export default function Zones() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const zones = useZones();
  const add = useAddZone();
  const remove = useRemoveZone();
  const [kind, setKind] = useState<SensitiveZone['kind']>('home');
  const list = zones.data ?? [];
  const full = list.length >= 5;

  const addHere = async () => {
    if (DEMO_MODE) { add.mutate({ lat: 0, lng: 0, kind }); return; }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('crossed.permissionTitle'), t('crossed.permissionDenied')); return; }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    add.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude, kind }, { onError: () => Alert.alert(t('common.error')) });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={t('crossed.zonesTitle')} subtitle={t('crossed.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}>
        <DemoNotice />
        <View style={{ marginHorizontal: space.lg, marginBottom: space.xl }}>
          <Card>
            <Text tone="textMuted">{t('crossed.zonesIntro')}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }} accessibilityRole="radiogroup">
              {KINDS.map((k) => (
                <Button key={k} kind={kind === k ? 'primary' : 'secondary'} label={t(`crossed.zoneKind.${k}`)} onPress={() => setKind(k)}
                  accessibilityRole="radio" accessibilityState={{ selected: kind === k }} />
              ))}
            </View>
            <Button label={t('crossed.zoneAddHere')} disabled={full} loading={add.isPending} onPress={() => void addHere()} />
            {full ? <Text variant="caption" tone="textMuted">{t('crossed.zonesMax')}</Text> : null}
          </Card>
        </View>
        <Section title={t('crossed.zones')}>
          {zones.isLoading ? <Loading /> : list.length === 0 ? (
            <View style={{ padding: space.xl, borderRadius: radius.lg, backgroundColor: c.surface }}><Text tone="textMuted">{t('crossed.zonesEmpty')}</Text></View>
          ) : (
            <RowGroup>
              {list.map((z, i) => (
                <Row key={z.id} first={i === 0} label={t(`crossed.zoneKind.${z.kind}`)} detail={t('crossed.zoneAddedOn', { date: f.day(z.createdAt) })}
                  right={<Button kind="ghost" label={t('crossed.zoneRemove')} onPress={() => remove.mutate(z.id)} />} />
              ))}
            </RowGroup>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}
