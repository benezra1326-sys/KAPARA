import { z } from 'zod';
import { sensitive } from './visibility';

/**
 * Optional, nuanced questions about Jewish life. Option ids are stable keys;
 * labels live in i18n catalogues so each country can phrase them its own way.
 * Never binary, always skippable, always editable, never inferred.
 */
export const PracticeRelation = z.enum([
  'cultural', 'traditional', 'masorti', 'liberal_reform', 'modern_orthodox',
  'orthodox', 'haredi', 'spiritual', 'exploring', 'secular', 'other',
]);
export const ImportanceOfJewishPartner = z.enum([
  'essential', 'important', 'open_to_jewish_life', 'not_a_criterion',
]);
export const ShabbatPractice = z.enum([
  'full_observance', 'friday_dinner', 'sometimes', 'family_occasions', 'not_currently', 'other',
]);
export const HolidaysPractice = z.enum([
  'all_major', 'high_holidays_and_pesach', 'some', 'cultural_only', 'not_currently',
]);
export const KashrutPractice = z.enum([
  'strict_home_and_out', 'kosher_home_flexible_out', 'no_pork_seafood', 'vegetarian_for_kashrut', 'not_kosher', 'other',
]);
export const CommunityAttendance = z.enum([
  'weekly', 'monthly', 'holidays', 'events_only', 'rarely', 'none',
]);
export const TraditionPlace = z.enum(['central', 'important', 'occasional', 'personal_choice']);
export const RelationshipIntent = z.enum([
  'marriage', 'long_term', 'see_where_it_goes', 'friendship_first', 'not_sure_yet',
]);
export const ChildrenWish = z.enum([
  'want', 'have_and_want_more', 'have_no_more', 'open', 'dont_want', 'not_sure',
]);

export const JewishLife = z.object({
  practice: sensitive(PracticeRelation),
  partnerImportance: sensitive(ImportanceOfJewishPartner),
  shabbat: sensitive(ShabbatPractice),
  holidays: sensitive(HolidaysPractice),
  kashrutHome: sensitive(KashrutPractice),
  kashrutOutside: sensitive(KashrutPractice),
  community: sensitive(CommunityAttendance),
  communityName: sensitive(z.string().max(80)),
  traditionPlace: sensitive(TraditionPlace),
  culturalBackground: sensitive(z.array(z.string().max(40)).max(6)), // free tags, member-provided only
  relationshipIntent: sensitive(RelationshipIntent),
  children: sensitive(ChildrenWish),
});
export type JewishLife = z.infer<typeof JewishLife>;

export const JEWISH_LIFE_FIELDS = Object.keys(JewishLife.shape) as (keyof JewishLife)[];
