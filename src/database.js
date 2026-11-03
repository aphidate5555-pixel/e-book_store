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
  // Pre-migrate existing tables before running schema.sql seed statements
  const existingTables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name)
  );
  if (existingTables.has('users')) {
    const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((column) => column.name));
    if (!userColumns.has('wishlist_json')) {
      db.exec("ALTER TABLE users ADD COLUMN wishlist_json TEXT NOT NULL DEFAULT '[]'");
    }
  }
  if (existingTables.has('books')) {
    const bookColumns = new Set(db.prepare('PRAGMA table_info(books)').all().map((column) => column.name));
    if (!bookColumns.has('gallery_json')) db.exec("ALTER TABLE books ADD COLUMN gallery_json TEXT NOT NULL DEFAULT '[]'");
    if (!bookColumns.has('product_type')) db.exec("ALTER TABLE books ADD COLUMN product_type TEXT NOT NULL DEFAULT 'ebook' CHECK (product_type IN ('ebook','novel','manga'))");
    if (!bookColumns.has('price')) db.exec('ALTER TABLE books ADD COLUMN price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0)');
    if (!bookColumns.has('stock_qty')) db.exec('ALTER TABLE books ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0)');
    if (!bookColumns.has('is_featured')) db.exec('ALTER TABLE books ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1))');
  }

  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  db.exec(schema);
  db.exec('CREATE INDEX IF NOT EXISTS idx_books_inventory ON books(product_type, stock_qty, is_published)');

  // Ensure categories and rich book covers exist on existing databases
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories(id, name, slug) VALUES (?, ?, ?)');
  [
    [1, 'ເທັກໂນໂລຢີ', 'technology'],
    [2, 'ນິຍາຍ', 'fiction'],
    [3, 'ພັດທະນາຕົນເອງ', 'self-help'],
    [4, 'ສິລະປະ & ວັດທະນະທຳ', 'art-culture'],
    [5, 'ກາຕູນ', 'manga'],
  ].forEach(([id, name, slug]) => insertCat.run(id, name, slug));

  // Upgrade existing seed books 1 & 2 to have custom cover artwork if missing
  db.prepare(`UPDATE books SET cover_url = '/covers/web-craft.svg', cover_color = '#4d746d', gallery_json = '["/covers/web-craft.svg","/covers/r3f-mastery.svg"]', is_featured = 1 WHERE id = 1 AND (cover_url IS NULL OR cover_url = '')`).run();
  db.prepare(`UPDATE books SET cover_url = '/covers/mist-city.svg', cover_color = '#9a8ab8', gallery_json = '["/covers/mist-city.svg","/covers/mekong-moon.svg"]', is_featured = 1 WHERE id = 2 AND (cover_url IS NULL OR cover_url = '')`).run();

  // Ensure accurate category mappings for all 19 shelf volumes
  const seedCategoryMap = [
    [1, 1], [2, 2], [3, 1], [4, 3], [5, 2], [6, 4], [7, 5], [8, 5],
    [9, 4], [10, 2], [11, 1], [12, 3], [13, 4], [14, 2], [15, 5], [16, 5], [17, 2], [18, 4], [19, 3],
  ];
  const deleteBookCats = db.prepare('DELETE FROM book_categories WHERE book_id = ?');
  const insertBookCat = db.prepare('INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)');
  seedCategoryMap.forEach(([bId, cId]) => {
    deleteBookCats.run(bId);
    insertBookCat.run(bId, cId);
  });

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
