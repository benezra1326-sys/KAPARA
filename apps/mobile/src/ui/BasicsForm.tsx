import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { checkAge, localDate, LAUNCH_REGION, MIN_AGE, REGIONS } from '@kapara/config';
import { Gender, type ProfileUpdate } from '@kapara/shared';
import { space } from '@kapara/design';
import { LANGUAGE_OPTIONS } from '../me/fields';
import { deviceTimeZone, meStore, useMe, type MyProfile } from '../me/store';
import { useTheme } from '../theme';
import { CitySheet } from './CityPicker';
import { Icon } from './Icon';
import { ChoiceList, Chips } from './Choice';
import { Field } from './Field';
import { Text } from './Text';
import { cityOf } from '../me/identity';

type Basics = Required<Pick<ProfileUpdate, 'firstName' | 'birthDate' | 'gender' | 'headline' | 'languages' | 'regionCode'>> & { seeks: Gender[] };

/** First name, birth date, gender, who they seek, headline, languages. Shared by onboarding and the editor. */
export function useBasicsForm(me: MyProfile) {
  const [firstName, setFirstName] = useState(me.firstName);
  const [d0, m0, y0] = me.birthDate ? me.birthDate.split('-').reverse() : ['', '', ''];
  const [day, setDay] = useState(d0 ?? '');
  const [month, setMonth] = useState(m0 ?? '');
  const [year, setYear] = useState(y0 ?? '');
  const [gender, setGender] = useState<Gender | undefined>(me.gender);
  // "Je recherche": always asked, never guessed (an earlier default is shown pre-selected only if it was saved).
  const [seeks, setSeeks] = useState<Gender[]>(me.seeks ?? []);
  const [headline, setHeadline] = useState(me.headline);
  const [languages, setLanguages] = useState(me.languages);
  const [touched, setTouched] = useState(false);

  const birthDate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  // Same rule as the API and the database: calendar years on the local date, 18 today is accepted.
  const verdict = /^\d{4}$/.test(year) && month && day ? checkAge(birthDate, localDate(deviceTimeZone())) : null;
  const errors = {
    firstName: firstName.trim() ? undefined : 'required',
    birthDate: !verdict ? 'date' : verdict.ok ? undefined : verdict.reason === 'adults_only' ? 'age' : 'date',
    gender: gender ? undefined : 'required',
    seeks: seeks.length ? undefined : 'required',
  };
  const valid = !errors.firstName && !errors.birthDate && !errors.gender && !errors.seeks;
  const value: Basics | null = valid ? { firstName: firstName.trim(), birthDate, gender: gender!, seeks, headline: headline.trim(), languages, regionCode: meStore.get().regionCode } : null;

  return {
    valid, value, touch: () => setTouched(true),
    /** The date is a real one, but the person is under 18: the sign-up stops here. */
    underage: errors.birthDate === 'age',
    render: () => <BasicsFields {...{ firstName, setFirstName, day, setDay, month, setMonth, year, setYear, gender, setGender, seeks, setSeeks, headline, setHeadline, languages, setLanguages, errors: touched ? errors : {} }} />,
  };
}

