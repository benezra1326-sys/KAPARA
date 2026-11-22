import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useSaveMe } from '../../src/me/api';
import { ALL_FIELDS } from '../../src/me/fields';
import { meStore, useMe } from '../../src/me/store';
import { Button, Row, Screen, Section, Text, VisibilityTag } from '../../src/ui';

/** Per-field visibility, consent dates, and one-tap withdrawal. */
export default function Privacy() {
  const { t, i18n } = useTranslation();
  const me = useMe();
  const save = useSaveMe();
  const answered = ALL_FIELDS.filter((f) => me.jewishLife[f.key]);
  const fmt = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(d); };

  const confirm = (title: string, body: string, action: () => void) => Alert.alert(title, body, [
    { text: t('ui.cancel'), style: 'cancel' },
    { text: t('ui.confirm'), style: 'destructive', onPress: () => { action(); save.mutate({ jewishLife: true }); } },
  ]);

  return (
    <Screen back="back" title={t('me.privacy')}>
      <View style={{ paddingHorizontal: space.xl, gap: space.md, marginBottom: space.xl }}>
        <Text tone="textMuted">{t('jewishLife.sectionIntro')}</Text>
        <Text tone="textMuted">{t('privacy.rules')}</Text>
      </View>

      <Section title={t('privacy.answers')} footnote={answered.length ? t('privacy.tapToChange') : undefined}>
        {answered.length ? answered.map((f, i) => {
          const a = me.jewishLife[f.key]!;
          const date = me.consents[f.key];
          return (
            <Row key={f.key} first={i === 0} title={t(`jl.short.${f.key}`)}
              value={date ? (date === 'server' ? t('privacy.consented') : t('privacy.consentedOn', { date: fmt(date) })) : t('privacy.noConsent')}
              detail={a.preferNotToSay ? <Text variant="caption" tone="textSubtle">{t('common.preferNotToSay')}</Text> : <VisibilityTag value={a.visibility} used={a.useForMatching} />}
              onPress={() => router.push({ pathname: '/profile/field/[key]', params: { key: f.key } })} />
          );
        }) : <Row first title={t('privacy.none')} onPress={() => router.push('/profile/edit')} />}
      </Section>

      {answered.length ? (
        <View style={{ paddingHorizontal: space.xl, gap: space.sm }}>
          <Button kind="secondary" label={t('privacy.allPrivate')}
            onPress={() => confirm(t('privacy.allPrivate'), t('privacy.allPrivateBody'), meStore.makeAllPrivate)} />
          <Button kind="ghost" label={t('privacy.deleteAll')}
            onPress={() => confirm(t('privacy.deleteAll'), t('privacy.deleteAllBody'), () => answered.forEach((f) => meStore.withdrawField(f.key)))} />
        </View>
      ) : null}
    </Screen>
  );
}
