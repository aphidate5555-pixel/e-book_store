require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('../src/database');

initializeDatabase();
const username = process.env.ADMIN_USERNAME || 'admin';
const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error('ກະລຸນາກຳນົດ ADMIN_PASSWORD ທີ່ມີຢ່າງໜ້ອຍ 12 ຕົວໃນໄຟລ໌ .env ກ່ອນ');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
const existing = db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(email, username);
if (existing) {
  db.prepare("UPDATE users SET username=?,email=?,password_hash=?,role='admin' WHERE id=?")
    .run(username, email, hash, existing.id);
} else {
  db.prepare("INSERT INTO users(username,email,password_hash,role) VALUES(?,?,?,'admin')")
    .run(username, email, hash);
}
console.log(`Admin ພ້ອມໃຊ້ງານ: ${email}`);
db.close();
