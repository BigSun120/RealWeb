const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseEnv } = require('node:util');
const { validateEnvironment } = require('./check-backend.cjs');

const PROJECT = '/opt/realweb';
const DESTINATION = '/var/backups/realweb-system';
const FILES = [
  'opt/realweb/.env', 'opt/realweb/.env.mongodb',
  'var/lib/realweb/uploads', 'var/lib/realweb/config',
  'opt/realweb/backend/config',
  'etc/nginx/sites-available/realweb',
  'etc/systemd/system/realweb-backend.service'
];
const OPTIONAL_MAIL_FILES = [
  'etc/postfix', 'etc/opendkim', 'etc/opendkim.conf',
  'etc/nginx/sites-available/realweb-mail-acme',
  'etc/letsencrypt/live/realweb-mail', 'etc/letsencrypt/archive/realweb-mail',
  'etc/letsencrypt/renewal/realweb-mail.conf',
  'etc/letsencrypt/renewal-hooks/deploy/realweb-mail'
];

function dumpCommand(env) {
  validateEnvironment(env);
  return {
    command: 'docker',
    args: ['compose', '-f', `${PROJECT}/deploy/mongodb.compose.yml`, 'exec', '-T', 'mongodb',
      'mongodump', '--config=/dev/stdin', '--archive', '--gzip'],
    input: JSON.stringify({ uri: env.MONGODB_URI }) + '\n'
  };
}

function assertPrivate(file, directory = false) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o777) !== (directory ? 0o700 : 0o600) ||
      (directory ? !stat.isDirectory() : !stat.isFile())) {
    throw new Error(`Expected a root-owned private ${directory ? 'directory' : 'file'}: ${file}`);
  }
}

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      timeout: 10 * 60 * 1000, maxBuffer: 2 * 1024 * 1024,
      stdio: ['ignore', 'ignore', 'pipe'], ...options
    });
  } catch (error) {
    // Child stderr and argv may contain configuration details. Print only status.
    throw new Error(`${command} failed (exit ${error.status ?? error.code ?? 'unknown'}); no completed backup was published`);
  }
}

async function checksum(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function main() {
  if (process.platform !== 'linux' || process.getuid() !== 0 || path.resolve(__dirname, '..') !== PROJECT) {
    throw new Error('Run through realweb-backup.service as root on the Linux server');
  }
  process.umask(0o077);
  assertPrivate(DESTINATION, true);
  assertPrivate(`${PROJECT}/.env`);
  assertPrivate(`${PROJECT}/.env.mongodb`);
  const env = parseEnv(fs.readFileSync(`${PROJECT}/.env`, 'utf8'));
  const dump = dumpCommand(env);
  const files = [...FILES, ...OPTIONAL_MAIL_FILES.filter(relative => fs.existsSync('/' + relative))];
  for (const relative of files) fs.accessSync('/' + relative, fs.constants.R_OK);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const partial = path.join(DESTINATION, `.partial-${stamp}`);
  const completed = path.join(DESTINATION, `backup-${stamp}`);
  fs.mkdirSync(partial, { mode: 0o700 });
  const databaseArchive = path.join(partial, 'mongodb.archive.gz');
  const fd = fs.openSync(databaseArchive, 'wx', 0o600);
  try {
    run(dump.command, dump.args, { input: dump.input, stdio: ['pipe', fd, 'pipe'] });
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (fs.statSync(databaseArchive).size === 0) throw new Error('Database archive is empty');
  run('gzip', ['-t', databaseArchive]);
  const filesArchive = path.join(partial, 'files.tar.gz');
  run('tar', ['-czf', filesArchive, '-C', '/', '--', ...files]);
  run('tar', ['-tzf', filesArchive]);

  const archives = [];
  for (const name of ['mongodb.archive.gz', 'files.tar.gz']) {
    const file = path.join(partial, name);
    archives.push({ name, bytes: fs.statSync(file).size, sha256: await checksum(file) });
  }
  const revision = run('git', ['-C', PROJECT, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  const manifest = {
    format: 'realweb-backup-v1', createdAt: new Date().toISOString(), revision,
    database: 'personal_website_prod', archives, filePaths: files,
    consistency: 'Live logical export; database and uploads are not an atomic snapshot.'
  };
  fs.writeFileSync(path.join(partial, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  fs.renameSync(partial, completed);
  console.log(`Backup completed: ${completed}`);
  for (const archive of archives) console.log(`${archive.name}: ${archive.bytes} bytes; SHA-256 recorded in manifest.json`);
  console.log('This backup includes secrets. Copy the complete backup directory to private storage outside this VPS.');
}

if (require.main === module) {
  main().catch(error => {
    console.error(`Backup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { dumpCommand, checksum, run };
