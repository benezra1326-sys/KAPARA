import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Recommendation } from '@kapara/shared';
import { radius, shadow, space } from '@kapara/design';
import { PROMPT_LABELS } from '../demo/profiles';
import { useTheme } from '../theme';
import { DemoBadge } from './DemoBadge';
import { Text } from './Text';

/**
 * Editorial profile: photo, then a prompt, then more photos. Every element
 * has its own "react" affordance — first contact targets something specific.
 */
export function ProfileCard({ rec, onReact }: { rec: Recommendation; onReact: (target: { kind: 'photo' | 'prompt'; id: string }) => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const p = rec.profile;
  const [first, ...rest] = p.photos;
  return (
    <View style={{ marginHorizontal: space.lg, marginBottom: space.xxl, gap: space.lg }}>
      {first ? (
        <View style={[{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: c.surfaceAlt }, shadow.card]}>
          <Image source={first.url} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" transition={300}
            accessibilityLabel={`${p.firstName}, photo 1`} />
          <View style={{ position: 'absolute', left: space.lg, right: 80, bottom: space.lg, gap: space.sm }}>
            {p.isDemo ? <DemoBadge /> : null}
            <Text variant="hero" style={{ color: '#fff' }}>{p.firstName}, {p.age}</Text>
            {p.headline ? <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{p.headline}</Text> : null}
          </View>
          <ReactButton label={t('forYou.react')} onPress={() => onReact({ kind: 'photo', id: first.id })} />
        </View>
      ) : null}

      {rec.reasons.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityLabel={t('forYou.why')}>
          {rec.reasons.map((r) => (
            <View key={r.key} style={{ backgroundColor: c.accentSoft, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs }}>
              <Text variant="caption" tone="accent">{t(`reason.${r.key}`, r.params ?? {})}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {p.prompts.map((q) => (
        <View key={q.id} style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.sm }}>
          <Text variant="overline" tone="textSubtle">{PROMPT_LABELS[q.id] ?? q.id}</Text>
          <Text variant="quote">{q.answer}</Text>
          <ReactButton inline label={t('forYou.react')} onPress={() => onReact({ kind: 'prompt', id: q.id })} />
        </View>
      ))}

      {rest.map((ph, i) => (
        <View key={ph.id} style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
          <Image source={ph.url} style={{ width: '100%', aspectRatio: 4 / 5 }} contentFit="cover" transition={300} accessibilityLabel={`${p.firstName}, photo ${i + 2}`} />
          <ReactButton label={t('forYou.react')} onPress={() => onReact({ kind: 'photo', id: ph.id })} />
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
        width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pressed ? 0.92 : 1 }],
      }, inline ? { alignSelf: 'flex-end' } : { position: 'absolute', right: space.lg, bottom: space.lg }, shadow.float]}>
      <Text variant="heading" tone="accent" style={{ lineHeight: 26 }}>♡</Text>
    </Pressable>
  );
}
