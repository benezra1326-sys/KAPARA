import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Switch, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { hitSlop, radius, space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { CLOUD } from '../cloud/client';
import { useTheme } from '../theme';
import { Icon, Text } from '../ui';
import { photoSource } from '../demo/images';

/** Building blocks shared by the Croisés / messages / introductions / safety screens. */

export function Avatar({ uri, name, size = 56 }: { uri: string | null; name: string; size?: number }) {
  const { c } = useTheme();
  return uri ? (
    <Image source={photoSource(uri)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceAlt }} contentFit="cover" transition={200} accessibilityIgnoresInvertColors accessible={false} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="heading" tone="accent">{name.slice(0, 1)}</Text>
    </View>
  );
}

/** Stack screen header: back + title, safe-area aware, RTL aware. */
export function StackHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel={t('common.back')}
        style={{ width: hitSlop, height: hitSlop, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" size={24} color={c.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text variant="overline" tone="textSubtle">{subtitle}</Text> : null}
        <Text variant="heading" accessibilityRole="header" numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md }, style]}>{children}</View>;
}

export function Section({ title, children, hint }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.xl, gap: space.md }}>
      <View style={{ paddingHorizontal: space.sm, gap: space.xs }}>
        <Text variant="overline" tone="textSubtle" accessibilityRole="header">{title}</Text>
        {hint ? <Text variant="caption" tone="textMuted">{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A list of tappable rows in one rounded surface. */
export function RowGroup({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }}>{children}</View>;
}

export function Row({ label, detail, onPress, danger, first, right, accessibilityHint }: {
  label: string; detail?: string; onPress?: () => void; danger?: boolean; first?: boolean; right?: ReactNode; accessibilityHint?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({
        minHeight: 56, paddingHorizontal: space.xl, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md,
        backgroundColor: pressed ? c.surfaceAlt : 'transparent', borderTopWidth: first ? 0 : 1, borderTopColor: c.border,
      })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={danger ? { color: c.danger } : undefined}>{label}</Text>
        {detail ? <Text variant="caption" tone="textMuted">{detail}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function ToggleRow({ label, detail, value, onChange, first, disabled }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void; first?: boolean; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Row first={first} label={label} detail={detail}
      right={<Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={label}
        trackColor={{ true: c.accent, false: c.textSubtle }} thumbColor={c.text} ios_backgroundColor={c.border} />} />
  );
}

/** `real`: the screen is backed by the database for real accounts, so no demo notice there. */
export function DemoNotice({ real }: { real?: boolean } = {}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  if (!DEMO_MODE || (real && CLOUD)) return null;
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.lg, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: c.surfaceAlt, flexDirection: 'row', gap: space.sm, alignItems: 'center' }} accessibilityRole="text">
      <Icon name="info" size={16} color={c.textMuted} />
      <Text variant="caption" tone="textMuted" style={{ flex: 1 }}>{t('common.demoMode')}</Text>
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  const { t } = useTranslation();
  return <ActivityIndicator color={c.accent} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} />;
}

/** Small pill, e.g. "Présentation" or "Croisé·e plusieurs fois". */
export function Pill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'live' | 'muted' }) {
  const { c } = useTheme();
  const bg = tone === 'accent' ? c.accentSoft : tone === 'live' ? c.surfaceAlt : c.surfaceAlt;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 3 }}>
      <Text variant="caption" tone={tone === 'accent' ? 'accent' : tone === 'live' ? 'live' : 'textMuted'}>{label}</Text>
    </View>
  );
}

/** Locale-aware short date/time, in the device time zone. */
export function useFormat() {
  const { i18n } = useTranslation();
  const loc = i18n.language;
  return {
    day: (iso: string) => new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(new Date(iso)),
    dayTime: (iso: string, timeZone?: string) => new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso)),
    time: (iso: string) => new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)),
    /** Conversation list: time today, else day. */
    when: (iso: string) => {
      const d = new Date(iso);
      return d.toDateString() === new Date().toDateString()
        ? new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(d)
        : new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(d);
    },
  };
}
