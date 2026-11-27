import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signPhotoUrls } from './signed-urls';

const P = 'https://b.s3.eu-west-3.amazonaws.com/profiles/';
const sign = (u: string) => `${u}?X-Amz-Signature=x`;

test('private photo URLs are signed everywhere in an answer, other strings untouched', () => {
  const body = {
    items: [{ firstName: 'Léa', photoUrl: `${P}u/a.jpg`, photos: [{ url: `${P}u/b.jpg` }] }],
    other: 'https://example.org/x.jpg', when: new Date(0), n: 3, none: null,
  };
  const out = signPhotoUrls(body, sign, P);
  assert.equal(out.items[0]!.photoUrl, `${P}u/a.jpg?X-Amz-Signature=x`);
  assert.equal(out.items[0]!.photos[0]!.url, `${P}u/b.jpg?X-Amz-Signature=x`);
  assert.equal(out.other, 'https://example.org/x.jpg');
  assert.ok(out.when instanceof Date);
  assert.equal(out.n, 3);
  assert.equal(out.none, null);
  assert.equal(body.items[0]!.photoUrl, `${P}u/a.jpg`, 'the original is not mutated');
});
