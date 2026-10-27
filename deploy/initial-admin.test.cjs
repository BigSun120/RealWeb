const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { createInitialAdmin } = require('./create-initial-admin.cjs');
const backendRequire = createRequire(path.join(__dirname, '../backend/package.json'));
const User = backendRequire('./src/models/User');

const input = { username: 'owner_01', email: 'owner@example.com', password: 'long-test-password-42' };
function modelWithResults(results, initError = null) {
  const state = { writes: 0, initialized: false, queries: [], saved: null };
  class TestUser extends User {
    static async exists(query) { state.queries.push(query); return results.shift() || null; }
    static async init() {
      state.initialized = true;
      if (initError) throw initError;
    }
    async save() { state.writes++; state.saved = this; return this; }
  }
  return { Model: TestUser, state };
}

test('initial admin uses both permission flags, active status and verified email', async () => {
  const { Model, state } = modelWithResults([null, null]);
  const result = await createInitialAdmin(Model, { ...input, username: ' owner_01 ', email: ' OWNER@EXAMPLE.COM ' });
  assert.equal(result.username, 'owner_01');
  assert.equal(state.saved.email, 'owner@example.com');
  assert.equal(state.saved.displayName, 'owner_01');
  assert.equal(state.saved.role, 'admin');
  assert.equal(state.saved.isAdmin, true);
  assert.equal(state.saved.isActive, true);
  assert.equal(state.saved.emailVerified, true);
  assert.ok(state.saved.emailVerifiedAt instanceof Date);
  assert.equal(state.initialized, true);
  assert.equal(state.writes, 1);
});

test('an existing administrator stops all writes', async () => {
  const { Model, state } = modelWithResults([{ _id: 'existing-admin' }]);
  await assert.rejects(createInitialAdmin(Model, input), /administrator already exists/);
  assert.equal(state.writes, 0);
  assert.equal(state.initialized, false);
});

test('an existing ordinary account is preserved rather than promoted', async () => {
  const { Model, state } = modelWithResults([null, { _id: 'ordinary-user' }]);
  await assert.rejects(createInitialAdmin(Model, input), /already in use/);
  assert.equal(state.writes, 0);
  assert.equal(state.initialized, false);
});

test('invalid identity and passwords are rejected before any database query', async () => {
  for (const replacement of [{ username: 'x' }, { email: 'invalid-email' }, { password: 'short' }, { password: 'x'.repeat(73) }, { password: '长'.repeat(30) }]) {
    const { Model, state } = modelWithResults([]);
    await assert.rejects(createInitialAdmin(Model, { ...input, ...replacement }));
    assert.equal(state.queries.length, 0);
    assert.equal(state.writes, 0);
  }
});

test('User schema declares each index once and preserves identity and token constraints', () => {
  const indexes = User.schema.indexes();
  const seen = new Set();
  for (const [keys] of indexes) {
    const signature = JSON.stringify(keys);
    assert.equal(seen.has(signature), false, `Conflicting repeated index: ${signature}`);
    seen.add(signature);
  }
  const optionsFor = field => indexes.find(([keys]) => JSON.stringify(keys) === JSON.stringify({ [field]: 1 }))?.[1];
  assert.equal(optionsFor('username').unique, true);
  assert.equal(optionsFor('email').unique, true);
  assert.equal(optionsFor('displayName').unique, true);
  assert.equal(optionsFor('displayName').sparse, true);
  assert.equal(optionsFor('emailVerificationToken').sparse, true);
  assert.equal(optionsFor('passwordResetToken').sparse, true);
});

test('index initialization failure prevents saving the administrator', async () => {
  const conflict = Object.assign(new Error('index conflict'), { code: 86 });
  const { Model, state } = modelWithResults([null, null], conflict);
  await assert.rejects(createInitialAdmin(Model, input), error => error.code === 86);
  assert.equal(state.writes, 0);
});
