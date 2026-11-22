import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Visibility } from '@kapara/shared';
import { space } from '@kapara/design';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

/**
 * Explicit consent (GDPR art. 9) before a sensitive answer is shown to
 * anyone or used for suggestions. Says exactly what changes, and how to undo it.
 */
export function ConsentSheet({ visible, subject, visibility, useForMatching, onAccept, onDecline }: {
  visible: boolean; subject: string; visibility: Visibility; useForMatching: boolean; onAccept: () => void; onDecline: () => void;
}) {
  const { t } = useTranslation();
  const bullets = [
    t('consent.stored'),
    visibility !== 'private' ? t('consent.seenBy', { who: t(`vis.${visibility}Long`) }) : t('consent.seenByNobody'),
    useForMatching ? t('consent.usedForMatching') : t('consent.notUsedForMatching'),
    t('consent.neverInferred'),
    t('consent.withdraw'),
  ];
  return (
    <Sheet visible={visible} onClose={onDecline}>
      <Text variant="overline" tone="highlight">{t('consent.overline')}</Text>
      <Text variant="heading" accessibilityRole="header">{t('consent.title', { subject })}</Text>
      <View style={{ gap: space.sm }}>
        {bullets.map((b) => <Text key={b} tone="textMuted">·  {b}</Text>)}
      </View>
      <View style={{ gap: space.sm }}>
        <Button label={t('consent.accept')} onPress={onAccept} />
        <Button kind="ghost" label={t('consent.decline')} onPress={onDecline} />
      </View>
    </Sheet>
  );
}
