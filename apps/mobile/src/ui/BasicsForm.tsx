import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LAUNCH_REGION, REGIONS, RULES } from '@kapara/config';
import { Gender, type ProfileUpdate } from '@kapara/shared';
import { space } from '@kapara/design';
import { LANGUAGE_OPTIONS } from '../me/fields';
import { ageFrom, type MyProfile } from '../me/store';
import { ChoiceList, Chips } from './Choice';
import { Field } from './Field';
import { Text } from './Text';

type Basics = Required<Pick<ProfileUpdate, 'firstName' | 'birthDate' | 'gender' | 'headline' | 'languages' | 'regionCode'>>;

/** First name, birth date, gender, headline, languages. Shared by onboarding and the editor. */
export function useBasicsForm(me: MyProfile) {
  const [firstName, setFirstName] = useState(me.firstName);
  const [d0, m0, y0] = me.birthDate ? me.birthDate.split('-').reverse() : ['', '', ''];
  const [day, setDay] = useState(d0 ?? '');
  const [month, setMonth] = useState(m0 ?? '');
  const [year, setYear] = useState(y0 ?? '');
  const [gender, setGender] = useState<Gender | undefined>(me.gender);
  const [headline, setHeadline] = useState(me.headline);
  const [languages, setLanguages] = useState(me.languages);
  const [touched, setTouched] = useState(false);

  const birthDate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const validDate = /^\d{4}$/.test(year) && +month >= 1 && +month <= 12 && +day >= 1 && +day <= 31 && new Date(`${birthDate}T00:00:00`).getDate() === +day;
  const age = validDate ? ageFrom(birthDate) : null;
  const errors = {
    firstName: firstName.trim() ? undefined : 'required',
    birthDate: !validDate ? 'date' : age !== null && age < RULES.minAge ? 'age' : age !== null && age > 110 ? 'date' : undefined,
    gender: gender ? undefined : 'required',
  };
  const valid = !errors.firstName && !errors.birthDate && !errors.gender;
  const value: Basics | null = valid ? { firstName: firstName.trim(), birthDate, gender: gender!, headline: headline.trim(), languages, regionCode: me.regionCode } : null;

  return {
    valid, value, touch: () => setTouched(true),
    render: () => <BasicsFields {...{ firstName, setFirstName, day, setDay, month, setMonth, year, setYear, gender, setGender, headline, setHeadline, languages, setLanguages, errors: touched ? errors : {}, regionCode: me.regionCode }} />,
  };
}

function BasicsFields(p: {
  firstName: string; setFirstName: (v: string) => void; day: string; setDay: (v: string) => void; month: string; setMonth: (v: string) => void;
  year: string; setYear: (v: string) => void; gender?: Gender; setGender: (g: Gender) => void; headline: string; setHeadline: (v: string) => void;
  languages: string[]; setLanguages: (v: string[]) => void; errors: Partial<Record<'firstName' | 'birthDate' | 'gender', string>>; regionCode: string;
}) {
  const { t } = useTranslation();
  const region = REGIONS.find((r) => r.code === p.regionCode) ?? LAUNCH_REGION;
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
        <Text variant="caption" tone={p.errors.birthDate ? 'accent' : 'textSubtle'}>
          {p.errors.birthDate === 'age' ? t('basics.tooYoung', { min: RULES.minAge }) : p.errors.birthDate ? t('basics.badDate') : t('basics.birthHint')}
        </Text>
      </View>
      <View style={{ gap: space.sm }}>
        <Text variant="label" tone="textMuted">{t('basics.gender')}</Text>
        <ChoiceList label={t('basics.gender')} value={p.gender} onChange={(g) => p.setGender(g as Gender)}
          options={Gender.options.map((g) => ({ id: g, label: t(`basics.genders.${g}`) }))} />
        {p.errors.gender ? <Text variant="caption" tone="accent">{t('basics.required')}</Text> : null}
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
        <Text variant="bodyStrong">{region.city}</Text>
        <Text variant="caption" tone="textSubtle">{t('basics.cityHint')}</Text>
      </View>
    </View>
  );
}
