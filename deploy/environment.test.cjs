const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { parseEnv } = require('node:util');
const vm = require('node:vm');
const { prepareEnv } = require('./prepare-env.cjs');
const { missingKeyAppend } = require('./complete-env.cjs');
const { validateEnvironment } = require('./check-backend.cjs');

test('fresh configuration satisfies preflight and the Augment constructor', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'realweb-env-test-'));
  try {
    prepareEnv(directory);
    const env = parseEnv(fs.readFileSync(path.join(directory, '.env'), 'utf8'));
    validateEnvironment(env);
    assert.match(env.AUGMENT_TOKEN_ENCRYPTION_KEY, /^[0-9a-f]{64}$/);
    assert.notEqual(env.AUGMENT_TOKEN_ENCRYPTION_KEY, new URL(env.MONGODB_URI).password);
    const moduleStub = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../backend/src/services/AugmentService.js'), 'utf8'), {
      module: moduleStub, process: { env }, require(name) {
        if (name === 'axios') return {}; // Constructor must not make network requests.
        return require(name);
      }
    });
    assert.equal(moduleStub.exports.ENCRYPTION_KEY, env.AUGMENT_TOKEN_ENCRYPTION_KEY);
    const withoutKey = { ...env };
    delete withoutKey.AUGMENT_TOKEN_ENCRYPTION_KEY;
    assert.throws(() => validateEnvironment(withoutKey), /AUGMENT_TOKEN_ENCRYPTION_KEY/);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('realweb-env-test-'));
    fs.rmSync(directory, { recursive: true });
  }
});

test('supplement preserves credentials and missing final newline', () => {
  for (const newline of ['\n', '\r\n']) {
    const original = `# Keep existing credentials${newline}JWT_SECRET=existing-jwt${newline}MONGODB_URI=existing-uri`;
    const addition = missingKeyAppend(original);
    assert.ok(addition.startsWith(newline));
    const updated = original + addition;
    assert.ok(updated.startsWith(original));
    const env = parseEnv(updated);
    assert.equal(env.JWT_SECRET, 'existing-jwt');
    assert.equal(env.MONGODB_URI, 'existing-uri');
    assert.match(env.AUGMENT_TOKEN_ENCRYPTION_KEY, /^[0-9a-f]{64}$/);
    assert.equal(missingKeyAppend(updated), '');
  }
});

test('existing quoted and exported keys are never replaced', () => {
  assert.equal(missingKeyAppend('export AUGMENT_TOKEN_ENCRYPTION_KEY="existing-key"\n'), '');
  assert.equal(missingKeyAppend("AUGMENT_TOKEN_ENCRYPTION_KEY='existing-key' # preserve\n"), '');
  assert.throws(() => missingKeyAppend('AUGMENT_TOKEN_ENCRYPTION_KEY=\n'), /empty/);
});

test('commented key does not count as an active encryption key', () => {
  const original = '# AUGMENT_TOKEN_ENCRYPTION_KEY=old-comment\n';
  assert.match(parseEnv(original + missingKeyAppend(original)).AUGMENT_TOKEN_ENCRYPTION_KEY, /^[0-9a-f]{64}$/);
});
