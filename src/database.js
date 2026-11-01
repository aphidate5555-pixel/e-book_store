const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'library.sqlite'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  db.exec(schema);

  // ແທນ hash ຕົວຢ່າງທີ່ໃຊ້ບໍ່ໄດ້ດ້ວຍ hash ຈິງ. ກຳນົດລະຫັດຜ່ານຜ່ານ ADMIN_PASSWORD.
  const seededAdmin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (seededAdmin) {
    const existing = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(seededAdmin.id);
    if (existing.password_hash === 'REPLACE_WITH_BCRYPT_HASH') {
      if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
        throw new Error('Set a strong ADMIN_PASSWORD (at least 12 characters) in .env before first start.');
      }
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .run(bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12), seededAdmin.id);
    }
  }
}

module.exports = { db, initializeDatabase };
