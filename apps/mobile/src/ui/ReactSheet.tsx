import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProfilePublic } from '@kapara/shared';
import { radius, space } from '@kapara/design';
import { DEMO_MODE } from '../api/client';
import { CLOUD } from '../cloud/client';
import { useSendLike } from '../api/hooks';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Field } from './Field';
import { Icon } from './Icon';
import type { ReactTarget } from './ProfileCard';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { photoSource } from '../demo/images';
import { isQuotaError, remaining } from '../premium/plans';
import { openPaywall, usePlan } from '../premium/store';

/** What the sheet opens on: one element, or the choice among all of them. */
export type ReactSheetTarget = ReactTarget | 'choose';

/**
 * Reacting to one photo or one answer, with an optional word — the way
 * first contact works on ZIV: always about something specific.
 *
 * Opened from a heart, it shows that element large. Opened from the general
 * "React" button, it first asks which photo or answer, then the same.
 * The liked element travels with the like: the other person sees it.
 */
export function ReactSheet({ profile, target, onClose, onDone }: { profile?: ProfilePublic; target: ReactSheetTarget | null; onClose: () => void; onDone: (matched: boolean) => void }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [comment, setComment] = useState('');
  const [picked, setPicked] = useState<ReactTarget | null>(null);
  const send = useSendLike();
  const plan = usePlan();
  const left = plan.data ? remaining(plan.data.limits, plan.data.used, 'like') : null;
  useEffect(() => {
    if (!target) return;
    setComment(''); send.reset();
    setPicked(target === 'choose' ? null : target);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const prompt = picked?.kind === 'prompt' ? profile?.prompts.find((q) => q.id === picked.id) : undefined;
  const photo = picked?.kind === 'photo' ? profile?.photos.find((p) => p.id === picked.id) : undefined;
  const name = profile?.firstName ?? '';

  const submit = () => {
    if (!profile || !picked) return;
    // Today's reactions are used: the database refused it. Offer more, calmly.
    if (left === 0) { onClose(); openPaywall('like'); return; }
    send.mutate({ toProfileId: profile.id, target: picked, comment: comment.trim() || undefined }, {
      onSuccess: (r) => onDone(r.matched),
      onError: (e) => { if (isQuotaError(e)) { onClose(); openPaywall('like'); } },
    });
  };

  const quota = left != null ? (
    <Text variant="caption" tone="textSubtle" accessibilityLiveRegion="polite">
      {left > 0 ? t('premium.likesLeft', { count: left }) : t('premium.likesNone')}
    </Text>
  ) : null;

  // Step 1 (from the general button): which photo, which answer?
  if (target && !picked) return (
    <Sheet visible onClose={onClose}>
      <View style={{ gap: space.xs }}>
        <Text variant="heading" accessibilityRole="header">{t('liked.chooseTitle', { name })}</Text>
        <Text variant="caption" tone="textMuted">{t('liked.chooseBody', { name })}</Text>
      </View>
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
        {profile?.photos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {profile.photos.map((ph, n) => (
              <Pressable key={ph.id} onPress={() => setPicked({ kind: 'photo', id: ph.id })} accessibilityRole="button"
                accessibilityLabel={`${t('pick.reactToPhoto')}, ${t('pick.photoOf', { name, n: n + 1 })}`}
                style={({ pressed }) => ({ borderRadius: radius.md, overflow: 'hidden', opacity: pressed ? 0.8 : 1 })}>
                <Image source={photoSource(ph.url)} style={{ width: 104, height: 130 }} contentFit="cover" contentPosition="top" accessibilityIgnoresInvertColors />
                <View style={{ position: 'absolute', end: 6, bottom: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="heart" size={16} color={c.accent} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {profile?.prompts.map((q) => {
          const title = t(`prompts.${q.id}`, { defaultValue: q.id });
          return (
            <Pressable key={q.id} onPress={() => setPicked({ kind: 'prompt', id: q.id })} accessibilityRole="button" accessibilityLabel={t('pick.reactTo', { what: title })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: c.border,
                backgroundColor: pressed ? c.surfaceAlt : c.surface })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="overline" tone="highlight" numberOfLines={1}>{title}</Text>
                <Text variant="quote" numberOfLines={2} style={{ fontSize: 17, lineHeight: 22 }}>{q.answer}</Text>
              </View>
              <Icon name="heart" size={20} color={c.accent} />
            </Pressable>
          );
        })}
      </ScrollView>
      {quota}
    </Sheet>
  );

  // Step 2: the element, large, and an optional word.
  return (
    <Sheet visible={!!target} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
          {photo ? t('liked.likePhotoOf', { name }) : t('liked.likeAnswerOf', { name })}
        </Text>
        {target === 'choose' ? (
          <Pressable onPress={() => setPicked(null)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text variant="label" tone="accent" style={{ textDecorationLine: 'underline' }}>{t('liked.change')}</Text>
          </Pressable>
        ) : null}
      </View>
      {photo ? (
        <View style={{ alignSelf: 'center', width: '62%', maxWidth: 260, aspectRatio: 4 / 5, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surfaceAlt }}>
          <Image source={photoSource(photo.url)} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" accessibilityLabel={photo.caption ?? t('pick.aboutPhoto')} />
          <View style={{ position: 'absolute', end: space.sm, bottom: space.sm, width: 40, height: 40, borderRadius: 20, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={20} color={c.accent} filled />
          </View>
        </View>
      ) : prompt ? (
        <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space.xl, gap: space.sm }}>
          <Text variant="overline" tone="highlight">{t(`prompts.${prompt.id}`, { defaultValue: prompt.id })}</Text>
          <Text variant="quote" numberOfLines={5} style={{ fontSize: 22, lineHeight: 29 }}>{prompt.answer}</Text>
        </View>
      ) : null}
      <Field label={t('pick.commentLabel')} placeholder={t('forYou.commentPlaceholder')} value={comment} onChangeText={setComment}
        maxLength={200} multiline counter hint={t('liked.commentHint', { name })} />
      {send.isError && !isQuotaError(send.error) ? <Text variant="caption" style={{ color: c.danger }}>{t('pick.sendError')}</Text> : null}
      {DEMO_MODE && !CLOUD ? <Text variant="caption" tone="textSubtle">{t('pick.demoSend')}</Text> : null}
      {quota}
      <Button kind="accent" icon={left === 0 ? undefined : 'heart'} label={left === 0 ? t('premium.seePlans') : comment.trim() ? t('liked.sendWithWord') : t('liked.sendLike')} onPress={submit} loading={send.isPending} />
    </Sheet>
  );
}
