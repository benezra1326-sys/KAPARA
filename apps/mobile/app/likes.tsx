import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { openPaywall, useLikesInbox } from '../src/premium/store';
import { Avatar, Loading, useFormat } from '../src/social/ui';
import { useTheme } from '../src/theme';
import { Button, DemoBadge, EmptyState, Icon, Screen, Text } from '../src/ui';

/**
 * Who noticed you. Everyone sees how many; Plus and Cercle see who (the
 * database only sends the people to those plans). Answering is the usual
 * reaction on their profile: a mutual like opens the conversation.
 */
export default function Likes() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const f = useFormat();
  const q = useLikesInbox();
  const d = q.data;

  return (
    <Screen back="back" title={t('premium.likesTitle')}>
      {q.isLoading || !d ? <Loading /> : d.count === 0 ? (
        <EmptyState title={t('premium.likesEmpty')} body={t('premium.likesEmptyBody')} />
      ) : d.locked ? (
        <View style={{ marginHorizontal: space.lg, padding: space.xl, borderRadius: radius.xl, backgroundColor: c.surface, gap: space.lg, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row' }} accessible={false}>
            {Array.from({ length: Math.min(d.count, 3) }).map((_, i) => (
              <View key={i} style={{ width: 64, height: 64, borderRadius: 32, marginLeft: i ? -16 : 0, backgroundColor: c.surfaceAlt, borderWidth: 3, borderColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="lock" size={20} color={c.textSubtle} />
              </View>
            ))}
          </View>
          <Text variant="heading" style={{ textAlign: 'center' }}>{t('premium.likesCount', { count: d.count })}</Text>
          <Text tone="textMuted" style={{ textAlign: 'center' }}>{t('premium.likesLocked')}</Text>
          <Button label={t('premium.seeWho')} onPress={() => openPaywall('seeLikes')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <View style={{ marginHorizontal: space.lg, backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
          {d.items.map((it, i) => (
            <Pressable key={it.from.id} onPress={() => router.push({ pathname: '/profile/[id]', params: { id: it.from.id } })} accessibilityRole="button"
              accessibilityLabel={`${it.from.firstName}${it.comment ? `. ${it.comment}` : ''}`}
              style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.lg, alignItems: 'center', backgroundColor: pressed ? c.surfaceAlt : 'transparent', borderTopWidth: i ? 1 : 0, borderTopColor: c.border })}>
              <Avatar uri={it.from.photos[0]?.url ?? null} name={it.from.firstName} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{it.from.firstName}, {it.from.age}</Text>
                  {it.from.isDemo ? <DemoBadge compact /> : null}
                  <Text variant="caption" tone="textSubtle">{f.when(it.createdAt)}</Text>
                </View>
                <Text tone="textMuted" numberOfLines={2}>{it.comment || t('premium.likedYou')}</Text>
              </View>
              <Icon name="chevron" size={18} color={c.textSubtle} />
            </Pressable>
          ))}
        </View>
      )}
      {d?.demo ? <Text variant="caption" tone="textSubtle" style={{ textAlign: 'center', marginTop: space.xl, paddingHorizontal: space.xxl }}>{t('premium.likesDemo')}</Text> : null}
    </Screen>
  );
}
