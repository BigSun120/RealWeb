const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');

function missingKeyAppend(content) {
  const env = parseEnv(content);
  if (Object.hasOwn(env, 'AUGMENT_TOKEN_ENCRYPTION_KEY')) {
    if (!env.AUGMENT_TOKEN_ENCRYPTION_KEY.trim()) {
      throw new Error('An empty AUGMENT_TOKEN_ENCRYPTION_KEY exists; inspect it before proceeding');
    }
    return ''; // Never rotate an existing key: stored tokens may depend on it.
  }
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const separator = content.length && !content.endsWith('\n') ? newline : '';
  return `${separator}AUGMENT_TOKEN_ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}${newline}`;
}

function completeEnv(projectDirectory) {
  if (process.platform !== 'linux' || process.getuid() !== 0) {
    throw new Error('Run this configuration update as root on the Linux server');
  }
  const file = path.join(projectDirectory, '.env');
  const fd = fs.openSync(file, fs.constants.O_RDWR | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== 0 || (stat.mode & 0o777) !== 0o600) {
      throw new Error('Expected a regular root-owned .env with mode 600');
    }
    const original = fs.readFileSync(fd);
    const addition = missingKeyAppend(original.toString('utf8'));
    if (!addition) {
      console.log('Existing Augment encryption key preserved; no configuration changed.');
      return;
    }
    // Exclusive backup creation prevents overwriting an earlier recovery copy.
    fs.writeFileSync(`${file}.backup-before-augment`, original, { flag: 'wx', mode: 0o600 });
    fs.appendFileSync(fd, addition);
    fs.fsyncSync(fd);
    console.log('Added the missing Augment encryption key; existing credentials were preserved.');
    console.log('Root-only backup: .env.backup-before-augment. No secret values were printed.');
  } finally {
    fs.closeSync(fd);
  }
}

if (require.main === module) {
  try {
    completeEnv(path.resolve(__dirname, '..'));
  } catch (error) {
    console.error(`Environment update stopped: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { missingKeyAppend, completeEnv };
