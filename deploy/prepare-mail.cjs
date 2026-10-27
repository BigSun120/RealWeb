const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseEnv } = require('node:util');
const { MARKER, KEY_FILE, relayDomains, postfixMain, transportMap, openDkimConfig, publicDkimRecord } = require('./mail-config.cjs');

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
}

function regular(file, owners = [0]) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || !owners.includes(stat.uid)) throw new Error(`Preserve and inspect an unexpected file: ${file}`);
}

function directory(file, uid = 0, gid = 0, mode = 0o700) {
  if (fs.existsSync(file)) {
    const stat = fs.lstatSync(file);
    if (!stat.isDirectory() || stat.isSymbolicLink() || ![0, uid].includes(stat.uid)) throw new Error(`Preserve and inspect an unexpected directory: ${file}`);
  } else {
    // lstat also catches dangling symlinks before recursive creation.
    try { fs.lstatSync(file); throw new Error(`Refusing a symlink: ${file}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    fs.mkdirSync(file, { recursive: false, mode });
  }
  fs.chownSync(file, uid, gid);
  fs.chmodSync(file, mode);
}

function write(file, contents, mode = 0o644) {
  try { fs.lstatSync(file); regular(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = `${file}.realweb-${process.pid}.tmp`;
  fs.writeFileSync(temporary, contents, { flag: 'wx', mode });
  fs.chmodSync(temporary, mode);
  fs.renameSync(temporary, file);
}

function main() {
  if (process.platform !== 'linux' || process.getuid() !== 0 || path.resolve(__dirname, '..') !== '/opt/realweb') {
    throw new Error('Run as root on the Linux server in /opt/realweb');
  }
  process.umask(0o077);
  const uid = Number(run('id', ['-u', 'opendkim']).trim());
  const gid = Number(run('id', ['-g', 'opendkim']).trim());
  run('id', ['-u', 'postfix']);
  run('getent', ['group', 'postdrop']);
  for (const binary of ['postfix', 'postconf', 'postmap', 'newaliases', 'opendkim']) {
    const available = (process.env.PATH || '').split(path.delimiter).some(directory => {
      try { fs.accessSync(path.join(directory, binary), fs.constants.X_OK); return true; } catch { return false; }
    });
    if (!available) throw new Error(`Required command is missing: ${binary}`);
  }
  const env = parseEnv(fs.readFileSync('/opt/realweb/.env', 'utf8'));
  if (env.SMTP_HOST !== '127.0.0.1' || env.SMTP_PORT !== '25' || env.SMTP_AUTH !== 'false') {
    throw new Error('Existing SMTP environment differs from the local-mail plan; inspect it before proceeding');
  }
  const domains = relayDomains(JSON.parse(fs.readFileSync('/var/lib/realweb/config/email-domains.json', 'utf8')).domains);
  const mainFile = '/etc/postfix/main.cf';
  const masterFile = '/etc/postfix/master.cf';
  const hook = '/etc/letsencrypt/renewal-hooks/deploy/realweb-mail';
  if (fs.existsSync(mainFile)) {
    regular(mainFile);
    if (!fs.readFileSync(mainFile, 'utf8').startsWith(MARKER + '\n')) throw new Error('Preserve and inspect an existing unmanaged Postfix main.cf');
  }
  if (run('ss', ['-H', '-lnt', 'sport = :25']).trim()) throw new Error('SMTP port 25 is already listening; inspect the existing service before changing its configuration');
  let masterSource;
  if (fs.existsSync(masterFile)) regular(masterFile);
  else {
    masterSource = ['/usr/share/postfix/master.cf.dist', '/usr/share/postfix/master.cf'].find(file => fs.existsSync(file));
    if (!masterSource) throw new Error('Vendor master.cf template is missing; inspect /usr/share/postfix before proceeding');
    regular(masterSource);
  }
  for (const file of ['/etc/opendkim.conf', '/etc/aliases', '/etc/postfix/realweb-transport', hook]) {
    try { fs.lstatSync(file); regular(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (fs.existsSync(hook) && !fs.readFileSync(hook, 'utf8').includes(MARKER)) throw new Error('Preserve and inspect an existing certificate reload hook');
  const certificate = new crypto.X509Certificate(fs.readFileSync('/etc/letsencrypt/live/realweb-mail/fullchain.pem'));
  const tlsKey = crypto.createPrivateKey(fs.readFileSync('/etc/letsencrypt/live/realweb-mail/privkey.pem'));
  if (!certificate.checkHost('mail.godaug.fun') || !certificate.checkPrivateKey(tlsKey) || Date.parse(certificate.validTo) <= Date.now()) {
    throw new Error('The SMTP hostname certificate or its matching private key is invalid');
  }

  directory('/var/backups/realweb-mail-config');
  const snapshot = '/var/backups/realweb-mail-config/' + new Date().toISOString().replace(/[:.]/g, '-');
  directory(snapshot);
  for (const file of [mainFile, masterFile, '/etc/opendkim.conf', '/etc/aliases', '/etc/postfix/realweb-transport', hook]) {
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(snapshot, file.slice(1).replaceAll('/', '__')), fs.constants.COPYFILE_EXCL);
  }
  console.log(`Existing mail configuration backed up: ${snapshot}`);

  directory('/etc/opendkim', 0, gid, 0o750);
  directory('/etc/opendkim/keys', 0, gid, 0o750);
  directory('/etc/opendkim/keys/godaug.fun', 0, gid, 0o750);
  if (fs.existsSync(KEY_FILE)) {
    regular(KEY_FILE, [0, uid]);
  } else {
    const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    fs.writeFileSync(KEY_FILE, pair.privateKey.export({ type: 'pkcs1', format: 'pem' }), { flag: 'wx', mode: 0o600 });
  }
  const record = publicDkimRecord(fs.readFileSync(KEY_FILE));
  fs.chownSync(KEY_FILE, uid, gid);
  fs.chmodSync(KEY_FILE, 0o600);
  directory('/run/opendkim', uid, gid, 0o750);
  write('/etc/opendkim.conf', openDkimConfig());
  if (masterSource) write(masterFile, fs.readFileSync(masterSource));
  if (!fs.existsSync('/etc/aliases')) write('/etc/aliases', 'postmaster: root\n');
  write(mainFile, postfixMain(domains));
  const types = run('postconf', ['-m']).trim().split(/\s+/);
  const databaseType = ['hash', 'lmdb', 'cdb'].find(type => types.includes(type));
  if (!databaseType) throw new Error('Postfix needs a supported hash, lmdb or cdb map backend');
  write(mainFile, postfixMain(domains, databaseType));
  write('/etc/postfix/realweb-transport', transportMap(domains));
  run('postmap', [`${databaseType}:/etc/postfix/realweb-transport`]);
  run('newaliases', []);
  const extension = { hash: 'db', lmdb: 'lmdb', cdb: 'cdb' }[databaseType];
  for (const file of [`/etc/postfix/realweb-transport.${extension}`, `/etc/aliases.${extension}`]) fs.chmodSync(file, 0o644);
  run('postfix', ['set-permissions']);
  run('postfix', ['check']);
  run('opendkim', ['-n', '-x', '/etc/opendkim.conf']);
  for (const folder of ['/etc/letsencrypt/renewal-hooks', '/etc/letsencrypt/renewal-hooks/deploy']) {
    if (!fs.existsSync(folder)) directory(folder, 0, 0, 0o755);
    else {
      const stat = fs.lstatSync(folder);
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0) throw new Error(`Inspect an unexpected hook directory: ${folder}`);
    }
  }
  write(hook, fs.readFileSync(path.join(__dirname, 'realweb-mail-renew.sh')), 0o755);
  const publicRecords = `DNSPod TXT records (public values only):\n\nHost: realweb._domainkey\nValue: ${record}\n\nHost: @ (replace the existing SPF record)\nValue: v=spf1 ip4:94.72.124.108 -all\n\nHost: _dmarc\nValue: v=DMARC1; p=none; adkim=r; aspf=r\n`;
  write('/etc/opendkim/realweb-dns.txt', publicRecords);
  run('systemctl', ['daemon-reload']); // Refresh the Debian Postfix instance generator after creating main.cf.
  console.log(`Prepared Postfix and OpenDKIM; map backend: ${databaseType}; temporary-mail domains: ${domains.join(', ')}`);
  console.log('Both configurations passed validation. No mail service was started or restarted.');
  console.log('Public DNS values: /etc/opendkim/realweb-dns.txt. Do not display or share the .private key file.');
}

if (require.main === module) {
  try { main(); } catch (error) {
    // Configuration commands contain no credentials, but do not dump error objects or key material.
    const message = error.stderr ? error.stderr.toString().trim().slice(0, 2000) : error.message;
    console.error(`Mail preparation stopped: ${message}`);
    process.exitCode = 1;
  }
}
