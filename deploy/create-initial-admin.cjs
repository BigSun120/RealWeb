const path = require('node:path');
const readline = require('node:readline');
const { Writable } = require('node:stream');
const { createRequire } = require('node:module');
const { validateEnvironment } = require('./check-backend.cjs');
const backendRequire = createRequire(path.join(__dirname, '../backend/package.json'));

class InputError extends Error {}

function ask(prompt, hidden = false) {
  return new Promise((resolve, reject) => {
    let muted = false;
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      }
    });
    const terminal = readline.createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
    terminal.once('SIGINT', () => {
      terminal.close();
      process.stdout.write('\n');
      reject(new InputError('Cancelled; no administrator was created.'));
    });
    terminal.question(prompt, answer => {
      terminal.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
    muted = hidden;
  });
}

async function ensureNoAdmin(User) {
  if (await User.exists({ $or: [{ isAdmin: true }, { role: 'admin' }] })) {
    throw new InputError('An administrator already exists. Existing accounts were preserved.');
  }
}

async function createInitialAdmin(User, { username, email, password }) {
  username = username.trim();
  email = email.trim().toLowerCase();
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new InputError('Use a password of at least 12 characters and at most 72 UTF-8 bytes.');
  }
  const user = new User({
    username, email, password, displayName: username,
    role: 'admin', isAdmin: true, isActive: true,
    emailVerified: true, emailVerifiedAt: new Date()
  });
  try {
    await user.validate();
  } catch {
    throw new InputError('Invalid username or email. Username: 3-15 letters, digits or underscores; use a valid email address.');
  }
  await ensureNoAdmin(User);
  if (await User.exists({ $or: [{ username }, { email }, { displayName: username }] })) {
    throw new InputError('Username, email or display name is already in use. No existing user was modified.');
  }
  await User.init(); // Enforce unique indexes before insertion.
  await user.save(); // Uses the existing model bcrypt password hook.
  return { username: user.username };
}

async function main() {
  if (process.platform !== 'linux' || process.getuid() !== 0 || !process.stdin.isTTY || !process.stdout.isTTY) {
    throw new InputError('Run interactively as root in the Linux server terminal.');
  }
  validateEnvironment(process.env);
  const mongoose = backendRequire('mongoose');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const User = backendRequire('./src/models/User');
    await ensureNoAdmin(User);
    await User.init(); // Detect index problems before requesting a password.
    console.log('Create the first administrator. Password input is hidden; do not paste passwords into chat.');
    const username = await ask('Username (3-15 letters/digits/underscores): ');
    const email = await ask('Contact email: ');
    const password = await ask('Password (at least 12 characters): ', true);
    const confirmation = await ask('Repeat password: ', true);
    if (password !== confirmation) throw new InputError('Passwords do not match; no administrator was created.');
    const result = await createInitialAdmin(User, { username, email, password });
    console.log(`Initial administrator created: ${result.username}`);
    console.log('Sign in: https://godaug.fun/auth/login');
    console.log('Admin area: https://godaug.fun/admin');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    // Never print database driver details, document values, passwords or tokens.
    console.error(error instanceof InputError ? error.message : `Administrator creation failed: ${error.name} / ${error.code || 'unknown'}`);
    process.exitCode = 1;
  });
}

module.exports = { createInitialAdmin };
