import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts, hitSlop, radius, space } from '@kapara/design';
import type { ChatMessage } from '@kapara/shared';
import { useBlock, useCloseConversation, useConversations, useLiveMessages, useMessages, useSend } from '../../src/social/api';
import { Avatar, DemoNotice, Loading, StackHeader, useFormat } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { DemoBadge, EmptyState, Text } from '../../src/ui';

/**
 * One conversation. No read receipts, no typing indicator, no "seen".
 * A gentle "read it again?" appears before a message that may hurt; the
 * member always decides. Block and report are one tap away.
 */
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const convs = useConversations();
  const conv = convs.data?.find((x) => x.id === id);
  const q = useMessages(id);
  useLiveMessages(id);
  const send = useSend(id);
  const block = useBlock();
  const close = useCloseConversation();
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState<string | null>(null);
  const list = useRef<FlatList<ChatMessage>>(null);
  const name = conv?.other.firstName ?? '';

  const data = useMemo(() => [...(q.data ?? [])].reverse(), [q.data]); // inverted list: newest first

  const submit = (body: string, confirmed = false) => {
    const text = body.trim();
    if (!text) return;
    setFailed(null);
    send.mutate({ body: text, confirmed }, {
      onSuccess: () => { setDraft(''); list.current?.scrollToOffset({ offset: 0, animated: true }); },
      onError: (e) => {
        if (e.message === 'kindness_check') {
          Alert.alert(t('messages.kindTitle'), t('messages.kindBody'), [
            { text: t('messages.kindEdit'), style: 'cancel' },
            { text: t('messages.kindSendAnyway'), style: 'destructive', onPress: () => submit(text, true) },
          ]);
        } else if (e.message === 'conversation_closed') {
          void convs.refetch();
        } else {
          setFailed(text);
        }
      },
    });
  };

  const menu = () => {
    if (!conv) return;
    const actions = [
      { label: t('messages.report', { name }), run: () => router.push({ pathname: '/safety/report', params: { userId: conv.other.id, name, context: 'conversation' } }) },
      { label: t('messages.block', { name }), run: () => confirmBlock() },
      { label: t('messages.close'), run: () => Alert.alert(t('messages.close'), t('messages.closeConfirm', { name }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => close.mutate(id, { onSuccess: () => router.back() }) },
      ]) },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...actions.map((a) => a.label), t('common.cancel')], cancelButtonIndex: actions.length, destructiveButtonIndex: [0, 1], title: t('messages.menu') },
        (i) => actions[i]?.run(),
      );
    } else {
      Alert.alert(t('messages.menu'), undefined, [...actions.map((a) => ({ text: a.label, onPress: a.run })), { text: t('common.cancel'), style: 'cancel' as const }]);
    }
  };

  const confirmBlock = () => {
    if (!conv) return;
    Alert.alert(t('safety.blockConfirmTitle', { name }), t('safety.blockConfirmBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('safety.block'), style: 'destructive', onPress: () => block.mutate(conv.other.id, { onSuccess: () => router.back() }) },
    ]);
  };

  if (convs.isLoading) return <View style={{ flex: 1, backgroundColor: c.bg }}><StackHeader title="" /><Loading /></View>;
  if (!conv) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StackHeader title={t('messages.title')} />
        <EmptyState title={t('messages.closed')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StackHeader
        title={name}
        subtitle={t(`messages.origin.${conv.origin}`) || undefined}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Pressable onPress={() => router.push({ pathname: '/profile/[id]', params: { id: conv.other.id } })} accessibilityRole="button" accessibilityLabel={t('crossed.viewProfile', { name })}>
              <Avatar uri={conv.other.photoUrl} name={name} size={40} />
            </Pressable>
            <Pressable onPress={menu} accessibilityRole="button" accessibilityLabel={t('messages.menu')}
              style={{ width: hitSlop, height: hitSlop, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="heading" accessibilityElementsHidden>⋯</Text>
            </Pressable>
          </View>
        }
      />
      {conv.other.isDemo ? <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}><DemoBadge /></View> : null}
      <DemoNotice />

      {q.isLoading ? <Loading /> : (
        <FlatList
          ref={list}
          inverted
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm }}
          renderItem={({ item, index }) => <Bubble m={item} showTime={shouldShowTime(data, index)} />}
          ListFooterComponent={<Text variant="caption" tone="textSubtle" style={{ textAlign: 'center', marginVertical: space.lg }}>{t('messages.noReceipts')}</Text>}
          ListEmptyComponent={<Text tone="textMuted" style={{ textAlign: 'center', marginTop: space.xl, transform: [{ scaleY: -1 }] }}>{t('messages.startHint')}</Text>}
          keyboardDismissMode="interactive"
        />
      )}

      {failed ? (
        <Pressable onPress={() => submit(failed)} accessibilityRole="button" style={{ paddingHorizontal: space.xl, paddingBottom: space.xs }}>
          <Text variant="caption" style={{ color: c.danger }}>{t('messages.failed')}</Text>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        <TextInput
          value={draft} onChangeText={setDraft} multiline maxLength={2000}
          placeholder={t('messages.placeholder')} placeholderTextColor={c.textSubtle} accessibilityLabel={t('messages.placeholder')}
          style={{ flex: 1, minHeight: hitSlop, maxHeight: 140, borderRadius: radius.lg, backgroundColor: c.surfaceAlt, paddingHorizontal: space.lg, paddingTop: 13, paddingBottom: 13, color: c.text, fontFamily: fonts.body, fontSize: 16, textAlign: 'auto' }}
        />
        <Pressable onPress={() => submit(draft)} disabled={!draft.trim() || send.isPending} accessibilityRole="button" accessibilityLabel={t('messages.send')}
          accessibilityState={{ disabled: !draft.trim(), busy: send.isPending }}
          style={({ pressed }) => ({ width: hitSlop, height: hitSlop, borderRadius: hitSlop / 2, alignItems: 'center', justifyContent: 'center',
            backgroundColor: pressed ? c.accentPressed : c.accent, opacity: !draft.trim() ? 0.4 : 1 })}>
          <Text variant="bodyStrong" tone="onAccent" accessibilityElementsHidden>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ m, showTime }: { m: ChatMessage; showTime: boolean }) {
  const { c } = useTheme();
  const f = useFormat();
  return (
    <View style={{ alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 2 }}>
      <View style={{
        maxWidth: '82%', paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg,
        backgroundColor: m.mine ? c.accent : c.surface,
        borderBottomRightRadius: m.mine ? radius.sm : radius.lg, borderBottomLeftRadius: m.mine ? radius.lg : radius.sm,
      }}>
        <Text tone={m.mine ? 'onAccent' : 'text'} selectable>{m.body}</Text>
      </View>
      {showTime ? <Text variant="caption" tone="textSubtle">{f.when(m.createdAt)}</Text> : null}
    </View>
  );
}

/** Show a time under the last message of a burst (list is newest first). */
function shouldShowTime(data: ChatMessage[], i: number) {
  const m = data[i]!;
  const newer = data[i - 1];
  return !newer || newer.mine !== m.mine || +new Date(newer.createdAt) - +new Date(m.createdAt) > 10 * 60_000;
}
