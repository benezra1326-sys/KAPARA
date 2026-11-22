import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useSaveMe } from '../../src/me/api';
import { meStore, useMe } from '../../src/me/store';
import { useTheme } from '../../src/theme';
import { Button, Screen, Text, useBasicsForm } from '../../src/ui';

export default function EditBasics() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const me = useMe();
  const form = useBasicsForm(me);
  const save = useSaveMe();
  const onSave = () => {
    form.touch();
    if (!form.value) return;
    meStore.set(form.value);
    save.mutate({ basics: true }, { onSuccess: () => router.back() });
  };
  return (
    <Screen back="back" title={t('edit.basicsTitle')} footer={
      <>
        {save.isError ? <Text variant="caption" style={{ color: c.danger }}>{t('edit.saveError')}</Text> : null}
        <Button label={t('edit.save')} onPress={onSave} loading={save.isPending} />
      </>
    }>
      <View style={{ paddingHorizontal: space.xl }}>{form.render()}</View>
    </Screen>
  );
}
