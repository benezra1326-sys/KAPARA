import type { TFunction } from 'i18next';
import {
  ChildrenWish, CommunityAttendance, HolidaysPractice, ImportanceOfJewishPartner, KashrutPractice,
  PracticeRelation, RelationshipIntent, ShabbatPractice, TraditionPlace, type JewishLife,
} from '@kapara/shared';

export type JLKey = keyof JewishLife;
export type FieldKind = 'single' | 'text' | 'tags';
export interface FieldMeta { key: JLKey; kind: FieldKind; options?: readonly string[] }

/**
 * UI metadata for the Jewish-life questions. Option ids come from the shared
 * zod enums; labels live in i18n (`jl.options.<key>.<id>`) so each locale or
 * country can phrase movements and practices its own way.
 */
export const FIELD_GROUPS: { id: string; fields: FieldMeta[] }[] = [
  { id: 'tradition', fields: [
    { key: 'practice', kind: 'single', options: PracticeRelation.options },
    { key: 'partnerImportance', kind: 'single', options: ImportanceOfJewishPartner.options },
    { key: 'traditionPlace', kind: 'single', options: TraditionPlace.options },
  ] },
  { id: 'rhythm', fields: [
    { key: 'shabbat', kind: 'single', options: ShabbatPractice.options },
    { key: 'holidays', kind: 'single', options: HolidaysPractice.options },
  ] },
  { id: 'kashrut', fields: [
    { key: 'kashrutHome', kind: 'single', options: KashrutPractice.options },
    { key: 'kashrutOutside', kind: 'single', options: KashrutPractice.options },
  ] },
  { id: 'community', fields: [
    { key: 'community', kind: 'single', options: CommunityAttendance.options },
    { key: 'communityName', kind: 'text' },
    { key: 'culturalBackground', kind: 'tags' },
  ] },
  { id: 'future', fields: [
    { key: 'relationshipIntent', kind: 'single', options: RelationshipIntent.options },
    { key: 'children', kind: 'single', options: ChildrenWish.options },
  ] },
];

export const ALL_FIELDS: FieldMeta[] = FIELD_GROUPS.flatMap((g) => g.fields);
export const fieldMeta = (key: string) => ALL_FIELDS.find((f) => f.key === key);

/** Asked during onboarding; everything else lives in the profile editor. */
export const ONBOARDING_FIELDS: JLKey[] = ['practice', 'partnerImportance', 'shabbat', 'kashrutHome', 'relationshipIntent'];

/** Cultural/community ties offered as suggestions; members can type their own. */
export const CULTURAL_TAG_SUGGESTIONS = ['sephardi', 'ashkenazi', 'mizrahi', 'tunisian', 'moroccan', 'algerian', 'israeli', 'russian_speaking', 'italian', 'yemenite', 'ethiopian', 'mixed'] as const;

/** Languages a member can list (ISO 639-1 / 639-3 for Ladino & Yiddish). */
export const LANGUAGE_OPTIONS = ['fr', 'en', 'he', 'es', 'ru', 'ar', 'it', 'de', 'pt', 'yi', 'lad'] as const;

/** Human label for a member's own answer (editor and privacy lists). */
export function answerLabel(t: TFunction, meta: FieldMeta, f?: { value: unknown; preferNotToSay?: boolean }): string {
  if (!f) return t('edit.notAnswered');
  if (f.preferNotToSay) return t('common.preferNotToSay');
  const v = f.value;
  if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return t('edit.notAnswered');
  if (Array.isArray(v)) return v.map((x) => t(`jl.tags.${x}`, { defaultValue: x })).join(', ');
  return meta.kind === 'single' ? t(`jl.options.${meta.key}.${String(v)}`) : String(v);
}


/** Prompts shown on a profile (the API accepts up to 4; the benchmark keeps 3). */
export const MAX_PROMPTS = 3;
