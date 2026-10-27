const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { relayDomains, postfixMain, transportMap, openDkimConfig, publicDkimRecord, KEY_FILE } = require('./mail-config.cjs');

test('domain configuration is normalized and rejects directives, local hosts and wildcard relay rules', () => {
  const domains = relayDomains([' GodAug.Fun ', 'aowu.godaug.fun', 'aowu.godaug.fun', 'ohmygod.icu']);
  assert.deepEqual(domains, ['aowu.godaug.fun', 'godaug.fun', 'ohmygod.icu', 'temp.godaug.fun']);
  for (const invalid of ['*', '.godaug.fun', 'example.com\nrelayhost=evil', '127.0.0.1', 'localhost', 'mail.godaug.fun', '-bad.example', 'example.com;touch /tmp/file', 42]) {
    assert.throws(() => relayDomains([invalid]));
  }
});

test('SMTP relay trust is limited to loopback and temporary mail has only a local Inbucket next hop', () => {
  const main = postfixMain(['aowu.godaug.fun']);
  assert.match(main, /^mynetworks = 127\.0\.0\.1\/32$/m);
  assert.match(main, /^smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination$/m);
  assert.match(main, /^parent_domain_matches_subdomains = $/m);
  assert.match(main, /^mydestination = \$myhostname, localhost\.\$mydomain, localhost$/m);
  assert.match(main, /^smtpd_sasl_auth_enable = no$/m);
  assert.match(main, /^milter_default_action = tempfail$/m);
  const map = transportMap(['aowu.godaug.fun']);
  assert.deepEqual(map.trim().split('\n'), [
    'aowu.godaug.fun smtp:[127.0.0.1]:2500',
    'godaug.fun smtp:[127.0.0.1]:2500',
    'temp.godaug.fun smtp:[127.0.0.1]:2500'
  ]);
  assert.match(postfixMain([], 'lmdb'), /^transport_maps = lmdb:\/etc\/postfix\/realweb-transport$/m);
  assert.throws(() => postfixMain([], 'hash; injected'));
});

test('DKIM configuration uses only the loopback socket and local signing host', () => {
  const conf = openDkimConfig();
  assert.match(conf, /Socket\s+inet:8891@127\.0\.0\.1/);
  assert.match(conf, /InternalHosts\s+127\.0\.0\.1/);
  assert.match(conf, /Domain\s+godaug\.fun/);
  assert.match(conf, /Selector\s+realweb/);
  assert.ok(conf.includes(KEY_FILE));
});

test('public DNS key corresponds to the private signing key and excludes private material', () => {
  const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privatePem = pair.privateKey.export({ type: 'pkcs1', format: 'pem' });
  const record = publicDkimRecord(privatePem);
  assert.match(record, /^v=DKIM1; k=rsa; p=[A-Za-z0-9+/=]+$/);
  assert.equal(record.includes('PRIVATE KEY'), false);
  const publicKey = crypto.createPublicKey({ key: Buffer.from(record.split('p=')[1], 'base64'), type: 'spki', format: 'der' });
  const message = Buffer.from('DKIM key regression check');
  const signature = crypto.sign('sha256', message, pair.privateKey);
  assert.equal(crypto.verify('sha256', message, publicKey, signature), true);
  const weak = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
  assert.throws(() => publicDkimRecord(weak), /at least 2048/);
});
