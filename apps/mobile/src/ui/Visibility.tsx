import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Visibility } from '@kapara/shared';
import { hitSlop, radius, space } from '@kapara/design';
import { useTheme } from '../theme';
import { Text } from './Text';

const ORDER: Visibility[] = ['private', 'matches', 'members'];
export const VIS_GLYPH: Record<Visibility, string> = { private: '◐', matches: '◑', members: '●' };

/** Who can see one answer. Private is always the default. */
export function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('vis.label')} style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.xs, gap: space.xs }}>
      {ORDER.map((v) => {
        const on = v === value;
        return (
          <Pressable key={v} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t(`vis.${v}`)} accessibilityHint={t(`vis.${v}Hint`)}
            onPress={() => { void Haptics.selectionAsync(); onChange(v); }}
            style={{ flex: 1, minHeight: hitSlop, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs,
              backgroundColor: on ? c.surface : 'transparent' }}>
            <Text variant="label" tone={on ? 'text' : 'textMuted'} style={{ textAlign: 'center' }}>{t(`vis.${v}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small inline marker: "Visible : moi seul·e". */
export function VisibilityTag({ value, used }: { value: Visibility; used?: boolean }) {
  const { t } = useTranslation();
  return (
    <Text variant="caption" tone={value === 'private' ? 'textSubtle' : 'highlight'}>
      {VIS_GLYPH[value]} {t(`vis.${value}`)}{used ? ` · ${t('vis.usedShort')}` : ''}
    </Text>
  );
}
