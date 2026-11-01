-- =====================================================
-- 3D E-Book Web : Database Schema (SQLite)
-- 8 tables  (เงื่อนไข: ไม่น้อยกว่า 5 และไม่เกิน 10)
-- ใช้ได้กับ better-sqlite3 (Node.js) หรือ sql.js (รันในเบราว์เซอร์)
-- =====================================================

PRAGMA foreign_keys = ON;

-- 1) ผู้ใช้งาน
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,                -- เก็บแบบ hash (bcrypt) ห้ามเก็บรหัสผ่านตรงๆ
  role          TEXT    NOT NULL DEFAULT 'reader' CHECK (role IN ('reader','admin')),
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) หมวดหมู่หนังสือ
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- 3) หนังสือ
CREATE TABLE IF NOT EXISTS books (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  author       TEXT    NOT NULL,
  description  TEXT,
  cover_color  TEXT    NOT NULL DEFAULT '#3b5bdb',  -- สีปกสำหรับโมเดล 3D
  cover_url    TEXT,                                -- รูปปก (ถ้ามี)
  language     TEXT    NOT NULL DEFAULT 'th',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0,1)),
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) ความสัมพันธ์ หนังสือ <-> หมวดหมู่ (many-to-many)
CREATE TABLE IF NOT EXISTS book_categories (
  book_id     INTEGER NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, category_id)
);

-- 5) หน้าหนังสือ (เนื้อหาที่แสดงตอนพลิกหน้า 3D)
CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  title       TEXT,
  content     TEXT    NOT NULL,                     -- ข้อความ หรือ HTML ของหน้านั้น
  UNIQUE (book_id, page_number)
);

-- 6) รีวิว + ให้คะแนน 1-5 ดาว (1 คน รีวิว 1 เล่มได้ครั้งเดียว)
CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (book_id, user_id)
);

-- 7) ที่คั่นหนังสือ
CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  note        TEXT,
  created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8) ความคืบหน้าการอ่าน (อ่านต่อจากหน้าที่ค้างไว้)
CREATE TABLE IF NOT EXISTS reading_progress (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  last_page  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id)
);

-- ---------- Index เพื่อให้ query เร็วขึ้น ----------
CREATE INDEX IF NOT EXISTS idx_pages_book     ON pages(book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_reviews_book   ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, book_id);

-- ---------- View: สถิติคะแนนของแต่ละเล่ม ----------
CREATE VIEW IF NOT EXISTS book_stats AS
SELECT
  b.id,
  b.title,
  b.author,
  COUNT(r.id)                      AS review_count,
  ROUND(AVG(r.rating), 2)          AS avg_rating,
  (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) AS total_pages
FROM books b
LEFT JOIN reviews r ON r.book_id = b.id
GROUP BY b.id;

-- =====================================================
-- ข้อมูลตัวอย่าง (Seed)
-- =====================================================
INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES
  (1, 'admin',  'admin@example.com',  'REPLACE_WITH_BCRYPT_HASH', 'admin'),
  (2, 'somchai','somchai@example.com','REPLACE_WITH_BCRYPT_HASH', 'reader'),
  (3, 'malee',  'malee@example.com',  'REPLACE_WITH_BCRYPT_HASH', 'reader');

INSERT OR IGNORE INTO categories (id, name, slug) VALUES
  (1, 'ເທັກໂນໂລຢີ',     'technology'),
  (2, 'ນິຍາຍ',           'fiction'),
  (3, 'ພັດທະນາຕົນເອງ',  'self-help');

INSERT OR IGNORE INTO books (id, title, author, description, cover_color) VALUES
  (1, 'ເລີ່ມຕົ້ນຂຽນເວັບ', 'ທີມຜູ້ຂຽນ A', 'ຄູ່ມື HTML CSS JS ສຳລັບຜູ້ເລີ່ມຕົ້ນ', '#3b5bdb'),
  (2, 'ເມືອງໃນໝອກ',       'ທີມຜູ້ຂຽນ B', 'ນິຍາຍແຟນຕາຊີສັ້ນ',                 '#862e9c');

INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (1,1),(2,2);

INSERT OR IGNORE INTO pages (book_id, page_number, title, content) VALUES
  (1, 1, 'ບົດນຳ',          'ຍິນດີຕ້ອນຮັບສູ່ໜັງສືເຫຼັ້ມທຳອິດຂອງທ່ານ'),
  (1, 2, 'HTML ແມ່ນຫຍັງ',  'HTML ແມ່ນໂຄງສ້າງຂອງໜ້າເວັບ ...'),
  (1, 3, 'CSS ເບື້ອງຕົ້ນ',  'CSS ໃຊ້ຕົກແຕ່ງຮູບລັກສະນະຂອງເວັບ ...'),
  (2, 1, 'ບົດທີ 1',        'ໝອກປົກຄຸມເມືອງມາສາມມື້ແລ້ວ ...');

INSERT OR IGNORE INTO reviews (book_id, user_id, rating, comment) VALUES
  (1, 2, 5, 'ອ່ານງ່າຍ ເປີດໜ້າ 3D ງາມຫຼາຍ'),
  (1, 3, 4, 'ເນື້ອຫາດີ ຢາກໃຫ້ມີແບບຝຶກຫັດເພີ່ມ'),
  (2, 2, 4, 'ມ່ວນ');

-- =====================================================
-- ตัวอย่าง Query ที่เว็บจะใช้
-- =====================================================
-- หนังสือยอดนิยม (เรียงตามคะแนนเฉลี่ย):
--   SELECT * FROM book_stats ORDER BY avg_rating DESC, review_count DESC LIMIT 10;
-- ดึงหน้าที่ต้องการแสดง:
--   SELECT page_number, title, content FROM pages WHERE book_id = ? ORDER BY page_number;
-- อ่านต่อจากหน้าที่ค้างไว้:
--   SELECT last_page FROM reading_progress WHERE user_id = ? AND book_id = ?;
-- บันทึกความคืบหน้า (upsert):
--   INSERT INTO reading_progress (user_id, book_id, last_page)
--   VALUES (?, ?, ?)
--   ON CONFLICT(user_id, book_id) DO UPDATE SET last_page = excluded.last_page, updated_at = CURRENT_TIMESTAMP;