function BasicsFields(p: {
  firstName: string; setFirstName: (v: string) => void; day: string; setDay: (v: string) => void; month: string; setMonth: (v: string) => void;
  year: string; setYear: (v: string) => void; gender?: Gender; setGender: (g: Gender) => void; seeks: Gender[]; setSeeks: (v: Gender[]) => void;
  headline: string; setHeadline: (v: string) => void;
  languages: string[]; setLanguages: (v: string[]) => void; errors: Partial<Record<'firstName' | 'birthDate' | 'gender' | 'seeks', string>>;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const regionCode = useMe((s) => s.regionCode);
  const region = REGIONS.find((r) => r.code === regionCode) ?? LAUNCH_REGION;
  const [cityOpen, setCityOpen] = useState(false);
  const digits = (v: string) => v.replace(/\D/g, '');
  return (
    <View style={{ gap: space.xl }}>
      <Field label={t('basics.firstName')} value={p.firstName} onChangeText={p.setFirstName} maxLength={40} autoComplete="given-name" textContentType="givenName"
        hint={t('basics.firstNameHint')} error={p.errors.firstName ? t('basics.required') : undefined} />
      <View style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}><Field label={t('basics.day')} value={p.day} onChangeText={(v) => p.setDay(digits(v))} keyboardType="number-pad" maxLength={2} placeholder={t('basics.dayPh')} /></View>
          <View style={{ flex: 1 }}><Field label={t('basics.month')} value={p.month} onChangeText={(v) => p.setMonth(digits(v))} keyboardType="number-pad" maxLength={2} placeholder={t('basics.monthPh')} /></View>
          <View style={{ flex: 1.4 }}><Field label={t('basics.year')} value={p.year} onChangeText={(v) => p.setYear(digits(v))} keyboardType="number-pad" maxLength={4} placeholder={t('basics.yearPh')} /></View>
        </View>
        <Text variant="caption" tone={p.errors.birthDate ? 'danger' : 'textSubtle'}>
          {p.errors.birthDate === 'age' ? t('basics.tooYoung', { min: MIN_AGE }) : p.errors.birthDate ? t('basics.badDate') : t('basics.birthHint')}
        </Text>
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label" tone="textMuted">{t('basics.gender')}</Text>
        <ChoiceList label={t('basics.gender')} value={p.gender} onChange={(g) => p.setGender(g as Gender)}
          options={Gender.options.map((g) => ({ id: g, label: t(`basics.genders.${g}`) }))} />
        {p.errors.gender ? <Text variant="caption" tone="danger">{t('basics.required')}</Text> : null}
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label" tone="textMuted">{t('basics.seeks')}</Text>
        <Chips label={t('basics.seeks')} values={p.seeks}
          options={Gender.options.map((g) => ({ id: g, label: t(`basics.seeking.${g}`) }))}
          onToggle={(id) => p.setSeeks(p.seeks.includes(id as Gender) ? p.seeks.filter((x) => x !== id) : [...p.seeks, id as Gender])} />
        <Text variant="caption" tone={p.errors.seeks ? 'danger' : 'textSubtle'}>{p.errors.seeks ? t('basics.required') : t('basics.seeksHint')}</Text>
      </View>
      <Field label={t('basics.headline')} value={p.headline} onChangeText={p.setHeadline} maxLength={140} counter hint={t('basics.headlineHint')} placeholder={t('basics.headlinePlaceholder')} />
      <View style={{ gap: space.sm }}>
        <Text variant="label" tone="textMuted">{t('basics.languages')}</Text>
        <Chips label={t('basics.languages')} values={p.languages}
          options={LANGUAGE_OPTIONS.map((l) => ({ id: l, label: t(`lang.${l}`) }))}
          onToggle={(id) => p.setLanguages(p.languages.includes(id) ? p.languages.filter((x) => x !== id) : [...p.languages, id].slice(0, 8))} />
      </View>
      <View style={{ gap: space.xs }}>
        <Text variant="label" tone="textMuted">{t('basics.city')}</Text>
        <Pressable onPress={() => setCityOpen(true)} accessibilityRole="button" accessibilityLabel={t('city.change', { city: cityOf(region.code) })}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, opacity: pressed ? 0.6 : 1 })}>
          <Icon name="pin" size={16} color={c.text} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>{cityOf(region.code)}</Text>
          <Text variant="label" style={{ textDecorationLine: 'underline' }}>{t('city.changeShort')}</Text>
        </Pressable>
        <Text variant="caption" tone="textSubtle">{t('basics.cityHint')}</Text>
        <CitySheet mode="home" visible={cityOpen} onClose={() => setCityOpen(false)} />
      </View>
    </View>
  );
}
