import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts, radius, space } from '@kapara/design';
import { ReportReason, type ReportCreate } from '@kapara/shared';
import { useReport } from '../../src/social/api';
import { notify } from '../../src/account/confirm';
import { DEMO_MODE } from '../../src/api/client';
import { CLOUD } from '../../src/cloud/client';
import { Card, DemoNotice, RowGroup, Section, StackHeader, ToggleRow } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, fontFor, Text } from '../../src/ui';

/** Report a member. Confidential; blocks by default. Reachable from conversations, profiles, Live and Croisés. */
export default function Report() {
  const { userId, name = '', context = 'profile' } = useLocalSearchParams<{ userId: string; name?: string; context?: ReportCreate['context'] }>();
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const report = useReport();
  const [reason, setReason] = useState<ReportCreate['reason'] | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  const submit = () => {
    if (!reason || !userId) return;
    report.mutate({ userId, reason, details: details.trim() || undefined, context, alsoBlock }, {
      // "Sent" only once the server has saved it. The demo says it is a demo.
      onSuccess: () => {
        notify(t(DEMO_MODE && !CLOUD ? 'beta.report.demoSent' : 'safety.sent'), t(DEMO_MODE && !CLOUD ? 'beta.report.demoSentBody' : 'beta.report.sentBody'));
        if (router.canGoBack()) router.back(); else router.replace('/');
      },
      onError: (e) => notify(t('common.error'), t((e as { code?: string })?.code === 'too_many_reports' ? 'beta.report.tooMany' : 'beta.report.failed')),
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StackHeader title={t('safety.reportTitle', { name })} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }} keyboardShouldPersistTaps="handled">
        <DemoNotice real />
        <View style={{ marginHorizontal: space.lg, marginBottom: space.xl, gap: space.md }}>
          <Card>
            <Text tone="textMuted">{t('safety.reportIntro', { name })}</Text>
            <Text variant="caption" tone="danger">{t('safety.urgent')}</Text>
          </Card>
        </View>
        <Section title={t('safety.reasonTitle')}>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }} accessibilityRole="radiogroup">
            {ReportReason.options.map((r, i) => {
              const selected = reason === r;
              return (
                <Pressable key={r} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ selected }}
                  style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md,
                    backgroundColor: pressed ? c.surfaceAlt : 'transparent', borderTopWidth: i ? 1 : 0, borderTopColor: c.border })}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? c.accent : c.border, alignItems: 'center', justifyContent: 'center' }}>
                    {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} /> : null}
                  </View>
                  <Text style={{ flex: 1 }}>{t(`safety.reason.${r}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
        <Section title={t('safety.details')}>
          <TextInput value={details} onChangeText={setDetails} multiline maxLength={1000} accessibilityLabel={t('safety.details')}
            placeholderTextColor={c.textSubtle}
            style={{ minHeight: 110, borderRadius: radius.lg, backgroundColor: c.surface, padding: space.lg, color: c.text, fontFamily: fontFor(fonts.body), fontSize: 16, textAlignVertical: 'top' }} />
          <RowGroup><ToggleRow first label={t('safety.alsoBlock')} value={alsoBlock} onChange={setAlsoBlock} /></RowGroup>
          <Button label={t('safety.send')} disabled={!reason} loading={report.isPending} onPress={submit} />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
