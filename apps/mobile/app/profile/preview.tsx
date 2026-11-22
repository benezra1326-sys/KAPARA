import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ViewerRelation } from '@kapara/shared';
import { hitSlop, radius, space } from '@kapara/design';
import { myPublicProfile } from '../../src/me/identity';
import { useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, Screen, Text } from '../../src/ui';
import { router } from 'expo-router';
import { ProfileCard } from '../../src/ui/ProfileCard';

/** "See my profile as…": the same visibility rule the API applies, shown before anyone else sees it. */
export default function Preview() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const me = useMe();
  const [as, setAs] = useState<Exclude<ViewerRelation, 'self'>>('member');
  const profile = myPublicProfile(me, as);
  return (
    <Screen back="close" title={t('preview.title')} width="wide">
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', marginHorizontal: space.xl, marginBottom: space.md, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space.xs, gap: space.xs }}>
        {(['member', 'match'] as const).map((r) => (
          <Pressable key={r} onPress={() => setAs(r)} accessibilityRole="radio" accessibilityState={{ checked: as === r }}
            style={{ flex: 1, minHeight: hitSlop, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: as === r ? c.surface : 'transparent' }}>
            <Text variant="label" tone={as === r ? 'text' : 'textMuted'}>{t(`preview.as.${r}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text variant="caption" tone="textSubtle" style={{ marginHorizontal: space.xl, marginBottom: space.lg }}>{t(`preview.hint.${as}`)}</Text>
      <ProfileCard profile={profile} />
      {me.prompts.length === 0 ? (
        <View style={{ margin: space.lg, padding: space.xl, borderRadius: radius.lg, backgroundColor: c.surface, gap: space.md, maxWidth: 560 }}>
          <Text variant="bodyStrong">{t('ux.previewNoPromptsTitle')}</Text>
          <Text tone="textMuted">{t('ux.previewNoPromptsBody')}</Text>
          <Button kind="secondary" label={t('edit.addPrompt')} onPress={() => router.push('/profile/prompt')} />
        </View>
      ) : null}
    </Screen>
  );
}
