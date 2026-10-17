import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from '../db.js';
dotenv.config();

const rl = readline.createInterface({ input, output });
try {
  const username = (await rl.question('Admin username: ')).trim();
  const password = await rl.question('Strong admin password (input may be visible): ');
  if (username.length < 3 || password.length < 12) {
    throw new Error('Use a username of at least 3 characters and password of at least 12 characters.');
  }
  const hash = await bcrypt.hash(password, 12);
  await pool.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, "admin")', [username, hash]);
  console.log('Admin user created.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool.end();
}
