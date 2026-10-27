const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const serialize = values => Object.entries(values)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n') + '\n';

function prepareEnv(projectDirectory) {
  const applicationPath = path.join(projectDirectory, '.env');
  const databasePath = path.join(projectDirectory, '.env.mongodb');
  // Refuse to replace credentials, including when only one file already exists.
  for (const file of [applicationPath, databasePath]) {
    if (fs.existsSync(file)) {
      throw new Error(`${path.basename(file)} already exists; preserve it and inspect before proceeding`);
    }
  }

  const databaseName = 'personal_website_prod';
  const applicationUser = 'realweb_app';
  const applicationPassword = crypto.randomBytes(32).toString('hex');
  const databaseEnvironment = {
    MONGO_INITDB_ROOT_USERNAME: 'realweb_root',
    MONGO_INITDB_ROOT_PASSWORD: crypto.randomBytes(32).toString('hex'),
    MONGO_INITDB_DATABASE: databaseName,
    MONGO_APP_USERNAME: applicationUser,
    MONGO_APP_PASSWORD: applicationPassword
  };
  const applicationEnvironment = {
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: '8000',
    MONGODB_URI: `mongodb://${applicationUser}:${applicationPassword}@127.0.0.1:27017/${databaseName}?authSource=${databaseName}`,
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    FRONTEND_URL: 'https://godaug.fun',
    UPLOAD_PATH: '/var/lib/realweb/uploads',
    BACKUP_DIR: '/var/backups/realweb',
    FORCE_ADMIN_PASSWORD_UPDATE: 'false',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '25',
    SMTP_AUTH: 'false',
    EMAIL_FROM: 'noreply@godaug.fun',
    TEMP_SMTP_HOST: '127.0.0.1',
    TEMP_SMTP_PORT: '2500',
    INBUCKET_API: 'http://127.0.0.1:9000/api/v1'
  };

  // 'wx' also prevents overwrites if a file appears after the checks above.
  fs.writeFileSync(databasePath, serialize(databaseEnvironment), { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(applicationPath, serialize(applicationEnvironment), { flag: 'wx', mode: 0o600 });
}

if (require.main === module) {
  try {
    prepareEnv(path.resolve(__dirname, '..'));
    console.log('Created .env and .env.mongodb with new credentials and private permissions.');
    console.log('No services were started. Preserve both files and do not paste their contents.');
    console.log('SMTP values are local placeholders; mail delivery still needs configuration.');
  } catch (error) {
    console.error(`Environment preparation stopped: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { prepareEnv };
