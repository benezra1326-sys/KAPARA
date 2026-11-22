import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Fragment, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProfilePublic, Recommendation } from '@kapara/shared';
import { radius, shadow, space } from '@kapara/design';
import { photoSource } from '../demo/images';
import { ALL_FIELDS } from '../me/fields';
import { useTheme } from '../theme';
import { DemoBadge } from './DemoBadge';
import { Text } from './Text';

export type ReactTarget = { kind: 'photo' | 'prompt'; id: string };

/**
 * Editorial profile: hero photo, why we suggest it, then prompts and photos
 * interleaved, and only the Jewish-life answers this person chose to share.
 * Every photo and answer has its own "react" control — first contact is
 * always about something specific. Pass no `onReact` for a read-only preview.
 */
export function ProfileCard({ profile: p, reasons, onReact }: { profile: ProfilePublic; reasons?: Recommendation['reasons']; onReact?: (target: ReactTarget) => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const [first, ...photos] = p.photos;
  const blocks: ReactNode[] = [];
  const prompts = [...p.prompts];
  const shared = <SharedLife profile={p} key="life" />;

  // Rhythm: answer, photo, (life), answer, photo, answer…
  for (let i = 0; prompts.length || photos.length; i++) {
    const q = prompts.shift();
    if (q) blocks.push(
      <View key={`q-${q.id}`} style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md }}>
        <Text variant="overline" tone="textSubtle">{t(`prompts.${q.id}`, { defaultValue: q.id })}</Text>
        <Text variant="quote">{q.answer}</Text>
        {onReact ? <ReactButton inline label={t('pick.reactTo', { what: t(`prompts.${q.id}`, { defaultValue: q.id }) })} onPress={() => onReact({ kind: 'prompt', id: q.id })} /> : null}
      </View>,
    );
    const ph = photos.shift();
    if (ph) blocks.push(
      <View key={`p-${ph.id}`} style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
        <Image source={photoSource(ph.url)} style={{ width: '100%', aspectRatio: 4 / 5 }} contentFit="cover" transition={300}
          accessibilityLabel={ph.caption ?? t('pick.photoOf', { name: p.firstName, n: p.photos.indexOf(ph) + 1 })} />
        {onReact ? <ReactButton label={t('pick.reactToPhoto')} onPress={() => onReact({ kind: 'photo', id: ph.id })} /> : null}
      </View>,
    );
    if (i === 0) blocks.push(shared);
  }
  if (!blocks.includes(shared)) blocks.push(shared);

  return (
    <View style={{ marginHorizontal: space.lg, gap: space.lg }}>
      {first ? (
        <View style={[{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: c.surfaceAlt }, shadow.card]}>
          <Image source={photoSource(first.url)} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" transition={300}
            accessibilityLabel={first.caption ?? t('pick.photoOf', { name: p.firstName, n: 1 })} />
          <LinearGradient colors={['transparent', 'rgba(20,17,24,0.72)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' }} pointerEvents="none" />
          <View style={{ position: 'absolute', start: space.xl, end: 88, bottom: space.xl, gap: space.sm }}>
            {p.isDemo ? <DemoBadge /> : null}
            <Text variant="hero" style={{ color: '#fff' }} accessibilityRole="header">{p.firstName}, {p.age}</Text>
            <Text variant="label" style={{ color: 'rgba(255,255,255,0.88)' }}>
              {[p.city, p.verified ? `✓ ${t('pick.verified')}` : null].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
          {onReact ? <ReactButton label={t('pick.reactToPhoto')} onPress={() => onReact({ kind: 'photo', id: first.id })} /> : null}
        </View>
      ) : null}

      {reasons?.length ? <Why reasons={reasons} /> : null}

      {p.headline || p.languages.length ? (
        <View style={{ paddingHorizontal: space.sm, gap: space.sm }}>
          {p.headline ? <Text variant="heading">{p.headline}</Text> : null}
          {p.languages.length ? <Text variant="caption" tone="textMuted">{t('pick.speaks', { list: p.languages.map((l) => t(`lang.${l}`, { defaultValue: l })).join(', ') })}</Text> : null}
        </View>
      ) : null}

      {blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}
    </View>
  );
}

/** "Why this suggestion": built only from answers both people chose to share. */
function Why({ reasons }: { reasons: Recommendation['reasons'] }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ borderStartWidth: 2, borderStartColor: c.highlight, paddingStart: space.lg, paddingVertical: space.xs, marginHorizontal: space.sm, gap: space.xs }}
      accessible accessibilityLabel={`${t('forYou.why')}: ${reasons.map((r) => t(r.key.startsWith("reason.") ? r.key : `reason.${r.key}`, { ...(r.params ?? {}), defaultValue: r.key })).join('. ')}`}>
      <Text variant="overline" tone="highlight">{t('forYou.why')}</Text>
      {reasons.map((r) => <Text key={r.key} variant="body" tone="textMuted">{t(r.key.startsWith("reason.") ? r.key : `reason.${r.key}`, { ...(r.params ?? {}), defaultValue: r.key })}</Text>)}
      <Text variant="caption" tone="textSubtle">{t('pick.whyFootnote')}</Text>
    </View>
  );
}

/** Only the answers this person shared with the viewer (filtered server-side). */
function SharedLife({ profile: p }: { profile: ProfilePublic }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const items = ALL_FIELDS.flatMap((f) => {
    const a = p.jewishLife[f.key];
    if (!a || a.value === null || a.preferNotToSay) return [];
    const v = a.value;
    const text = Array.isArray(v) ? v.map((x) => t(`jl.tags.${x}`, { defaultValue: x })).join(', ')
      : f.kind === 'single' ? t(`jl.options.${f.key}.${String(v)}`, { defaultValue: String(v) }) : String(v);
    return [{ key: f.key, label: t(`jl.short.${f.key}`), text, note: a.note }];
  });
  if (!items.length) return null;
  return (
    <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.lg, padding: space.xl, gap: space.lg }}>
      <Text variant="overline" tone="textSubtle" accessibilityRole="header">{t('jl.sharedTitle')}</Text>
      {items.map((it) => (
        <View key={it.key} style={{ gap: 2 }}>
          <Text variant="caption" tone="textMuted">{it.label}</Text>
          <Text variant="bodyStrong">{it.text}</Text>
          {it.note ? <Text variant="quote" style={{ fontSize: 16, lineHeight: 23 }}>« {it.note} »</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ReactButton({ label, onPress, inline }: { label: string; onPress: () => void; inline?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
      style={({ pressed }) => [{
        width: 52, height: 52, borderRadius: 26, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pressed ? 0.9 : 1 }],
      }, inline ? { alignSelf: 'flex-end' } : { position: 'absolute', end: space.lg, bottom: space.lg }, shadow.float]}>
      <Text variant="heading" tone="accent" style={{ lineHeight: 28 }} accessibilityElementsHidden>♡</Text>
    </Pressable>
  );
}
