import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOtp, otpHash, otpRequestAllowed, OTP_MAX_ATTEMPTS } from './otp';
import { newOtpCode } from './crypto';

const S = 'test-secret-0123456789';
const rec = (over: Partial<Parameters<typeof checkOtp>[3]> = {}) =>
  ({ codeHash: otpHash(S, 'a@b.fr', '123456'), expiresAt: new Date(Date.now() + 60_000), attempts: 0, consumedAt: null, ...over });

test('codes are 6 digits', () => {
  for (let i = 0; i < 50; i++) assert.match(newOtpCode(), /^\d{6}$/);
});
test('right code passes, wrong code fails', () => {
  assert.equal(checkOtp(S, 'a@b.fr', '123456', rec()), 'ok');
  assert.equal(checkOtp(S, 'a@b.fr', '654321', rec()), 'mismatch');
});
test('code is bound to the email', () => {
  assert.equal(checkOtp(S, 'other@b.fr', '123456', rec()), 'mismatch');
});
test('expired, consumed and over-attempted codes fail', () => {
  assert.equal(checkOtp(S, 'a@b.fr', '123456', rec({ expiresAt: new Date(Date.now() - 1) })), 'expired');
  assert.equal(checkOtp(S, 'a@b.fr', '123456', rec({ consumedAt: new Date() })), 'consumed');
  assert.equal(checkOtp(S, 'a@b.fr', '123456', rec({ attempts: OTP_MAX_ATTEMPTS })), 'too_many_attempts');
});
test('requests are throttled per address', () => {
  const now = new Date();
  assert.equal(otpRequestAllowed([], now).ok, true);
  const tooSoon = otpRequestAllowed([{ createdAt: new Date(now.getTime() - 5_000) }], now);
  assert.equal(tooSoon.ok, false);
  const many = Array.from({ length: 5 }, (_, i) => ({ createdAt: new Date(now.getTime() - (i + 1) * 300_000) }));
  assert.equal(otpRequestAllowed(many, now).ok, false);
  assert.equal(otpRequestAllowed(many.slice(0, 4), now).ok, true);
});
