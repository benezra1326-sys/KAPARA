import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { APP } from '@kapara/config';
import { radius, space } from '@kapara/design';
import { useTheme } from '../../src/theme';
import { Screen, Text } from '../../src/ui';

export default function Me() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const rows: { label: string; href?: Href }[] = [
    { label: t('me.editProfile'), href: '/profile/edit' }, { label: t('me.preferences') },
    { label: t('me.privacy'), href: '/settings/privacy' }, { label: t('me.introductions'), href: '/introductions' },
    { label: t('me.shabbatMode'), href: '/settings/shabbat' }, { label: t('me.blocked'), href: '/settings/blocked' },
    { label: t('me.pause') }, { label: t('me.signOut') },
  ];
  return (
    <Screen title={t('me.title')} subtitle={APP.name}>
      <View style={{ marginHorizontal: space.lg, backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
        {rows.map((r, idx) => {
          const row = (
            <Pressable accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: space.xl, justifyContent: 'center',
              backgroundColor: pressed ? c.surfaceAlt : 'transparent', borderTopWidth: idx ? 1 : 0, borderTopColor: c.border })}>
              <Text>{r.label}</Text>
            </Pressable>
          );
          return r.href ? <Link key={r.label} href={r.href} asChild>{row}</Link> : <View key={r.label}>{row}</View>;
        })}
      </View>
    </Screen>
  );
}
