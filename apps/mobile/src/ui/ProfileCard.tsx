import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { ProfilePublic, Recommendation } from '@kapara/shared';
import { radius, shadow, space } from '@kapara/design';
import { photoSource } from '../demo/images';
import { ALL_FIELDS } from '../me/fields';
import { useTheme } from '../theme';
import { DemoBadge } from './DemoBadge';
import { Icon } from './Icon';
import { useLayout } from './layout';
import { Text } from './Text';
import { imageFade } from './imageFade';

export type ReactTarget = { kind: 'photo' | 'prompt'; id: string };

/**
 * Editorial profile: hero photo, why we suggest it, then prompts and photos
 * interleaved, and only the Jewish-life answers this person chose to share.
 * Every photo and answer has its own "react" control — first contact is
 * always about something specific. Pass no `onReact` for a read-only preview.
 *
 * Responsive: one column on phones (photos capped to ~60 % of the screen
 * height so name, reasons and actions stay close), two columns from 720 px
 * of available width (photos on the left at a fixed width, words on the right).
 */
export function ProfileCard({ profile: p, reasons, onReact }: { profile: ProfilePublic; reasons?: Recommendation['reasons']; onReact?: (target: ReactTarget) => void }) {
  const { t } = useTranslation();
  const { contentWidth, height } = useLayout();
  // Real width of the card's container (a preview inside a narrower page
  // must not pick the two-column layout); first frame uses the page estimate.
  const [measured, setMeasured] = useState(0);
  const available = measured || contentWidth('wide');
  const onLayout = (e: LayoutChangeEvent) => setMeasured(Math.round(e.nativeEvent.layout.width));
  const twoCol = available >= 700;
  const [first, ...photos] = p.photos;
  const photoMax = Math.max(280, Math.round(height * (height < 700 ? 0.52 : 0.64)));

  const prompt = (q: ProfilePublic['prompts'][number]) => <PromptBlock key={`q-${q.id}`} q={q} onReact={onReact} />;
  const photo = (ph: ProfilePublic['photos'][number], style?: object) => (
    <PhotoBlock key={`p-${ph.id}`} profile={p} photo={ph} maxHeight={twoCol ? undefined : photoMax} style={style}
      onReact={onReact ? () => onReact({ kind: 'photo', id: ph.id }) : undefined} />
  );
  const hero = first ? <Hero profile={p} photo={first} maxHeight={twoCol ? undefined : photoMax} onReact={onReact ? () => onReact({ kind: 'photo', id: first.id }) : undefined} /> : null;
  const intro = p.headline || p.languages.length ? (
    <View style={{ gap: space.sm }}>
      {p.headline ? <Text variant="heading">{p.headline}</Text> : null}
      {p.languages.length ? <Text variant="caption" tone="textMuted">{t('pick.speaks', { list: p.languages.map((l) => t(`lang.${l}`, { defaultValue: l })).join(', ') })}</Text> : null}
    </View>
  ) : null;
  const why = reasons?.length ? <Why reasons={reasons} /> : null;

  if (twoCol) {
    const photoCol = Math.min(400, Math.round(available * 0.42));
    return (
      <View onLayout={onLayout} style={{ marginHorizontal: space.lg, flexDirection: 'row', gap: space.xxl, alignItems: 'flex-start' }}>
        <View style={{ width: photoCol, gap: space.lg }}>
          {[hero, ...photos.map((ph) => photo(ph))].map((b, i) => <Rise key={i} i={i}>{b}</Rise>)}
        </View>
        <View style={{ flex: 1, gap: space.lg, maxWidth: 560 }}>
          {[why, intro, ...p.prompts.map(prompt), <SharedLife profile={p} key="life" />].map((b, i) => <Rise key={i} i={i + 1}>{b}</Rise>)}
        </View>
      </View>
    );
  }

  // Phone rhythm: answer, photo, (life), answer, photo, answer…
  const blocks: ReactNode[] = [];
  const prompts = [...p.prompts];
  const rest = [...photos];
  const shared = <SharedLife profile={p} key="life" />;
  for (let i = 0; prompts.length || rest.length; i++) {
    const q = prompts.shift();
    if (q) blocks.push(prompt(q));
    const ph = rest.shift();
    if (ph) blocks.push(photo(ph));
    if (i === 0) blocks.push(shared);
  }
  if (!blocks.includes(shared)) blocks.push(shared);

  return (
    <View onLayout={onLayout} style={{ marginHorizontal: space.lg, gap: space.lg }}>
      <Rise i={0}>{hero}</Rise>
      <Rise i={1}>{why}</Rise>
      {intro ? <Rise i={2}><View style={{ paddingHorizontal: space.xs }}>{intro}</View></Rise> : null}
      {blocks.map((b, i) => <Rise key={i} i={i + 3}>{b}</Rise>)}
    </View>
  );
}

/** Blocks rise into place one after the other: calm, eased, no bounce. */
function Rise({ i, children }: { i: number; children: ReactNode }) {
  if (!children) return null;
  return <Animated.View entering={FadeInDown.delay(70 * Math.min(i, 6)).duration(520)}>{children}</Animated.View>;
}

