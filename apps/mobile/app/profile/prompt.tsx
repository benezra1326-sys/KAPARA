import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PROMPT_KEYS } from '@kapara/shared';
import { MAX_PROMPTS } from '../../src/me/fields';
import { space } from '@kapara/design';
import { useSaveMe } from '../../src/me/api';
import { meStore, useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, ChoiceList, Field, Screen, Text } from '../../src/ui';

/** Choose a conversation-starter question and answer it. `?slot=n` edits an existing one. */
export default function EditPrompt() {
  const { slot } = useLocalSearchParams<{ slot?: string }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const prompts = useMe((s) => s.prompts);
  const save = useSaveMe();
  const idx = slot !== undefined ? Number(slot) : -1;
  const existing = prompts[idx];
  const [id, setId] = useState<string | null>(existing?.id ?? null);
  const [answer, setAnswer] = useState(existing?.answer ?? '');
  const taken = new Set(prompts.filter((_, i) => i !== idx).map((p) => p.id));
  const available = PROMPT_KEYS.filter((k) => !taken.has(k));
  const canSave = !!id && answer.trim().length > 0;

  const persist = (next: typeof prompts) => {
    meStore.set({ prompts: next });
    save.mutate({ basics: true }, { onSuccess: () => router.back() });
  };
  const onSave = () => {
    if (!id) return;
    const item = { id, answer: answer.trim() };
    persist(existing ? prompts.map((p, i) => (i === idx ? item : p)) : [...prompts, item].slice(0, MAX_PROMPTS));
  };

  return (
    <Screen back="back" title={t('edit.promptTitle')} subtitle={t('edit.promptOverline')} footer={
      <>
        {save.isError ? <Text variant="caption" style={{ color: c.danger }}>{t('edit.saveError')}</Text> : null}
        <Button label={t('edit.save')} onPress={onSave} disabled={!canSave} loading={save.isPending} />
      </>
    }>
      <View style={{ paddingHorizontal: space.xl, gap: space.xl }}>
        <ChoiceList label={t('edit.promptChoose')} value={id} onChange={setId}
          options={available.map((k) => ({ id: k, label: t(`prompts.${k}`) }))} />
        <Field label={id ? t(`prompts.${id}`) : t('edit.promptAnswer')} hint={t('edit.promptHint')} value={answer} onChangeText={setAnswer}
          multiline maxLength={300} counter placeholder={t('edit.promptPlaceholder')} />
        {existing ? <Button kind="ghost" label={t('edit.promptRemove')} onPress={() => persist(prompts.filter((_, i) => i !== idx))} /> : null}
      </View>
    </Screen>
  );
}
