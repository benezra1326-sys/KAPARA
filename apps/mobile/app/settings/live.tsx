import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RULES } from '@kapara/config';
import { LiveCallsFrom } from '@kapara/shared';
import { radius, space } from '@kapara/design';
import { Icon } from '../../src/live/icons';
import { useLive, useLiveStore } from '../../src/live/LiveProvider';
import { useTheme } from '../../src/theme';
import { EmptyState, Screen, Text } from '../../src/ui';

/** Live opt-in and "who can call me". The callee's choice always wins on the server. */
export default function LiveSettingsScreen() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const store = useLiveStore();
  const s = useLive();
  const settings = s.settings;

  return (
    <Screen title={t('liveSettings.title')}>
      <Stack.Screen options={{ title: '' }} />
      {!settings ? (
        s.settingsError
          ? <EmptyState title={t('live.offline')} action={{ label: t('common.retry'), onPress: () => void store.refresh() }} />
          : <ActivityIndicator color={c.accent} accessibilityLabel={t('common.loading')} />
      ) : (
        <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>{t('liveSettings.enableLabel')}</Text>
              <Switch value={settings.liveEnabled} onValueChange={(v) => void store.saveSettings({ ...settings, liveEnabled: v })}
                trackColor={{ true: c.live, false: c.textSubtle }} accessibilityLabel={t('liveSettings.enableLabel')} />
            </View>
            <Text variant="caption" tone="textMuted">{t('liveSettings.enableHint')}</Text>
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="overline" tone="textSubtle" style={{ paddingHorizontal: space.sm }}>{t('liveSettings.whoTitle')}</Text>
            <View accessibilityRole="radiogroup" style={{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden', opacity: settings.liveEnabled ? 1 : 0.55 }}>
              {LiveCallsFrom.options.map((o, i) => {
                const selected = settings.liveCallsFrom === o;
                return (
                  <Pressable key={o} disabled={!settings.liveEnabled} onPress={() => void store.saveSettings({ ...settings, liveCallsFrom: o })}
                    accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: !settings.liveEnabled }}
                    accessibilityLabel={`${t(`liveSettings.options.${o}.label`)}. ${t(`liveSettings.options.${o}.body`)}`}
                    style={({ pressed }) => ({ flexDirection: 'row', gap: space.lg, padding: space.xl, alignItems: 'flex-start',
                      borderTopWidth: i ? 1 : 0, borderTopColor: c.border, backgroundColor: pressed ? c.surfaceAlt : 'transparent' })}>
                    <View style={{ width: 22, height: 22, marginTop: 1, borderRadius: 11, borderWidth: 1.5, borderColor: selected ? c.accent : c.textSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      {selected ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent }} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: space.xs }}>
                      <Text variant="bodyStrong">{t(`liveSettings.options.${o}.label`)}</Text>
                      <Text variant="caption" tone="textMuted">{t(`liveSettings.options.${o}.body`)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {s.error === 'save_failed' ? <Text variant="caption" tone="danger" accessibilityRole="alert">{t('live.errors.save_failed')}</Text> : null}
          </View>

          <View style={{ backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: space.xl, gap: space.md }}>
            <Text variant="heading">{t('liveSettings.rulesTitle')}</Text>
            {(['window', 'cooldown', 'camera', 'noRecording', 'report'] as const).map((k) => (
              <View key={k} style={{ flexDirection: 'row', gap: space.md }}>
                <Icon name="check" size={18} color={c.accent} />
                <Text variant="caption" style={{ flex: 1 }}>
                  {t(`liveSettings.rules.${k}`, { minutes: RULES.liveAvailabilityMinutes, hours: RULES.liveDeclineCooldownHours })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}
