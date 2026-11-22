import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from '@kapara/config';
import { nextWindow, restWindows, windowAt } from './rest-windows';

const paris = REGIONS.find((r) => r.code === 'fr-paris')!;
const base = { includeHolidays: true, candleLightingMins: 18, havdalahMins: null };
const hhmm = (d: Date) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(d);

test('an ordinary Shabbat runs Friday candle lighting → Saturday nightfall', () => {
  const w = restWindows(paris, base, new Date('2026-11-23T00:00:00Z'), new Date('2026-11-30T00:00:00Z'));
  assert.equal(w.length, 1);
  assert.equal(w[0]!.kind, 'shabbat');
  assert.equal(w[0]!.start.toISOString().slice(0, 10), '2026-11-27');
  assert.equal(w[0]!.end.toISOString().slice(0, 10), '2026-11-28');
  // Paris sunset late November ≈ 16:57, so candles ≈ 16:39.
  assert.match(hhmm(w[0]!.start), /^16:[34]\d$/);
});

test('Pesach running into Shabbat merges into one holiday window', () => {
  const w = restWindows(paris, base, new Date('2027-04-20T00:00:00Z'), new Date('2027-04-26T00:00:00Z'));
  assert.equal(w.length, 1);
  assert.equal(w[0]!.kind, 'holiday');
  assert.match(w[0]!.title, /Pesach/);
  assert.equal(w[0]!.start.toISOString().slice(0, 10), '2027-04-21');
  assert.equal(w[0]!.end.toISOString().slice(0, 10), '2027-04-24');
});

test('without holidays, only the Shabbat part is kept', () => {
  const w = restWindows(paris, { ...base, includeHolidays: false }, new Date('2027-04-20T00:00:00Z'), new Date('2027-04-26T00:00:00Z'));
  assert.equal(w.length, 1);
  assert.equal(w[0]!.kind, 'shabbat');
  assert.equal(w[0]!.start.toISOString().slice(0, 10), '2027-04-23');
});

test('fixed havdalah minutes are honoured', () => {
  const night = restWindows(paris, base, new Date('2026-11-23T00:00:00Z'), new Date('2026-11-30T00:00:00Z'))[0]!;
  const fixed = restWindows(paris, { ...base, havdalahMins: 72 }, new Date('2026-11-23T00:00:00Z'), new Date('2026-11-30T00:00:00Z'))[0]!;
  assert.ok(fixed.end > night.end);
});

test('windowAt / nextWindow', () => {
  const w = restWindows(paris, base, new Date('2026-11-23T00:00:00Z'), new Date('2026-12-08T00:00:00Z'));
  assert.equal(windowAt(w, new Date('2026-11-28T12:00:00Z'))?.kind, 'shabbat');
  assert.equal(windowAt(w, new Date('2026-11-25T12:00:00Z')), null);
  assert.equal(nextWindow(w, new Date('2026-11-25T12:00:00Z'))?.start.toISOString().slice(0, 10), '2026-11-27');
});
