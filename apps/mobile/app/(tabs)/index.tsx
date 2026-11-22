import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, space } from '@kapara/design';
import { useForYou } from '../../src/api/hooks';
import { useTheme } from '../../src/theme';
import { Button, EmptyState, Screen, Text } from '../../src/ui';
import { ProfileCard } from '../../src/ui/ProfileCard';

/** "Pour toi": one profile at a time from a finite daily selection. No swipe. */
export default function ForYou() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const q = useForYou();
  const [i, setI] = useState(0);
  const [target, setTarget] = useState<{ kind: 'photo' | 'prompt'; id: string } | null>(null);
  const [comment, setComment] = useState('');

  if (q.isLoading) return <Screen title={t('forYou.title')} subtitle={t('forYou.subtitle')}><ActivityIndicator color={c.accent} style={{ marginTop: space.xxxl }} accessibilityLabel={t('common.loading')} /></Screen>;
  if (q.isError) return <Screen title={t('forYou.title')}><EmptyState title={t('common.offline')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} /></Screen>;

  const picks = q.data ?? [];
  const rec = picks[i];
  const next = () => { setTarget(null); setComment(''); setI((x) => x + 1); };

  return (
    <Screen title={t('forYou.title')} subtitle={rec ? `${t('forYou.subtitle')} · ${i + 1}/${picks.length}` : t('forYou.subtitle')}>
      {rec ? (
        <>
          <ProfileCard key={rec.profile.id} rec={rec} onReact={setTarget} />
          <View style={{ paddingHorizontal: space.xl }}>
            <Button kind="secondary" label={t('forYou.notForMe')} onPress={next} />
          </View>
        </>
      ) : (
        <EmptyState title={t('forYou.doneTitle')} body={t('forYou.doneBody')} />
      )}

      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setTarget(null)} accessibilityLabel="Fermer" />
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, gap: space.lg }}>
            <Text variant="heading">{rec ? `${rec.profile.firstName}` : ''}</Text>
            <TextInput
              value={comment} onChangeText={setComment} maxLength={200} multiline
              placeholder={t('forYou.commentPlaceholder')} placeholderTextColor={c.textSubtle}
              style={{ minHeight: 88, borderRadius: radius.md, backgroundColor: c.surfaceAlt, padding: space.lg, color: c.text, fontFamily: 'Inter_400Regular', fontSize: 16 }}
            />
            {/* TODO(workstream mobile): POST /for-you/like when not in demo mode */}
            <Button label={t('forYou.react')} onPress={next} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
