import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { fonts, hitSlop, palette, radius, space } from '@kapara/design';
import { LIMITS, PRICES, saving, total, type Months, type PlanId } from '../src/premium/plans';
import { useCancelPlan, usePlan, useSetDiscreet, useSubscribe, type PaywallReason } from '../src/premium/store';
import { Icon, Text, useLayout } from '../src/ui';
import { BRAND_NAME, WORDMARK } from '../src/ui/brandPaths';

/**
 * The membership page. Always on night, whatever the app theme: one calm
 * page, serif titles, sand for the one action. Opens on what the member was
 * trying to do (reason), shows the two plans, the commitment, and plainly
 * what stays free. Payment is simulated in the demo and says so.
 */
const N = {
  bg: palette.night, card: '#141417', cardOn: '#1B1A17', line: '#2A2A2E', text: palette.cream, muted: palette.creamSoft,
  subtle: palette.dune, sand: palette.sand, sandPressed: palette.sandPressed, onSand: palette.black,
};
type Paid = Exclude<PlanId, 'free'>;
const MONTHS: Months[] = [1, 3, 6];

export default function Premium() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isPhone } = useLayout();
  const { reason = 'browse' } = useLocalSearchParams<{ reason?: PaywallReason }>();
  const plan = usePlan();
  const subscribe = useSubscribe();
  const cancel = useCancelPlan();
  const discreet = useSetDiscreet();
  const suggested: Paid = reason === 'discreet' || plan.data?.subscribed === 'plus' ? 'cercle' : 'plus';
  const [choice, setChoice] = useState<Paid>(suggested);
  const [months, setMonths] = useState<Months>(3);
  const [done, setDone] = useState(false);

  const money = (n: number) => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(n);
  const day = (iso: string) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  const p = plan.data;
  const current = p?.subscribed ?? 'free';
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const buy = () => subscribe.mutate({ plan: choice, months }, { onSuccess: () => setDone(true) });

  const headline = p && p.plan === 'free' && reason !== 'browse'
    ? t(`premium.reason.${reason}`, { count: reason === 'like' ? LIMITS.free.likesPerDay ?? 0 : LIMITS.free.picksPerDay })
    : t('premium.title');
  const sub = p && p.plan === 'free' && (reason === 'like' || reason === 'picks')
    ? t('premium.resetsAt') : t('premium.subtitle');

  return (
    <View style={{ flex: 1, backgroundColor: N.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + 230 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm }}>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('ui.close')}
              style={{ width: hitSlop, height: hitSlop, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={24} color={N.text} />
            </Pressable>
            <Mark />
            <View style={{ width: hitSlop }} />
          </View>

          {!p ? <ActivityIndicator color={N.sand} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} /> : done ? (
            <Welcome plan={current === 'free' ? choice : current} until={p.until ? day(p.until) : null} onClose={close} />
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(500)} style={{ paddingHorizontal: space.xl, paddingTop: space.xxl, gap: space.md }}>
                <Text variant="overline" style={{ color: N.sand }}>{t('premium.overline', { name: APP.name })}</Text>
                <Text variant="hero" accessibilityRole="header" style={{ color: N.text, fontSize: isPhone ? 40 : 48, lineHeight: isPhone ? 44 : 54 }}>{headline}</Text>
                <Text style={{ color: N.muted, fontSize: 17, lineHeight: 26 }}>{sub}</Text>
              </Animated.View>

              {p.isAdmin ? (
                <Note icon="shield" text={t('premium.admin')} />
              ) : current !== 'free' ? (
                <Membership plan={current} until={p.until ? day(p.until) : null} discreetOn={p.discreetOn}
                  onDiscreet={(v) => discreet.mutate(v)} onCancel={() => cancel.mutate()} cancelling={cancel.isPending} />
              ) : null}

              {current !== 'cercle' && !p.isAdmin ? (
                <>
                  <View style={{ flexDirection: isPhone ? 'column' : 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.xxl }}>
                    {(['plus', 'cercle'] as Paid[]).filter((x) => x !== current).map((id, i) => (
                      <Animated.View key={id} entering={FadeInDown.delay(120 + i * 90).duration(500)} style={{ flex: isPhone ? undefined : 1 }}>
                        <PlanCard id={id} selected={choice === id} onPress={() => setChoice(id)} price={money(PRICES[id][months])}
                          recommended={id === suggested} />
                      </Animated.View>
                    ))}
                  </View>

                  <Animated.View entering={FadeIn.delay(300)} style={{ paddingHorizontal: space.lg, marginTop: space.xl, gap: space.sm }}>
                    <Text variant="overline" style={{ color: N.subtle, marginLeft: space.xs }}>{t('premium.commitment')}</Text>
                    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: N.card, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: N.line }}>
                      {MONTHS.map((m) => {
                        const on = months === m;
                        const off = saving(choice, m);
                        return (
                          <Pressable key={m} onPress={() => setMonths(m)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                            accessibilityLabel={`${t('premium.months', { count: m })}${off ? `, −${off} %` : ''}`}
                            style={{ flex: 1, minHeight: hitSlop, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? N.text : 'transparent' }}>
                            <Text variant="label" style={{ color: on ? N.onSand : N.text, fontFamily: fonts.bodySemibold }}>{t('premium.months', { count: m })}</Text>
                            {off ? <Text variant="caption" style={{ color: on ? '#4A4438' : N.sand, fontSize: 11.5, lineHeight: 14 }}>−{off} %</Text> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </Animated.View>
                </>
              ) : null}

              <Compare current={current} />
              <Text variant="caption" style={{ color: N.muted, marginHorizontal: space.xl, marginTop: space.md, fontSize: 14, lineHeight: 20 }}>{t('premium.liveNote')}</Text>

              <View style={{ paddingHorizontal: space.xl, marginTop: space.xl, gap: space.sm }}>
                <Text variant="overline" style={{ color: N.subtle }}>{t('premium.alwaysFreeTitle')}</Text>
                <Text style={{ color: N.muted }}>{t('premium.alwaysFree')}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {p && !done && current !== 'cercle' && !p.isAdmin ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingBottom: insets.bottom + space.md, backgroundColor: N.bg, borderTopWidth: 1, borderTopColor: N.line }}>
          <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: space.xl, gap: space.sm }}>
            <SandButton label={t('premium.cta', { plan: t(`premium.plan.${choice}`), price: money(total(choice, months)), count: months })}
              onPress={buy} loading={subscribe.isPending} />
            {subscribe.isError ? <Text variant="caption" style={{ color: '#FF7A6B', textAlign: 'center' }}>{t('premium.error')}</Text> : null}
            <Text variant="caption" style={{ color: N.subtle, textAlign: 'center' }}>{t('premium.demoPayment')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The wordmark in cream, whatever the app theme. */
function Mark() {
  if (BRAND_NAME !== APP.name) return <Text style={{ fontFamily: fonts.display, fontSize: 20, letterSpacing: 5, color: N.text }}>{APP.name.toUpperCase()}</Text>;
  const h = 13;
  return (
    <View accessible accessibilityLabel={APP.name}>
      <Svg width={(h * WORDMARK.width) / WORDMARK.height} height={h} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}><Path d={WORDMARK.d} fill={N.text} /></Svg>
    </View>
  );
}

function PlanCard({ id, selected, onPress, price, recommended }: { id: Paid; selected: boolean; onPress: () => void; price: string; recommended: boolean }) {
  const { t } = useTranslation();
  const l = LIMITS[id];
  const lines = [
    l.likesPerDay == null ? t('premium.f.likesUnlimited') : t('premium.f.likes', { count: l.likesPerDay }),
    t('premium.f.picks', { count: l.picksPerDay }),
    t('premium.f.liveFilters'),
    t('premium.f.seeLikes'), t('premium.f.rewind'),
    ...(l.discreet ? [t('premium.f.discreet')] : []),
  ];
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
      accessibilityLabel={`${t(`premium.plan.${id}`)}, ${t('premium.perMonth', { price })}. ${lines.join('. ')}`}
      style={({ pressed }) => ({
        borderRadius: radius.xl, padding: space.xl, gap: space.lg, borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? N.sand : N.line, backgroundColor: selected ? N.cardOn : N.card, transform: [{ scale: pressed ? 0.99 : 1 }],
        ...(Platform.OS === 'web' ? { transitionDuration: '200ms', transitionProperty: 'border-color, background-color, transform' } as object : {}),
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: N.text }}>{t(`premium.plan.${id}`)}</Text>
          <Text variant="caption" style={{ color: N.muted }}>{t(`premium.tagline.${id}`)}</Text>
        </View>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: selected ? N.sand : N.subtle, alignItems: 'center', justifyContent: 'center' }}>
          {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: N.sand }} /> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 22, lineHeight: 28, color: N.text }}>{price}</Text>
        <Text variant="caption" style={{ color: N.muted }}>{t('premium.month')}</Text>
        {recommended ? <Text variant="overline" style={{ color: N.sand, marginLeft: 'auto' }}>{t('premium.recommended')}</Text> : null}
      </View>
      <View style={{ gap: space.sm }}>
        {lines.map((x) => (
          <View key={x} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Icon name="check" size={16} color={N.sand} />
            <Text variant="caption" style={{ color: N.text, flex: 1, fontSize: 14, lineHeight: 20 }}>{x}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/** Free / Plus / Cercle side by side: the whole offer in one table. */
function Compare({ current }: { current: PlanId }) {
  const { t } = useTranslation();
  const cell = (v: number | null | boolean) => (v === true ? '✓' : v === false ? '—' : v == null ? '∞' : String(v));
  const rows: [string, (id: PlanId) => number | null | boolean][] = [
    [t('premium.row.likes'), (id) => LIMITS[id].likesPerDay],
    [t('premium.row.picks'), (id) => LIMITS[id].picksPerDay],
    [t('premium.row.liveFilters'), (id) => LIMITS[id].liveFilters],
    [t('premium.row.seeLikes'), (id) => LIMITS[id].seeLikes],
    [t('premium.row.rewind'), (id) => LIMITS[id].rewind],
    [t('premium.row.discreet'), (id) => LIMITS[id].discreet],
    [t('premium.row.city'), () => true],
    [t('premium.row.messages'), () => true],
  ];
  const ids: PlanId[] = ['free', 'plus', 'cercle'];
  return (
    <Animated.View entering={FadeIn.delay(380)} style={{ marginHorizontal: space.lg, marginTop: space.xxl, borderRadius: radius.xl, borderWidth: 1, borderColor: N.line, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', paddingVertical: space.md, paddingHorizontal: space.lg, backgroundColor: N.card }}>
        <Text variant="overline" style={{ color: N.subtle, flex: 1.6 }}>{t('premium.compare')}</Text>
        {ids.map((id) => (
          <Text key={id} variant="label" style={{ flex: 1, textAlign: 'center', color: id === current ? N.sand : N.text, fontFamily: fonts.bodySemibold }}>{t(`premium.plan.${id}`)}</Text>
        ))}
      </View>
      {rows.map(([label, get]) => (
        <View key={label} accessible accessibilityLabel={`${label} : ${ids.map((id) => `${t(`premium.plan.${id}`)} ${cell(get(id))}`).join(', ')}`}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, borderTopWidth: 1, borderTopColor: N.line }}>
          <Text variant="caption" style={{ color: N.muted, flex: 1.6, fontSize: 14, lineHeight: 20 }}>{label}</Text>
          {ids.map((id) => {
            const v = cell(get(id));
            return <Text key={id} style={{ flex: 1, textAlign: 'center', color: v === '—' ? N.subtle : v === '✓' || v === '∞' ? N.sand : N.text, fontFamily: fonts.bodyMedium, fontSize: 15 }}>{v}</Text>;
          })}
        </View>
      ))}
    </Animated.View>
  );
}

function Membership({ plan, until, discreetOn, onDiscreet, onCancel, cancelling }: {
  plan: PlanId; until: string | null; discreetOn: boolean; onDiscreet: (v: boolean) => void; onCancel: () => void; cancelling: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ marginHorizontal: space.lg, marginTop: space.xxl, borderRadius: radius.xl, backgroundColor: N.cardOn, borderWidth: 1, borderColor: N.sand, padding: space.xl, gap: space.lg }}>
      <View style={{ gap: 2 }}>
        <Text variant="overline" style={{ color: N.sand }}>{t('premium.yourPlan')}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: N.text }}>{t(`premium.plan.${plan}`)}</Text>
        {until ? <Text variant="caption" style={{ color: N.muted }}>{t('premium.until', { date: until })}</Text> : null}
      </View>
      {LIMITS[plan].discreet ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: N.text }}>{t('premium.discreetTitle')}</Text>
            <Text variant="caption" style={{ color: N.muted }}>{t('premium.discreetBody')}</Text>
          </View>
          <Switch value={discreetOn} onValueChange={onDiscreet} trackColor={{ true: N.sand, false: N.line }} accessibilityLabel={t('premium.discreetTitle')} />
        </View>
      ) : null}
      <Pressable onPress={onCancel} disabled={cancelling} accessibilityRole="button" style={{ minHeight: hitSlop, justifyContent: 'center' }}>
        {cancelling ? <ActivityIndicator color={N.sand} /> : <Text variant="label" style={{ color: N.muted, textDecorationLine: 'underline' }}>{t('premium.cancel')}</Text>}
      </Pressable>
    </View>
  );
}

