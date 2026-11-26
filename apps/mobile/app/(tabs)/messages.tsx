import { router } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import type { ConversationSummary } from '@kapara/shared';
import { useLikesInbox } from '../../src/premium/store';
import { useConversations, useIntroInbox } from '../../src/social/api';
import { Avatar, DemoNotice, Loading, Pill, useFormat } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { EmptyState, Icon, Screen, Text } from '../../src/ui';

/** Conversations. No read receipts, no unread pressure: just who and what was said last. */
export default function Messages() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const q = useConversations();
  const inbox = useIntroInbox();
  const pending = (inbox.data ?? []).filter((i) => i.myAnswer === 'pending').length;
  const likes = useLikesInbox();
  const noticed = likes.data?.count ?? 0;

  return (
    <Screen title={t('messages.title')} subtitle={t('messages.subtitle')}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => { void q.refetch(); void inbox.refetch(); }} tintColor={c.accent} />}>
      <DemoNotice real />
      {noticed > 0 ? (
        <Pressable onPress={() => router.push('/likes')} accessibilityRole="button"
          style={({ pressed }) => ({ marginHorizontal: space.lg, marginBottom: space.lg, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.85 : 1, flexDirection: 'row', alignItems: 'center', gap: space.md })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={20} color={c.accent} filled />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('premium.likesCount', { count: noticed })}</Text>
            <Text variant="caption" tone="textMuted">{likes.data?.locked ? t('premium.likesLockedShort') : t('premium.likesOpen')}</Text>
          </View>
          <Icon name={likes.data?.locked ? 'lock' : 'chevron'} size={20} color={c.textMuted} />
        </Pressable>
      ) : null}
      {pending > 0 ? (
        <Pressable onPress={() => router.push('/introductions')} accessibilityRole="button"
          style={({ pressed }) => ({ marginHorizontal: space.lg, marginBottom: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.accentSoft, opacity: pressed ? 0.85 : 1, flexDirection: 'row', alignItems: 'center', gap: space.md })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={20} color={c.accent} filled />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t('intro.received')}</Text>
            <Text variant="caption" tone="textMuted">{t('intro.subtitle')}</Text>
          </View>
          <Icon name="chevron" size={20} color={c.textMuted} />
        </Pressable>
      ) : null}

      {q.isLoading ? <Loading /> : q.isError ? (
        <EmptyState title={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title={t('messages.empty')} />
      ) : (
        <View style={{ marginHorizontal: space.lg, backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
          {(q.data ?? []).map((conv, i) => <ConversationRow key={conv.id} conv={conv} first={i === 0} />)}
        </View>
      )}
      <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center', marginTop: space.xl, paddingHorizontal: space.xxl }}>{t('messages.noReceipts')}</Text>
    </Screen>
  );
}

function ConversationRow({ conv, first }: { conv: ConversationSummary; first: boolean }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const f = useFormat();
  const last = conv.lastMessage;
  const preview = last ? `${last.mine ? `${t('common.you')} : ` : ''}${last.body}` : t('messages.startHint');
  const origin = conv.origin === 'other' ? '' : t(`messages.origin.${conv.origin}`);
  return (
    <Pressable onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: conv.id } })} accessibilityRole="button"
      accessibilityLabel={`${conv.other.firstName}. ${preview}`}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({ flexDirection: 'row', gap: space.md, padding: space.lg, alignItems: 'center', backgroundColor: pressed || hovered ? c.surfaceAlt : 'transparent', borderTopWidth: first ? 0 : 1, borderTopColor: c.border })}>
      <Avatar uri={conv.other.photoUrl} name={conv.other.firstName} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{conv.other.firstName}</Text>
          <Text variant="caption" tone="textSubtle">{f.when(last?.createdAt ?? conv.createdAt)}</Text>
        </View>
        <Text tone={last ? 'textMuted' : 'textSubtle'} numberOfLines={1} style={last ? undefined : { fontStyle: 'italic' }}>{preview}</Text>
        {origin && !last ? <Pill label={origin} /> : null}
      </View>
    </Pressable>
  );
}