/** Main photo with name, age, city and badges over a soft gradient. Faces stay in the upper part (contentPosition top). */
function Hero({ profile: p, photo, maxHeight, onReact }: { profile: ProfilePublic; photo: ProfilePublic['photos'][number]; maxHeight?: number; onReact?: () => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surfaceAlt, width: '100%', aspectRatio: 4 / 5, maxHeight, alignSelf: 'center' }}>
      <Image source={photoSource(photo.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={imageFade(300)}
        accessibilityLabel={photo.caption ?? t('pick.photoOf', { name: p.firstName, n: 1 })} />
      <LinearGradient colors={['transparent', 'rgba(10,10,12,0.30)', 'rgba(10,10,12,0.74)']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%' }} pointerEvents="none" />
      {p.isDemo ? <View style={{ position: 'absolute', top: space.lg, start: space.lg }}><DemoBadge /></View> : null}
      {/* After Raya: the first name alone, large and light; the facts on one quiet tracked line. */}
      <View style={{ position: 'absolute', start: space.xl, end: onReact ? 84 : space.xl, bottom: space.xl, gap: 6 }}>
        <Text variant="hero" style={{ color: '#FFFFFF', fontSize: 42, lineHeight: 46 }} accessibilityRole="header" numberOfLines={1}
          accessibilityLabel={`${p.firstName}, ${p.age}`}>{p.firstName}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          <Text variant="overline" style={{ color: 'rgba(255,255,255,0.92)' }}>{[String(p.age), p.city].filter(Boolean).join('  ·  ')}</Text>
          {p.verified ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text variant="overline" style={{ color: 'rgba(255,255,255,0.5)' }}>·</Text>
              <Icon name="check" size={13} color="rgba(255,255,255,0.92)" />
              <Text variant="overline" style={{ color: 'rgba(255,255,255,0.92)' }}>{t(p.isDemo ? 'ux.verifiedDemo' : 'pick.verified')}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {onReact ? <ReactButton label={t('pick.reactToPhoto')} onPress={onReact} /> : null}
    </View>
  );
}

function PhotoBlock({ profile: p, photo, maxHeight, style, onReact }: { profile: ProfilePublic; photo: ProfilePublic['photos'][number]; maxHeight?: number; style?: object; onReact?: () => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surfaceAlt, width: '100%', aspectRatio: 4 / 5, maxHeight, alignSelf: 'center' }, style]}>
      <Image source={photoSource(photo.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={imageFade(300)}
        accessibilityLabel={photo.caption ?? t('pick.photoOf', { name: p.firstName, n: p.photos.indexOf(photo) + 1 })} />
      {photo.caption ? (
        <View style={{ position: 'absolute', start: space.md, end: onReact ? 76 : space.md, bottom: space.md, backgroundColor: 'rgba(10,10,12,0.6)', borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm }}>
          <Text variant="caption" style={{ color: '#fff' }} numberOfLines={3}>{photo.caption}</Text>
        </View>
      ) : null}
      {onReact ? <ReactButton label={t('pick.reactToPhoto')} onPress={onReact} /> : null}
    </View>
  );
}

function PromptBlock({ q, onReact }: { q: ProfilePublic['prompts'][number]; onReact?: (target: ReactTarget) => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const title = t(`prompts.${q.id}`, { defaultValue: q.id });
  return (
    <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, padding: space.xl, paddingBottom: onReact ? space.xxl + space.sm : space.xl, gap: space.md }}
      accessibilityLabel={`${title}. ${q.answer}`}>
      <Text variant="overline" tone="highlight">{title}</Text>
      <Text variant="quote" style={{ fontSize: 25, lineHeight: 32, paddingEnd: onReact ? space.xl : 0 }}>{q.answer}</Text>
      {onReact ? <ReactButton inline label={t('pick.reactTo', { what: title })} onPress={() => onReact({ kind: 'prompt', id: q.id })} /> : null}
    </View>
  );
}

/** "Why this suggestion": built only from answers both people chose to share. */
function Why({ reasons }: { reasons: Recommendation['reasons'] }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  // The API sends full keys ("reason.nearby"), the demo data short ones ("nearby").
  const say = (r: Recommendation['reasons'][number]) => {
    const key = r.key.replace(/^reason\./, '');
    return t(`reason.${key}`, { ...(r.params ?? {}), defaultValue: '' }) || t('reason.fits_your_criteria');
  };
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}
      accessible accessibilityLabel={`${t('forYou.why')}: ${reasons.map(say).join('. ')}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="sparkle" size={18} color={c.highlight} filled />
        <Text variant="overline" tone="highlight">{t('forYou.why')}</Text>
      </View>
      {reasons.map((r) => (
        <View key={r.key} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.highlight, marginTop: 10 }} />
          <Text variant="body" style={{ flex: 1 }}>{say(r)}</Text>
        </View>
      ))}
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
      <View style={{ gap: space.xs }}>
        <Text variant="overline" tone="textMuted" accessibilityRole="header">{t('jl.sharedTitle')}</Text>
        <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' }}>
          <Icon name="eye" size={16} color={c.textSubtle} />
          <Text variant="caption" tone="textSubtle" style={{ flex: 1 }}>{t('ux.sharedNote', { name: p.firstName })}</Text>
        </View>
      </View>
      {items.map((it) => (
        <View key={it.key} style={{ gap: 2 }}>
          <Text variant="caption" tone="textMuted">{it.label}</Text>
          <Text variant="bodyStrong">{it.text}</Text>
          {it.note ? <Text variant="quote" style={{ fontSize: 19, lineHeight: 24 }}>« {it.note} »</Text> : null}
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
        width: 52, height: 52, borderRadius: 26, borderWidth: inline ? 1 : 0, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pressed ? 0.9 : 1 }],
      }, inline ? { position: 'absolute', end: space.md, bottom: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg } : { position: 'absolute', end: space.lg, bottom: space.lg }, shadow.float]}>
      <Icon name="heart" size={inline ? 20 : 24} color={c.accent} />
    </Pressable>
  );
}