function Welcome({ plan, until, onClose }: { plan: PlanId; until: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: space.xl, paddingTop: space.xxxl * 1.5, gap: space.lg, alignItems: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: N.sand, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={28} color={N.sand} />
      </View>
      <Text variant="hero" accessibilityRole="header" style={{ color: N.text, textAlign: 'center' }}>{t('premium.welcome', { plan: t(`premium.plan.${plan}`) })}</Text>
      <Text style={{ color: N.muted, textAlign: 'center', fontSize: 17, lineHeight: 26 }}>{until ? t('premium.welcomeBody', { date: until }) : t('premium.welcomeBodyNoDate')}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: space.lg }}><SandButton label={t('premium.continue')} onPress={onClose} /></View>
      <Text variant="caption" style={{ color: N.subtle, textAlign: 'center' }}>{t('premium.demoPayment')}</Text>
    </Animated.View>
  );
}

function Note({ icon, text }: { icon: 'shield'; text: string }) {
  return (
    <View style={{ marginHorizontal: space.lg, marginTop: space.xxl, borderRadius: radius.lg, borderWidth: 1, borderColor: N.line, padding: space.lg, flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
      <Icon name={icon} size={20} color={N.sand} />
      <Text style={{ color: N.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

function SandButton({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={loading} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy: loading }}
      style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl,
        backgroundColor: pressed ? N.sandPressed : N.sand, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      {loading ? <ActivityIndicator color={N.onSand} /> : <Text style={{ color: N.onSand, fontFamily: fonts.bodySemibold, fontSize: 16, letterSpacing: 0.2 }} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>}
    </Pressable>
  );
}
