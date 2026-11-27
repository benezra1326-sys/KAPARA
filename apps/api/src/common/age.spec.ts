import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ageNow, checkAge, localDate, parseYmd } from '@kapara/config';

test('17 years old is refused', () => {
  assert.deepEqual(checkAge('2009-06-15', '2026-11-27'), { ok: false, reason: 'adults_only' });
});

test('18 on the birthday itself is accepted', () => {
  assert.deepEqual(checkAge('2008-11-27', '2026-11-27'), { ok: true, age: 18 });
});

test('the day before the 18th birthday is refused', () => {
  assert.deepEqual(checkAge('2008-11-28', '2026-11-27'), { ok: false, reason: 'adults_only' });
});

test('29 February: 18 on 1 March in a non-leap year, not on 28 February', () => {
  assert.deepEqual(checkAge('2008-02-29', '2026-02-28'), { ok: false, reason: 'adults_only' });
  assert.deepEqual(checkAge('2008-02-29', '2026-03-01'), { ok: true, age: 18 });
  // Leap year: the birthday exists.
  assert.deepEqual(checkAge('2010-02-29', '2028-02-29'), { ok: false, reason: 'invalid_birth_date' }); // 2010 not leap
  assert.deepEqual(checkAge('2012-02-29', '2030-03-01'), { ok: true, age: 18 });
  assert.deepEqual(checkAge('2012-02-29', '2030-02-28'), { ok: false, reason: 'adults_only' });
});

test('impossible dates are refused, not treated as ages', () => {
  for (const d of ['2001-02-29', '2000-13-01', '2000-04-31', '1999-00-10', '12-01-2000', '', '1850-01-01', '2030-01-01'])
    assert.equal(checkAge(d, '2026-11-27').ok, false, d);
  assert.ok(parseYmd('2000-02-29'));
  assert.equal(parseYmd('1900-02-29'), null);
});

test('time zones: the local date decides (birthday at local midnight)', () => {
  // 27 Nov 2026 23:30 UTC = 28 Nov 00:30 in Paris, still 27 Nov in New York.
  const at = new Date('2026-11-27T23:30:00Z');
  assert.equal(localDate('Europe/Paris', at), '2026-11-28');
  assert.equal(localDate('America/New_York', at), '2026-11-27');
  assert.deepEqual(checkAge('2008-11-28', localDate('Europe/Paris', at)), { ok: true, age: 18 });
  assert.deepEqual(checkAge('2008-11-28', localDate('America/New_York', at)), { ok: false, reason: 'adults_only' });
  assert.equal(localDate('Not/AZone', at), '2026-11-27'); // unknown zone: UTC
  assert.equal(ageNow('2008-11-28', 'Europe/Paris', at), 18);
});
