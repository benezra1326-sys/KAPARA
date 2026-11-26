import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { fonts, radius, space } from '@kapara/design';
import { DEMO_MODE } from '../../src/api/client';
import { useConversations, useProposeIntro } from '../../src/social/api';
import { demo } from '../../src/social/demo';
import { Avatar, Card, DemoNotice, Section, StackHeader } from '../../src/social/ui';
import { useTheme } from '../../src/theme';
import { useMe } from '../../src/me/store';
import { Button, fontFor, Text } from '../../src/ui';

type Contact = { id: string; firstName: string; photoUrl: string | null };

/**
 * Propose an introduction between two people you talk with, in three plain
 * steps: who, why, and exactly what each person will see. Double consent:
 * nothing opens unless both accept; a refusal is never revealed.
 */
export default function NewIntroduction() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const convs = useConversations();
  const propose = useProposeIntro();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const contacts: Contact[] = useMemo(() => {
    const list = DEMO_MODE ? demo.contacts() : (convs.data ?? []).map((x) => ({ id: x.other.id, firstName: x.other.firstName, photoUrl: x.other.photoUrl }));
    return [...new Map(list.map((p) => [p.id, p])).values()];
  }, [convs.data]);

  const me = useMe((s) => s.firstName);
  const pa = contacts.find((p) => p.id === a);
  const pb = contacts.find((p) => p.id === b);
  const ready = a && b && a !== b && note.trim().length >= 10;

  const submit = () => {
    if (!a || !b) return;
    propose.mutate({ personAId: a, personBId: b, note: note.trim() }, {
      onSuccess: () => Alert.alert(t('intro.submitted'), undefined, [{ text: t('common.close'), onPress: () => router.back() }]),
      onError: (e) => {
        const key = `intro.errors.${e.message}`;
        Alert.alert(t('intro.newTitle'), t(key, { defaultValue: t('common.error') }));
      },
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StackHeader title={t('intro.newTitle')} subtitle={t('intro.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }} keyboardShouldPersistTaps="handled">
        <DemoNotice />
        <View style={{ marginHorizontal: space.lg, marginBottom: space.xl }}>
          <Card><Text tone="textMuted">{t('intro.newIntro')}</Text></Card>
        </View>
        {contacts.length < 2 ? (
          <View style={{ marginHorizontal: space.lg }}><Card><Text tone="textMuted">{t('intro.noContacts')}</Text></Card></View>
        ) : (
          <>
            <Text variant="heading" accessibilityRole="header" style={{ marginHorizontal: space.xl, marginBottom: space.sm }}>{t('intro.stepWho')}</Text>
            <Picker title={t('intro.pickFirst')} contacts={contacts} value={a} disabledId={b} onChange={setA} />
            <Picker title={t('intro.pickSecond')} contacts={contacts} value={b} disabledId={a} onChange={setB} />
            <Text variant="heading" accessibilityRole="header" style={{ marginHorizontal: space.xl, marginBottom: space.sm }}>{t('intro.stepWhy')}</Text>
            <Section title={t('intro.note')}>
              <TextInput
                value={note} onChangeText={setNote} multiline maxLength={400}
                placeholder={t('intro.notePlaceholder')} placeholderTextColor={c.textSubtle} accessibilityLabel={t('intro.note')}
                style={{ minHeight: 120, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: space.lg, color: c.text, fontFamily: fontFor(fonts.body), fontSize: 16, textAlignVertical: 'top' }}
              />
              <Text variant="caption" tone="textSubtle" style={{ textAlign: 'right' }}>{note.length}/400</Text>
            </Section>
            <Text variant="heading" accessibilityRole="header" style={{ marginHorizontal: space.xl, marginBottom: space.sm }}>{t('intro.stepSeen')}</Text>
            <View style={{ marginHorizontal: space.lg, gap: space.lg }}>
              <Card>
                <View style={{ gap: space.md }}>
                  <Text variant="label" tone="accent">{t('intro.fromYou', { me: me || '…' })}</Text>
                  {pa && pb ? (
                    <>
                      <Text>{t('intro.willSee', { who: pa.firstName, other: pb.firstName })}</Text>
                      <Text>{t('intro.willSee', { who: pb.firstName, other: pa.firstName })}</Text>
                    </>
                  ) : <Text tone="textMuted">{t('intro.pickBoth')}</Text>}
                  <Text variant="caption" tone="textMuted">{t('intro.consentRule')}</Text>
                </View>
              </Card>
              <Button label={t('intro.submit')} disabled={!ready} loading={propose.isPending} onPress={submit} />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Picker({ title, contacts, value, disabledId, onChange }: { title: string; contacts: Contact[]; value: string | null; disabledId: string | null; onChange: (id: string) => void }) {
  const { c } = useTheme();
  return (
    <Section title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.xs }} accessibilityRole="radiogroup">
        {contacts.map((p) => {
          const selected = value === p.id;
          const disabled = disabledId === p.id;
          return (
            <Pressable key={p.id} onPress={() => onChange(p.id)} disabled={disabled}
              accessibilityRole="radio" accessibilityState={{ selected, disabled }} accessibilityLabel={p.firstName}
              style={{ alignItems: 'center', gap: space.xs, opacity: disabled ? 0.35 : 1, width: 76 }}>
              <View style={{ padding: 3, borderRadius: 40, borderWidth: 2, borderColor: selected ? c.accent : 'transparent' }}>
                <Avatar uri={p.photoUrl} name={p.firstName} size={60} />
              </View>
              <Text variant="caption" tone={selected ? 'accent' : 'textMuted'} numberOfLines={1}>{p.firstName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Section>
  );
}
