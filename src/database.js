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

  // Migrate existing libraries in place; no user reading data is removed.
  const bookColumns = new Set(db.prepare('PRAGMA table_info(books)').all().map((column) => column.name));
  if (!bookColumns.has('gallery_json')) db.exec("ALTER TABLE books ADD COLUMN gallery_json TEXT NOT NULL DEFAULT '[]'");
  if (!bookColumns.has('product_type')) db.exec("ALTER TABLE books ADD COLUMN product_type TEXT NOT NULL DEFAULT 'ebook' CHECK (product_type IN ('ebook','novel','manga'))");
  if (!bookColumns.has('price')) db.exec('ALTER TABLE books ADD COLUMN price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0)');
  if (!bookColumns.has('stock_qty')) db.exec('ALTER TABLE books ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_inventory ON books(product_type, stock_qty, is_published)');
  db.prepare("INSERT OR IGNORE INTO categories(name,slug) VALUES(?,?),(?,?)")
    .run('ນິຍາຍ', 'novel', 'ກາຕູນ', 'manga');

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
