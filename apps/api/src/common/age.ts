/** Age in full years at `at` (calendar based, birthday-exact). */
export function ageOn(birth: Date, at = new Date()): number {
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const m = at.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
