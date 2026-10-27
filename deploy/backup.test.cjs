const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { dumpCommand, checksum, run } = require('./backup.cjs');

const env = {
  NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '8000',
  UPLOAD_PATH: '/var/lib/realweb/uploads', BACKUP_DIR: '/var/backups/realweb',
  JWT_SECRET: 'a'.repeat(128), AUGMENT_TOKEN_ENCRYPTION_KEY: 'b'.repeat(64),
  MONGODB_URI: `mongodb://realweb_app:${'c'.repeat(64)}@127.0.0.1:27017/personal_website_prod?authSource=personal_website_prod`
};

test('authenticated dump uses stdin configuration and no secrets in command arguments', () => {
  const dump = dumpCommand(env);
  assert.equal(dump.command, 'docker');
  assert.ok(dump.args.includes('-T'));
  assert.ok(dump.args.includes('mongodb'));
  assert.ok(dump.args.includes('mongodump'));
  assert.ok(dump.args.includes('--config=/dev/stdin'));
  assert.ok(dump.args.includes('--archive'));
  assert.ok(dump.args.includes('--gzip'));
  assert.equal(JSON.parse(dump.input).uri, env.MONGODB_URI);
  assert.equal(dump.args.join(' ').includes(env.MONGODB_URI), false);
  assert.equal(dump.args.join(' ').includes('c'.repeat(64)), false);
  assert.throws(() => dumpCommand({ ...env, MONGODB_URI: env.MONGODB_URI.replace('127.0.0.1', 'remote.example.com') }));
});

test('failed subprocess details are excluded from reported errors', () => {
  assert.throws(() => run(process.execPath, ['-e', 'process.stderr.write("sensitive-test-value");process.exit(7)']), error => {
    assert.match(error.message, /exit 7/);
    assert.equal(error.message.includes('sensitive-test-value'), false);
    return true;
  });
});

test('backup checksum matches a known SHA-256 vector', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'realweb-backup-test-'));
  try {
    const file = path.join(directory, 'archive');
    fs.writeFileSync(file, 'abc');
    assert.equal(await checksum(file), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('realweb-backup-test-'));
    fs.rmSync(directory, { recursive: true });
  }
});
