import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProfilePublic } from '@kapara/shared';
import { radius, space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { useSendLike } from '../api/hooks';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Field } from './Field';
import type { ReactTarget } from './ProfileCard';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { photoSource } from '../demo/images';

/**
 * Reacting to one photo or one answer, with an optional word.
 * Shows what is being reacted to, and says plainly when it is simulated.
 */
export function ReactSheet({ profile, target, onClose, onDone }: { profile?: ProfilePublic; target: ReactTarget | null; onClose: () => void; onDone: (matched: boolean) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [comment, setComment] = useState('');
  const send = useSendLike();
  useEffect(() => { if (target) { setComment(''); send.reset(); } }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const prompt = target?.kind === 'prompt' ? profile?.prompts.find((q) => q.id === target.id) : undefined;
  const photo = target?.kind === 'photo' ? profile?.photos.find((p) => p.id === target.id) : undefined;

  const submit = () => {
    if (!profile || !target) return;
    send.mutate({ toProfileId: profile.id, target, comment: comment.trim() || undefined }, { onSuccess: (r) => onDone(r.matched) });
  };

  return (
    <Sheet visible={!!target} onClose={onClose}>
      <Text variant="heading" accessibilityRole="header">{t('pick.sheetTitle', { name: profile?.firstName ?? '' })}</Text>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.md, padding: space.md }}>
        {photo ? <Image source={photoSource(photo.url)} style={{ width: 56, height: 70, borderRadius: radius.sm }} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          {prompt ? <Text variant="caption" tone="textSubtle">{t(`prompts.${prompt.id}`, { defaultValue: prompt.id })}</Text> : null}
          <Text variant={prompt ? 'quote' : 'body'} numberOfLines={3} style={prompt ? { fontSize: 16, lineHeight: 22 } : undefined}>
            {prompt ? prompt.answer : t('pick.aboutPhoto')}
          </Text>
        </View>
      </View>
      <Field label={t('pick.commentLabel')} placeholder={t('forYou.commentPlaceholder')} value={comment} onChangeText={setComment}
        maxLength={200} multiline counter hint={t('pick.commentHint')} />
      {send.isError ? <Text variant="caption" style={{ color: c.danger }}>{t('pick.sendError')}</Text> : null}
      {DEMO_MODE ? <Text variant="caption" tone="textSubtle">{t('pick.demoSend')}</Text> : null}
      <Button label={t('pick.send')} onPress={submit} loading={send.isPending} />
    </Sheet>
  );
}
