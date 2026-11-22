import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import type { ShabbatSettings, ShabbatStatus } from '@kapara/shared';
import { useSetShabbat, useShabbat } from '../../src/social/api';
import { Card, DemoNotice, Loading, Row, RowGroup, Section, StackHeader, ToggleRow, useFormat } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, EmptyState, Text } from '../../src/ui';

const CANDLES = [18, 20, 30, 40];
const HAVDALAH: (number | null)[] = [null, 42, 50, 72];

/**
 * Shabbat mode: optional and private. Times are computed on the server for
 * the member's city (sunset-based) and can be adjusted to their community.
 */
export default function Shabbat() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const q = useShabbat();
  const save = useSetShabbat();
  const s = q.data;

  const update = (patch: Partial<ShabbatSettings>) => {
    if (!s) return;
    save.mutate({ enabled: s.enabled, includeHolidays: s.includeHolidays, candleLightingMins: s.candleLightingMins, havdalahMins: s.havdalahMins, ...patch });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={t('shabbat.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}>
        <DemoNotice />
        {q.isLoading ? <Loading /> : q.isError || !s ? (
          <EmptyState title={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
        ) : (
          <>
            {s.resting && s.current ? (
              <View style={{ marginHorizontal: space.lg, marginBottom: space.xl, padding: space.xl, borderRadius: radius.xl, backgroundColor: c.accentSoft }}>
                <Text variant="quote">{t('shabbat.resting', { end: f.dayTime(s.current.end, s.timezone) })}</Text>
              </View>
            ) : null}
            <View style={{ marginHorizontal: space.lg, marginBottom: space.xl }}>
              <Card><Text tone="textMuted">{t('shabbat.intro')}</Text></Card>
            </View>
            <Section title={t('shabbat.title')}>
              <RowGroup>
                <ToggleRow first label={t('shabbat.toggle')} value={s.enabled} onChange={(enabled) => update({ enabled })} disabled={save.isPending} />
                <ToggleRow label={t('shabbat.holidays')} value={s.includeHolidays} onChange={(includeHolidays) => update({ includeHolidays })} disabled={save.isPending} />
              </RowGroup>
            </Section>

            <NextWindow s={s} />

            <Section title={t('shabbat.effectsTitle')}>
              <Card>
                {(['effect1', 'effect2', 'effect3', 'effect4'] as const).map((k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: space.md }}>
                    <Text tone="highlight" accessibilityElementsHidden>✦</Text>
                    <Text tone="textMuted" style={{ flex: 1 }}>{t(`shabbat.${k}`)}</Text>
                  </View>
                ))}
              </Card>
            </Section>

            <Section title={t('shabbat.candles')} hint={t('shabbat.candlesValue', { count: s.candleLightingMins })}>
              <Choices values={CANDLES} selected={s.candleLightingMins} label={(v) => `${v} min`} onPick={(v) => update({ candleLightingMins: v })} />
            </Section>
            <Section title={t('shabbat.havdalah')} hint={s.havdalahMins ? t('shabbat.havdalahValue', { count: s.havdalahMins }) : t('shabbat.havdalahStars')}>
              <Choices values={HAVDALAH} selected={s.havdalahMins} label={(v) => (v === null ? '✦' : `${v} min`)} onPick={(v) => update({ havdalahMins: v })}
                a11y={(v) => (v === null ? t('shabbat.havdalahStars') : t('shabbat.havdalahValue', { count: v }))} />
            </Section>
            <Text variant="caption" tone="textSubtle" style={{ marginHorizontal: space.xxl }}>{t('shabbat.approx', { city: s.city, tz: s.timezone })}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function NextWindow({ s }: { s: ShabbatStatus }) {
  const { t } = useTranslation();
  const f = useFormat();
  const w = s.next;
  if (!w) return null;
  const title = w.kind === 'holiday' ? t('shabbat.nextHoliday', { city: s.city, title: w.title }) : t('shabbat.next', { city: s.city });
  return (
    <Section title={title}>
      <RowGroup>
        <Row first label={t('shabbat.candles')} detail={f.dayTime(w.start, s.timezone)} />
        <Row label={t('shabbat.havdalah')} detail={f.dayTime(w.end, s.timezone)} />
      </RowGroup>
    </Section>
  );
}

function Choices<T extends number | null>({ values, selected, label, onPick, a11y }: { values: T[]; selected: T; label: (v: T) => string; onPick: (v: T) => void; a11y?: (v: T) => string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
      {values.map((v) => (
        <Button key={String(v)} kind={v === selected ? 'primary' : 'secondary'} label={label(v)} accessibilityLabel={a11y ? a11y(v) : label(v)}
          accessibilityRole="radio" accessibilityState={{ selected: v === selected }} onPress={() => onPick(v)} />
      ))}
    </View>
  );
}
