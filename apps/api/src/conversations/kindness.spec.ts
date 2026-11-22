import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mayHurt } from './kindness';

test('flags insults in fr, en and he', () => {
  assert.ok(mayHurt('T’es vraiment une CONNASSE'));
  assert.ok(mayHurt('Ferme-la.'));
  assert.ok(mayHurt('you are ugly'));
  assert.ok(mayHurt('את טיפשה'));
});
test('ignores ordinary messages and partial words', () => {
  assert.equal(mayHurt('Bonjour ! J’ai adoré ta réponse sur Souccot.'), false);
  assert.equal(mayHurt('Ma sœur annonce sa grossesse ce shabbat'), false);
  assert.equal(mayHurt('Thoughtful idea, let’s grab a coffee'), false);
  assert.equal(mayHurt('Une grosse bise, et bon appétit pour ton sandwich au thon'), false);
});
