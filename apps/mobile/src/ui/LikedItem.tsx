import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { photoSource } from '../demo/images';
import type { LikedItem } from '../social/liked';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * The element a like was about, quoted: a small photo, or the question in
 * garnet capitals and the answer in the display face. `label` says who liked
 * what ("A aimé votre photo", "Vous avez aimé sa réponse"…).
 */
export function LikedItemQuote({ item, label, comment, size = 'md', mine }: { item: LikedItem | null; label: string; comment?: string | null; size?: 'sm' | 'md'; /** The element is one of mine (a like received). */ mine?: boolean }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const thumb = size === 'sm' ? { width: 44, height: 55 } : { width: 64, height: 80 };
  const question = item?.kind === 'prompt' ? t(`prompts.${item.questionId}`, { defaultValue: item.questionId }) : '';
  return (
    <View style={{ gap: space.sm }} accessible accessibilityLabel={[label, question, item?.kind === 'prompt' ? item.answer : '', comment ?? ''].filter(Boolean).join('. ')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Icon name="heart" size={14} color={c.accent} filled />
        <Text variant="overline" tone="highlight" numberOfLines={1} style={{ flexShrink: 1 }}>{label}</Text>
      </View>
      {item ? (
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, padding: space.sm }}>
          {item.kind === 'photo' ? (
            <Image source={photoSource(item.url)} style={{ ...thumb, borderRadius: radius.sm }} contentFit="cover" contentPosition="top" accessibilityIgnoresInvertColors />
          ) : (
            <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.accent, marginStart: space.xs }} />
          )}
          <View style={{ flex: 1, gap: 2, paddingEnd: space.xs }}>
            {item.kind === 'prompt' ? (
              <>
                <Text variant="caption" tone="textSubtle" numberOfLines={1}>{question}</Text>
                <Text variant="quote" numberOfLines={size === 'sm' ? 2 : 3} style={{ fontSize: size === 'sm' ? 16 : 18, lineHeight: size === 'sm' ? 21 : 24 }}>{item.answer}</Text>
              </>
            ) : (
              <Text variant="caption" tone="textMuted" numberOfLines={2}>{item.caption || (mine ? t('liked.yourPhoto') : t('liked.theirPhoto'))}</Text>
            )}
          </View>
        </View>
      ) : null}
      {comment ? <Text variant="body" style={{ fontStyle: 'italic' }} numberOfLines={size === 'sm' ? 2 : undefined}>« {comment} »</Text> : null}
    </View>
  );
}
