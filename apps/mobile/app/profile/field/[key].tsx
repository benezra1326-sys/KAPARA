import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useSaveMe } from '../../../src/me/api';
import { fieldMeta } from '../../../src/me/fields';
import { emptyField, meStore, storesData, useMe, type SensitiveField } from '../../../src/me/store';
import { useTheme } from '../../../src/theme';
import { Button, ConsentSheet, EmptyState, Screen, Section, SensitiveQuestion, SwitchRow, Text, VisibilityPicker } from '../../../src/ui';

/** Edit one Jewish-life answer: value, nuance, who sees it, whether it shapes suggestions. */
export default function EditField() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const meta = fieldMeta(key ?? '');
  const me = useMe();
  const save = useSaveMe();
  const stored = meta ? me.jewishLife[meta.key] : undefined;
  const [draft, setDraft] = useState<SensitiveField>(stored ?? emptyField());
  const [asking, setAsking] = useState(false);

  if (!meta) return <Screen back="back"><EmptyState title={t('profile.notFound')} /></Screen>;
  const answered = storesData(draft);
  const hadConsent = !!me.consents[meta.key];

  const commit = (field: SensitiveField, consent: boolean) => {
    meStore.setField(meta.key, field, consent);
    save.mutate({ grant: consent ? [meta.key] : [], answers: { [meta.key]: meStore.get().jewishLife[meta.key] ?? null } }, { onSuccess: () => router.back() });
  };
  const onSave = () => {
    const field = answered ? draft : { ...draft, visibility: 'private' as const, useForMatching: false };
    if (answered && !hadConsent) setAsking(true);
    else commit(field, false);
  };

  return (
    <Screen back="back" footer={
      <>
        {save.isError ? <Text variant="caption" style={{ color: c.danger }}>{t('edit.saveError')}</Text> : null}
        <Button label={t('edit.save')} onPress={onSave} loading={save.isPending} />
      </>
    }>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: space.xl }}>
        <SensitiveQuestion meta={meta} value={draft} onChange={setDraft} />
      </View>

      <Section title={t('vis.sectionTitle')} footnote={answered ? t('vis.footnote') : t('vis.answerFirst')}>
        <View style={{ padding: space.lg, gap: space.md, opacity: answered ? 1 : 0.5 }} pointerEvents={answered ? 'auto' : 'none'}>
          <Text variant="label" tone="textMuted">{t('vis.label')}</Text>
          <VisibilityPicker value={draft.visibility} onChange={(visibility) => setDraft({ ...draft, visibility })} />
          <Text variant="caption" tone="textSubtle">{t(`vis.${draft.visibility}Hint`)}</Text>
        </View>
        <View style={{ opacity: answered ? 1 : 0.5 }} pointerEvents={answered ? 'auto' : 'none'}>
          <SwitchRow title={t('jewishLife.useForMatching')} description={t('vis.matchingHint')} value={draft.useForMatching}
            onValueChange={(useForMatching) => setDraft({ ...draft, useForMatching })} />
        </View>
      </Section>

      {stored ? (
        <View style={{ paddingHorizontal: space.xl }}>
          <Button kind="ghost" label={t('edit.withdraw')} accessibilityHint={t('edit.withdrawHint')}
            onPress={() => {
              meStore.withdrawField(meta.key);
              save.mutate(hadConsent ? { revoke: [meta.key] } : { answers: { [meta.key]: null } }, { onSuccess: () => router.back() });
            }} />
        </View>
      ) : null}

      <ConsentSheet visible={asking} subject={t(`jl.short.${meta.key}`)} visibility={draft.visibility} useForMatching={draft.useForMatching}
        onAccept={() => { setAsking(false); commit(draft, true); }}
        onDecline={() => setAsking(false)} />
    </Screen>
  );
}
