import { router } from 'expo-router';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import type { IntroductionReceived } from '@kapara/shared';
import { useIntroInbox, useIntroSent, useRespondIntro } from '../../src/social/api';
import { Avatar, Card, DemoNotice, Loading, Pill, Row, RowGroup, Section, StackHeader, useFormat } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, DemoBadge, Text } from '../../src/ui';

/**
 * Introductions, double opt-in. Received proposals show the introducer's
 * note and the other person; your answer stays private until both say yes.
 * Sent proposals show only an outcome, never who declined.
 */
export default function Introductions() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const inbox = useIntroInbox();
  const sent = useIntroSent();
  const f = useFormat();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={t('intro.title')} subtitle={t('intro.subtitle')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}
        refreshControl={<RefreshControl refreshing={inbox.isRefetching || sent.isRefetching} onRefresh={() => { void inbox.refetch(); void sent.refetch(); }} tintColor={c.accent} />}>
        <DemoNotice />
        <Section title={t('intro.received')}>
          {inbox.isLoading ? <Loading /> : (inbox.data ?? []).length === 0 ? (
            <Card><Text tone="textMuted">{t('intro.none')}</Text></Card>
          ) : (inbox.data ?? []).map((i) => <ReceivedCard key={i.id} intro={i} />)}
        </Section>

        <Section title={t('intro.sent')} hint={t('intro.outcomeHint')}>
          {sent.isLoading ? <Loading /> : (sent.data ?? []).length === 0 ? (
            <Card><Text tone="textMuted">{t('intro.noneSent')}</Text></Card>
          ) : (
            <RowGroup>
              {(sent.data ?? []).map((s, idx) => (
                <Row key={s.id} first={idx === 0} label={`${s.personA.firstName} & ${s.personB.firstName}`} detail={f.day(s.createdAt)}
                  right={<Pill label={t(`intro.outcome.${s.outcome}`)} tone={s.outcome === 'connected' ? 'accent' : 'muted'} />} />
              ))}
            </RowGroup>
          )}
          <Button kind="secondary" label={t('intro.new')} onPress={() => router.push('/introductions/new')} />
        </Section>
      </ScrollView>
    </View>
  );
}

function ReceivedCard({ intro }: { intro: IntroductionReceived }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const respond = useRespondIntro();
  const name = intro.other.firstName;

  const answer = (accept: boolean) => respond.mutate({ id: intro.id, accept }, {
    onSuccess: (r) => {
      if (r.status === 'connected' && r.conversationId) {
        Alert.alert(t('intro.connected'), t('intro.connectedBody', { name }), [
          { text: t('common.close'), style: 'cancel' },
          { text: t('intro.openConversation'), onPress: () => router.push({ pathname: '/conversation/[id]', params: { id: r.conversationId! } }) },
        ]);
      }
    },
    onError: () => Alert.alert(t('common.error')),
  });

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: space.xl, gap: space.lg }}>
      <Text variant="overline" tone="textSubtle">{t('intro.byLine', { name: intro.introducer.firstName })}</Text>
      <Text variant="quote">« {intro.note} »</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar uri={intro.other.photoUrl} name={name} size={64} />
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="heading">{name}, {intro.other.age}</Text>
          {intro.other.isDemo ? <DemoBadge /> : null}
        </View>
        <Button kind="ghost" label="›" accessibilityLabel={t('crossed.viewProfile', { name })}
          onPress={() => router.push({ pathname: '/profile/[id]', params: { id: intro.other.id } })} />
      </View>
      {intro.myAnswer === 'accepted' ? (
        <Text tone="textMuted">{t('intro.waitingOther', { name })}</Text>
      ) : (
        <>
          <Text variant="caption" tone="textMuted">{t('intro.privacy', { name })}</Text>
          <View style={{ gap: space.sm }}>
            <Button label={t('intro.accept')} loading={respond.isPending && respond.variables?.accept === true} onPress={() => answer(true)} />
            <Button kind="ghost" label={t('intro.decline')} disabled={respond.isPending} onPress={() => answer(false)} />
          </View>
        </>
      )}
    </View>
  );
}
