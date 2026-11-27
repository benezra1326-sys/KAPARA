import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { FIELD_GROUPS, MAX_PROMPTS, answerLabel, type FieldMeta } from '../../src/me/fields';
import { nameAndAge } from '../../src/me/identity';
import { useMe, type SensitiveField } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { SaveStatus } from '../../src/cloud/SaveStatus';
import { Button, Icon, PhotoGrid, Row, Screen, Section, Text, VisibilityTag } from '../../src/ui';

const formatBirth = (d: string) => d.split('-').reverse().join('/');

/** "Mon profil": everything editable, each sensitive answer with its visibility in plain sight. */
export default function EditProfile() {
  const { t } = useTranslation();
  const me = useMe();
  const { c } = useTheme();

  return (
    <Screen back="back" title={t('edit.title')} subtitle={nameAndAge(me) || undefined}
      right={<Button kind="ghost" label={t('edit.preview')} onPress={() => router.push('/profile/preview')} />}>
      <SaveStatus />
      <Section title={t('edit.photos')}>
        <PhotoGrid />
      </Section>

      <Section title={t('edit.essentials')}>
        <Row first title={t('basics.firstName')} value={me.firstName || t('edit.empty')} onPress={() => router.push('/profile/basics')} />
        <Row title={t('basics.headline')} value={me.headline || t('edit.empty')} onPress={() => router.push('/profile/basics')} />
        <Row title={t('basics.languages')} value={me.languages.map((l) => t(`lang.${l}`)).join(', ') || t('edit.empty')} onPress={() => router.push('/profile/basics')} />
      </Section>
      <Section title={t('ux.accountTitle')} footnote={t('ux.accountFootnote')}>
        <Row first title={t('ux.birthDate')} value={me.birthDate ? `${formatBirth(me.birthDate)} · ${t('ux.onlyAgeShown')}` : t('edit.empty')} onPress={() => router.push('/profile/basics')}
          trailing={<Icon name="lock" size={18} color={c.textSubtle} />} />
        <Row title={t('basics.gender')} value={me.gender ? t(`basics.genders.${me.gender}`) : t('edit.empty')} onPress={() => router.push('/profile/basics')}
          trailing={<Icon name="lock" size={18} color={c.textSubtle} />} />
      </Section>

      <Section title={t('edit.prompts')} footnote={t('edit.promptsFootnote', { max: MAX_PROMPTS })}>
        {me.prompts.map((p, i) => (
          <Row key={p.id} first={i === 0} title={t(`prompts.${p.id}`)} value={p.answer} onPress={() => router.push({ pathname: '/profile/prompt', params: { slot: String(i) } })} />
        ))}
        {me.prompts.length < MAX_PROMPTS ? (
          <Row first={!me.prompts.length} title={t('edit.addPrompt')} onPress={() => router.push('/profile/prompt')} trailing={<Text tone="accent">＋</Text>} />
        ) : null}
      </Section>

      <View style={{ marginHorizontal: space.xl, marginBottom: space.lg, gap: space.xs }}>
        <Text variant="heading" accessibilityRole="header">{t('jewishLife.sectionTitle')}</Text>
        <Text tone="textMuted">{t('jewishLife.sectionIntro')}</Text>
      </View>
      {FIELD_GROUPS.map((g) => (
        <Section key={g.id} title={t(`jl.groups.${g.id}`)}>
          {g.fields.map((f, i) => <JLRow key={f.key} meta={f} field={me.jewishLife[f.key]} first={i === 0} />)}
        </Section>
      ))}

      <Section>
        <Row first title={t('me.privacy')} value={t('edit.privacyHint')} onPress={() => router.push('/settings/privacy')} />
      </Section>
    </Screen>
  );
}

function JLRow({ meta, field, first }: { meta: FieldMeta; field?: SensitiveField; first: boolean }) {
  const { t } = useTranslation();
  const answered = !!field && !field.preferNotToSay && field.value !== null;
  return (
    <Row first={first} title={t(`jl.short.${meta.key}`)} value={answerLabel(t, meta, field)}
      detail={answered ? <VisibilityTag value={field.visibility} used={field.useForMatching} /> : null}
      onPress={() => router.push({ pathname: '/profile/field/[key]', params: { key: meta.key } })} />
  );
}
