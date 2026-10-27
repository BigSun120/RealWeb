const path = require('node:path');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.join(__dirname, '../backend/package.json'));

class ConfigurationError extends Error {}

function validateEnvironment(env) {
  const expected = {
    NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '8000',
    UPLOAD_PATH: '/var/lib/realweb/uploads', BACKUP_DIR: '/var/backups/realweb'
  };
  for (const [key, value] of Object.entries(expected)) {
    if (env[key] !== value) throw new ConfigurationError(`Check ${key} in the production environment`);
  }
  if (!/^[a-f0-9]{128}$/.test(env.JWT_SECRET || '')) {
    throw new ConfigurationError('JWT_SECRET must be a fresh 64-byte hexadecimal secret');
  }
  let uri;
  try { uri = new URL(env.MONGODB_URI); } catch {
    throw new ConfigurationError('Check MONGODB_URI in the production environment');
  }
  if (uri.protocol !== 'mongodb:' || uri.hostname !== '127.0.0.1' ||
      uri.port !== '27017' || uri.pathname !== '/personal_website_prod' ||
      uri.username !== 'realweb_app' || !/^[a-f0-9]{64}$/.test(uri.password) ||
      uri.searchParams.get('authSource') !== 'personal_website_prod') {
    throw new ConfigurationError('MONGODB_URI must use the local application database account');
  }
}

async function checkBackend() {
  validateEnvironment(process.env);
  backendRequire('sharp');
  backendRequire('nodemailer');
  const mongoose = backendRequire('mongoose');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.db.command({ ping: 1 });
    const status = await mongoose.connection.db.command({ connectionStatus: 1 });
    const roles = status.authInfo?.authenticatedUserRoles || [];
    if (!roles.some(role => role.role === 'readWrite' && role.db === 'personal_website_prod')) {
      throw new ConfigurationError('The application database account requires its readWrite role');
    }
    console.log('Backend preflight OK: native dependencies loaded and application database authenticated.');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  checkBackend().catch(error => {
    // Driver errors can contain connection details: do not print their message.
    console.error(error instanceof ConfigurationError
      ? error.message : `Backend preflight failed: ${error.name} / ${error.code || 'unknown'}`);
    process.exitCode = 1;
  });
}

module.exports = { validateEnvironment, checkBackend };
