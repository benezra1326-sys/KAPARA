import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { space } from '@kapara/design';
import { useBlocks, useUnblock } from '../../src/social/api';
import { Card, DemoNotice, Loading, Row, RowGroup, Section, StackHeader, useFormat } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { Button, Text } from '../../src/ui';

export default function Blocked() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const q = useBlocks();
  const unblock = useUnblock();
  const list = q.data ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StackHeader title={t('safety.blockedTitle')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }}>
        <DemoNotice real />
        <Section title={t('safety.blockedTitle')} hint={t('safety.unblockHint')}>
          {q.isLoading ? <Loading /> : list.length === 0 ? <Card><Text tone="textMuted">{t('safety.blockedEmpty')}</Text></Card> : (
            <RowGroup>
              {list.map((b, i) => (
                <Row key={b.userId} first={i === 0} label={b.firstName} detail={t('safety.blockedOn', { date: f.day(b.blockedAt) })}
                  right={<Button kind="ghost" label={t('safety.unblock')} onPress={() => unblock.mutate(b.userId)} />} />
              ))}
            </RowGroup>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}
