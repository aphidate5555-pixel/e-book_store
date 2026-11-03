-- =====================================================
-- 3D E-Book Web & Bookstore : Database Schema (SQLite)
-- Strictly 10 Application Tables (per project rule <= 10 tables)
-- ใช้ได้กับ better-sqlite3 (Node.js)
-- =====================================================

PRAGMA foreign_keys = ON;

-- 1) ผู้ใช้งาน
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,                -- เก็บแบบ hash (bcrypt) ห้ามเก็บรหัสผ่านตรงๆ
  role          TEXT    NOT NULL DEFAULT 'reader' CHECK (role IN ('reader','admin')),
  wishlist_json TEXT    NOT NULL DEFAULT '[]',   -- รายการหนังสือที่กดหัวใจ (JSON array of book IDs)
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) หมวดหมู่หนังสือ
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- 3) หนังสือและสินค้า (E-Book, นิยาย, มังงะ)
CREATE TABLE IF NOT EXISTS books (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  author       TEXT    NOT NULL,
  description  TEXT,
  cover_color  TEXT    NOT NULL DEFAULT '#3b5bdb',  -- สีปกสำหรับโมเดล 3D
  cover_url    TEXT,                                -- รูปปกความละเอียดสูง
  gallery_json TEXT    NOT NULL DEFAULT '[]',       -- แกลเลอรีรูปภาพสินค้าเพิ่มเติม
  product_type TEXT    NOT NULL DEFAULT 'ebook' CHECK (product_type IN ('ebook','novel','manga')),
  price        INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_qty    INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_featured  INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  language     TEXT    NOT NULL DEFAULT 'lo',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0,1)),
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4) ความสัมพันธ์ หนังสือ <-> หมวดหมู่ (many-to-many)
CREATE TABLE IF NOT EXISTS book_categories (
  book_id     INTEGER NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, category_id)
);

-- 5) หน้าหนังสือ (เนื้อหาที่แสดงตอนพลิกหน้า 3D ทั้ง E-Book เต็มเล่มและหน้าทดลองอ่าน)
CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  title       TEXT,
  content     TEXT    NOT NULL,
  UNIQUE (book_id, page_number)
);

-- 6) รีวิว + ให้คะแนน 1-5 ดาว (1 คน รีวิว 1 เล่มได้ครั้งเดียว หรืออัปเดตรีวิวเดิม)
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

-- 9) คำสั่งซื้อ (ใช้ตาราง books เป็นแคตตาล็อกร่วมกับ e-book)
CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  customer_name  TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address        TEXT NOT NULL,
  total_amount   INTEGER NOT NULL CHECK (total_amount >= 0),
  status         TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','processing','shipped','cancelled')),
  created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10) สินค้าในคำสั่งซื้อพร้อมราคาขณะซื้อ
CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),
  UNIQUE(order_id, book_id)
);

-- ---------- Index เพื่อให้ query เร็วขึ้น ----------
CREATE INDEX IF NOT EXISTS idx_pages_book     ON pages(book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_reviews_book   ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

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
-- ข้อมูลตัวอย่างเริ่มต้น (Seed Data)
-- =====================================================
INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES
  (1, 'admin',  'admin@example.com',  'REPLACE_WITH_BCRYPT_HASH', 'admin'),
  (2, 'somchai','somchai@example.com','REPLACE_WITH_BCRYPT_HASH', 'reader'),
  (3, 'malee',  'malee@example.com',  'REPLACE_WITH_BCRYPT_HASH', 'reader');

INSERT OR IGNORE INTO categories (id, name, slug) VALUES
  (1, 'ເທັກໂນໂລຢີ',     'technology'),
  (2, 'ນິຍາຍ',           'fiction'),
  (3, 'ພັດທະນາຕົນເອງ',  'self-help'),
  (4, 'ສິລະປະ & ວັດທະນະທຳ', 'art-culture'),
  (5, 'ກາຕູນ',          'manga');

INSERT OR IGNORE INTO books (id, title, author, description, cover_color, cover_url, gallery_json, product_type, price, stock_qty, is_featured) VALUES
  (1, 'ເລີ່ມຕົ້ນຂຽນເວັບ', 'ທີມຜູ້ຂຽນ A', 'ປຶ້ມແນະນຳພື້ນຖານການສ້າງເວັບໄຊ ອະທິບາຍເຂົ້າໃຈງ່າຍ ເໝາະສຳລັບຜູ້ທີ່ຢາກເລີ່ມຕົ້ນຮຽນຮູ້ດ້ວຍຕົນເອງ.', '#4d746d', '/covers/web-craft.svg', '["/covers/web-craft.svg","/covers/r3f-mastery.svg"]', 'ebook', 0, 0, 1),
  (2, 'ເມືອງໃນໝອກ', 'ທີມຜູ້ຂຽນ B', 'ເລື່ອງລາວການເດີນທາງໃນເມືອງບູຮານທ່າມກາງສາຍໝອກ ອ່ານເພີນ ແລະ ຊວນໃຫ້ຕິດຕາມຕະຫຼອດທັງເຫຼັ້ມ.', '#9a8ab8', '/covers/mist-city.svg', '["/covers/mist-city.svg","/covers/mekong-moon.svg"]', 'ebook', 0, 0, 1),
  (3, 'ສ້າງໂລກ 3D ດ້ວຍ R3F', 'ທີມພັດທະນາ 3D LAO', 'ແນະນຳການເຮັດພາບ 3 ມິຕິເທິງໜ້າເວັບ ພ້ອມຕົວຢ່າງການຈັດແສງ ແລະ ການເຄື່ອນໄຫວທີ່ນຸ້ມນວນ.', '#162c55', '/covers/r3f-mastery.svg', '["/covers/r3f-mastery.svg","/covers/web-craft.svg"]', 'ebook', 0, 0, 1),
  (4, 'ສິລະປະແຫ່ງສະມາທິ', 'ດຣ. ສົມພອນ ພັດທະນາ', 'ແນວທາງການຝຶກສະຕິ ແລະ ການຈັດລະບຽບຄວາມຄິດ ເພື່ອໃຫ້ເຮັດວຽກ ແລະ ໃຊ້ຊີວິດໄດ້ຢ່າງມີຄວາມສຸກ.', '#bd5a34', '/covers/mindful-art.svg', '["/covers/mindful-art.svg"]', 'ebook', 0, 0, 0),
  (5, 'ຕຳນານແສງຈັນແຄມຂອງ', 'ດວງດາວ ວົງສະຫວັນ', 'ນິຍາຍຮັກ ແລະ ມິດຕະພາບແຄມຝັ່ງແມ່ນ້ຳຂອງ ຖ່າຍທອດບັນຍາກາດວິຖີຊີວິດອັນອົບອຸ່ນ.', '#6f2130', '/covers/mekong-moon.svg', '["/covers/mekong-moon.svg","/covers/luang-prabang.svg"]', 'novel', 350, 18, 1),
  (6, 'ມໍລະດົກຫຼວງພະບາງ', 'ສຸລິຍາ ວັດທະນະທຳ', 'ບັນທຶກຮູບພາບ ແລະ ເລື່ອງລາວຄວາມງົດງາມຂອງວັດວາອາຮາມ ແລະ ຮີດຄອງປະເພນີເມືອງຫຼວງພະບາງ.', '#1c304b', '/covers/luang-prabang.svg', '["/covers/luang-prabang.svg","/covers/mekong-moon.svg"]', 'novel', 490, 12, 0),
  (7, 'ນັກຮົບມັງກອນສາຍຟ້າ Vol.1', 'KENJI & LAO STUDIO', 'ກາຕູນຜະຈົນໄພຂອງນັກດາບໜຸ່ມ ພາບແຕ້ມລະອຽດສວຍງາມ ອ່ານມ່ວນທຸກຕອນ.', '#991b1b', '/covers/thunder-blade.svg', '["/covers/thunder-blade.svg","/covers/cyber-vientiane.svg"]', 'manga', 195, 25, 1),
  (8, 'ນະຄອນໄຊເບີ 2099', 'AKIRA & CYBER ART', 'ເລື່ອງລາວໃນໂລກອະນາຄົດປີ 2099 ທີ່ເຕັມໄປດ້ວຍເທັກໂນໂລຢີລ້ຳສະໄໝ ແລະ ການໄຂປິດສະໜາ.', '#d36e5d', '/covers/cyber-vientiane.svg', '["/covers/cyber-vientiane.svg","/covers/thunder-blade.svg"]', 'manga', 220, 15, 1),
  (9, 'ສິລະປະການຈັດໜ້າ ແລະ ຕົວອັກສອນ', 'ໂຮງພິມວຽງຈັນ', 'ແນະນຳຫຼັກການເລືອກໃຊ້ຟອນຕ໌ ແລະ ການຈັດວາງໜ້າເອກະສານໃຫ້ອ່ານງ່າຍ ແລະ ສະບາຍຕາ.', '#d44c40', '/covers/vol-09.svg', '["/covers/vol-09.svg"]', 'ebook', 0, 0, 1),
  (10, 'ບັນທຶກການເດີນທາງພູພຽງບໍລະເວນ', 'ຄຳພັນ ວົງດາລາ', 'ເລື່ອງເລົ່າຈາກສວນກາເຟ ທຳມະຊາດປ່າໄມ້ ແລະ ວິຖີຊີວິດຜູ້ຄົນເທິງພູພຽງບໍລະເວນ.', '#25282a', '/covers/vol-10.svg', '["/covers/vol-10.svg"]', 'novel', 320, 14, 0),
  (11, 'ພື້ນຖານແສງ ແລະ ເງົາໃນງານກຣາຟິກ', 'ທີມພັດທະນາ 3D LAO', 'ອະທິບາຍຫຼັກການຈັດແສງເງົາເພື່ອໃຫ້ພາບ 3 ມິຕິເບິ່ງມີມິຕິ ແລະ ສົມຈິງຫຼາຍຂຶ້ນ.', '#30639d', '/covers/vol-11.svg', '["/covers/vol-11.svg"]', 'ebook', 0, 0, 0),
  (12, 'ຄວາມງຽບສະຫງົບຍາມເຊົ້າ', 'ດຣ. ສົມພອນ ພັດທະນາ', 'ບົດຄວາມສັ້ນໆ ທີ່ຊວນໃຫ້ຜູ້ອ່ານໄດ້ພັກຜ່ອນຈິດໃຈ ແລະ ເລີ່ມຕົ້ນມື້ໃໝ່ຢ່າງສົດຊື່ນ.', '#262421', '/covers/vol-12.svg', '["/covers/vol-12.svg"]', 'ebook', 0, 0, 1),
  (13, 'ລວດລາຍຜ້າໄໝລ້ານຊ້າງ', 'ຫໍພິພິທະພັນສິລະປະສິ່ງທໍ', 'ລວບລວມປະຫວັດຄວາມເປັນມາ ແລະ ຄວາມໝາຍອັນລ້ຳຄ່າຂອງລວດລາຍຜ້າໄໝບູຮານ.', '#8e2f36', '/covers/vol-13.svg', '["/covers/vol-13.svg"]', 'novel', 450, 10, 1),
  (14, 'ນິທານດວງດາວລ່ອງແມ່ນ້ຳຂອງ', 'ສຸລິຍາ ວັດທະນະທຳ', 'ລວມນິທານພື້ນບ້ານ ແລະ ຄວາມເຊື່ອກ່ຽວກັບດວງດາວຂອງຜູ້ຄົນລ່ອງແມ່ນ້ຳຂອງ.', '#76a9c5', '/covers/vol-14.svg', '["/covers/vol-14.svg"]', 'novel', 290, 16, 0),
  (15, 'ວິຖີແຫ່ງນັກດາບ', 'KENJI & LAO STUDIO', 'ຕອນພິເສດທີ່ເລົ່າເຖິງການຝຶກຝົນຈິດໃຈ ແລະ ມິດຕະພາບຂອງກຸ່ມນັກຮົບໜຸ່ມ.', '#626a49', '/covers/vol-15.svg', '["/covers/vol-15.svg"]', 'manga', 210, 20, 0),
  (16, 'ສະຖາປັດຕະຍະກຳແຫ່ງຄວາມຊົງຈຳ', 'AKIRA & CYBER ART', 'ເລື່ອງລາວຂອງການເກັບຮັກສາຄວາມຊົງຈຳອັນລ້ຳຄ່າໄວ້ໃນໂລກດິຈິຕອນ.', '#1d4fa8', '/covers/vol-16.svg', '["/covers/vol-16.svg"]', 'manga', 230, 14, 0),
  (17, 'ບົດກະວີລະດູຝົນ ວຽງຈັນ', 'ດວງດາວ ວົງສະຫວັນ', 'ລວມບົດກະວີອ່ານສະບາຍ ຖ່າຍທອດກິ່ນອາຍສາຍຝົນ ແລະ ຄວາມຜູກພັນຂອງຜູ້ຄົນ.', '#8f2f45', '/covers/vol-17.svg', '["/covers/vol-17.svg"]', 'novel', 260, 15, 0),
  (18, 'ເຄື່ອງປັ້ນດິນເຜົາລ່ອງຂອງ', 'ສຸລິຍາ ວັດທະນະທຳ', 'ພາໄປຮູ້ຈັກພູມປັນຍາການປັ້ນດິນເຜົາພື້ນບ້ານທີ່ສືບທອດກັນມາຫຼາຍຊົ່ວອາຍຸຄົນ.', '#4c3970', '/covers/vol-18.svg', '["/covers/vol-18.svg"]', 'ebook', 0, 0, 0),
  (19, 'E-bookshop ສະບັບຄົບຊຸດ', 'ຄະນະບັນນາທິການ', 'ລວບລວມຜົນງານຄັດສັນທັງໝົດໃນຊັ້ນໜັງສື ເພື່ອໃຫ້ທ່ານເປີດອ່ານໄດ້ທຸກເວລາ.', '#365943', '/covers/vol-19.svg', '["/covers/vol-19.svg"]', 'ebook', 0, 0, 1);

INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES
  (1, 1), (2, 2), (3, 1), (4, 3), (5, 2), (6, 4), (7, 5), (8, 5),
  (9, 4), (10, 2), (11, 1), (12, 3), (13, 4), (14, 2), (15, 5), (16, 5), (17, 2), (18, 4), (19, 3);

INSERT OR IGNORE INTO pages (book_id, page_number, title, content) VALUES
  (1, 1, 'ບົດນຳ: ຍຸກໃໝ່ຂອງເວັບ 3D', 'ຍິນດີຕ້ອນຮັບສູ່ໜັງສື "ເລີ່ມຕົ້ນຂຽນເວັບ".\n\nໃນປັດຈຸບັນ ເວັບໄຊບໍ່ໄດ້ເປັນພຽງໜ້າເອກະສານທຳມະດາອີກຕໍ່ໄປ ແຕ່ສາມາດສ້າງປະສົບການ 3 ມິຕິ (WebGL / Three.js) ທີ່ລື່ນໄຫຼ ແລະ ຕອບສະໜອງກັບຜູ້ໃຊ້ໄດ້ທັນທີ.'),
  (1, 2, 'HTML5 & Semantic Craft', 'HTML5 ແມ່ນໂຄງສ້າງຫຼັກຂອງໜ້າເວັບ.\n\nການໃຊ້ແທັກທີ່ມີຄວາມໝາຍ ເຊັ່ນ <header>, <main>, <article>, ແລະ <dialog> ຊ່ວຍໃຫ້ທັງຜູ້ໃຊ້ງານ ແລະ Screen Reader ເຂົ້າໃຈໂຄງສ້າງເວັບໄຊໄດ້ຢ່າງຊັດເຈນ.'),
  (1, 3, 'Modern CSS & 3D Perspective', 'CSS ຍຸກໃໝ່ມາພ້ອມກັບ Custom Properties (--tokens), Grid Layout ແລະ 3D Transforms.\n\nເຮົາສາມາດໃຊ້ perspective ແລະ transform-style: preserve-3d ເພື່ອສ້າງສັນປຶ້ມ ແລະ ການພິກໜ້າທີ່ສົມຈິງ.'),
  (1, 4, 'JavaScript ES Modules', 'ດ້ວຍ ES Modules (import / export) ເຮົາສາມາດໂຫຼດ Three.js ຜ່ານ importmap ແລະ ຄວບຄຸມ Scene 3D ໄດ້ຢ່າງວ່ອງໄວ.'),
  (2, 1, 'ບົດທີ 1: ໝອກສີເງິນ', 'ໝອກປົກຄຸມເມືອງບູຮານມາສາມມື້ແລ້ວ...\n\nສຽງລະຄັງຈາກຫໍຄອຍກາງເມືອງດັງກັງວານຜ່ານມ່ານໝອກ ທຸກຄົນໃນໝູ່ບ້ານຕ່າງຮູ້ດີວ່າ ເມື່ອໃດທີ່ດວງຈັນປ່ຽນເປັນສີທອງ ປະຕູສູ່ໂລກເບື້ອງຫຼັງຈະເປີດອອກ.'),
  (2, 2, 'ບົດທີ 2: ກະແຈແຫ່ງຫໍສະໝຸດ', 'ຄຳພີບູຮານທີ່ຖືກເກັບຮັກສາໄວ້ໃນຫໍສະໝຸດຊັ້ນໃຕ້ດິນ ເລີ່ມເປັ່ງແສງອອກມາເມື່ອລິນດາຍ່າງເຂົ້າໄປໃກ້ ຕົວອັກສອນລอยຂຶ້ນເໜືອໜ້າເຈ້ຍຄືກັບມີຊີວິດ.'),
  (2, 3, 'ບົດທີ 3: ການເດີນທາງເລີ່ມຕົ້ນ', 'ລົມໜາວພັດຜ່ານຍອດໄມ້ ພາເອົາກິ່ນຫອມຂອງດອກໄມ້ປ່າທີ່ບໍ່ເຄີຍມີໃຜເຫັນມາກ່ອນ ນີ້ຄືຈຸດເລີ່ມຕົ້ນຂອງການຜະຈົນໄພຄັ້ງຍິ່ງໃຫຍ່.'),
  (3, 1, 'ບົດທີ 1: ແນວຄິດ React Three Fiber', 'React Three Fiber (R3F) ຊ່ວຍໃຫ້ເຮົາຈັດການ Scene Graph ຂອງ Three.js ແບບ Declarative.\n\nການແຍກ Mesh, Material (PBR), ແລະ Lighting ອອກເປັນສ່ວນໆ ຊ່ວຍໃຫ້ໂຄ້ດສະອາດ ແລະ ບຳລຸງຮັກສາງ່າຍ.'),
  (3, 2, 'ບົດທີ 2: PBR Materials & Lighting', 'ການເຮັດໃຫ້ປົກໜັງສື 3D ເບິ່ງສົມຈິງ ຕ້ອງໃຊ້ MeshStandardMaterial ຫຼື MeshPhysicalMaterial ຄູ່ກັບ Key Light ໂທນອົບອຸ່ນ ແລະ Rim Light ເພື່ອເນັ້ນຂອບສັນປຶ້ມ.'),
  (3, 3, 'ບົດທີ 3: Smooth Damping 60fps', 'ແທນທີ່ຈະປ່ຽນຄ່າມຸມໝູນທັນທີ ເຮົາໃຊ້ MathUtils.lerp ໃນ Render Loop ເພື່ອໃຫ້ການລາກເມົາສ໌ໝູນປຶ້ມ 3D ມີຄວາມນຸ້ມນວນຄືກັບວັດຖຸຈິງ.'),
  (4, 1, 'ບົດທີ 1: ລົມຫາຍໃຈ ແລະ ປັດຈຸບັນ', 'ໃນໂລກທີ່ໝູນໄວດ້ວຍຂໍ້ມູນຂ່າວສານ ການກັບມາຮັບຮູ້ລົມຫາຍໃຈພຽງ 3 ນາທີ ຄືຈຸດເລີ່ມຕົ້ນຂອງສະມາທິ ແລະ ຄວາມຄິດສ້າງສັນອັນຊົງພະລັງ.'),
  (4, 2, 'ບົດທີ 2: Deep Work ຄືຫຍັງ?', 'ການເຮັດວຽກຢ່າງເລິກເຊິ່ງໂດຍປາສະຈາກສິ່ງລົບກວນ ຊ່ວຍໃຫ້ສະໝອງສ້າງຜົນງານລະດັບ Masterpiece ໃນເວລາທີ່ສັ້ນລົງ.'),
  (5, 1, 'ຕົວຢ່າງທົດລອງອ່ານ: ຄືນເດືອນເພັງ', 'ແສງຈັນສ່ອງລົງມາເທິງຜິວນ້ຳຂອງເປັນປະກາຍສີທອງ...\n\n(ນີ້ແມ່ນໜ້າທົດລອງອ່ານສຳລັບນິຍາຍເຫຼັ້ມຈິງ ທ່ານສາມາດກົດສັ່ງຊື້ເພື່ອຮັບໜັງສືປົກແຂງສະບັບເຕັມໄດ້ທັນທີ)'),
  (5, 2, 'ຕົວຢ່າງທົດລອງອ່ານ: ສັນຍາແຄມຝັ່ງ', 'ສຽງແຄນລ່ອງລອຍມາຕາມສາຍລົມ ຄືກັບຄຳໝັ້ນສັນຍາທີ່ບໍ່ເຄີຍຈາງຫາຍໄປຕາມການເວລາ.'),
  (6, 1, 'ຕົວຢ່າງທົດລອງອ່ານ: ນະຄອນແຫ່ງວັດວາ', 'ຫຼວງພະບາງ ຍາມເຊົ້າທີ່ງຽບສະຫງົບ ຂະບວນໃສ່ບາດເຂົ້າໜຽວຮ້ອນໆ ຄືວິຖີຊີວິດທີ່ສືບທອດກັນມາຫຼາຍຮ້ອຍປີ.'),
  (7, 1, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ມັງກອນຕື່ນ', '⚡ ຟ້າຜ່າລົງກາງຫຸບເຂົາ! ດາບບູຮານທີ່ຖືກຜະນຶກໄວ້ເລີ່ມສັ່ນສະເທືອນ ພະລັງສາຍຟ້າສີຄາມພຸ່ງຂຶ້ນສູ່ທ້ອງຟ້າ!'),
  (7, 2, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 2 ການປະທະຄັ້ງທຳອິດ', '⚔️ "ຖ້າເຈົ້າຢາກປົກປ້ອງໝູ່ບ້ານນີ້ ຈົ່ງຍົກດາບຂຶ້ນມາ!" ການຜະຈົນໄພຂອງນັກຮົບມັງກອນສາຍຟ້າເລີ່ມຂຶ້ນແລ້ວ!'),
  (8, 1, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ລະຫັດລັບ 2099', '🌐 ປີ 2099 ນະຄອນວຽງຈັນເຕັມໄປດ້ວຍຕຶກລະຟ້າ ແລະ ໂຮໂລແກຣມ 3 ມິຕິ... ແຕ່ໃນເງົາມືດ ລະບົບ AI ກາງກຳລັງຖືກເຈາະລະບົບ!'),
  (9, 1, 'ບົດທີ 1: ຈັງຫວະຂອງຕົວອັກສອນ', 'ການຈັດໜ້າໜັງສືທີ່ດີ ເລີ່ມຕົ້ນຈາກການເລືອກຂະໜາດຟອນຕ໌ ແລະ ໄລຍະຫ່າງລະຫວ່າງແຖວທີ່ພໍດີ ເພື່ອໃຫ້ຜູ້ອ່ານຮູ້ສຶກຜ່ອນຄາຍຕະຫຼອດການອ່ານ.'),
  (9, 2, 'ບົດທີ 2: ພື້ນທີ່ວ່າງເທິງໜ້າເຈ້ຍ', 'ຂອບກະດາດສີຄຣີມ ແລະ ພື້ນທີ່ວ່າງອ້ອມຂໍ້ຄວາມ ຊ່ວຍໃຫ້ສາຍຕາພັກຜ່ອນ ແລະ ເຮັດໃຫ້ເນື້ອຫາໂດດເດັ່ນຂຶ້ນຢ່າງເປັນທຳມະຊາດ.'),
  (10, 1, 'ບົດທີ 1: ສາຍໝອກເທິງພູພຽງ', 'ຍາມເຊົ້າເທິງພູພຽງບໍລະເວນ ອາກາດເຢັນສະບາຍ ກິ່ນຫອມຂອງດອກກາເຟສົດລ່ອງລອຍມາຕາມສາຍລົມ ພ້ອມສຽງນ້ຳຕົກຕາດທີ່ດັງກັງວານຢູ່ໄກໆ.'),
  (10, 2, 'ບົດທີ 2: ວິຖີຄົນຮັກກາເຟ', 'ທຸກເມັດກາເຟຜ່ານການດູແລດ້ວຍຄວາມຕັ້ງໃຈ ຕັ້ງແຕ່ການປູກ ການເກັບກ່ຽວ ຈົນເຖິງຈອກກາເຟອຸ່ນໆ ໃນມືຂອງຜູ້ອ່ານ.'),
  (11, 1, 'ບົດທີ 1: ແສງຫຼັກ ແລະ ແສງເສີມ', 'ໃນງານກຣາຟິກ 3 ມິຕິ ແສງຫຼັກ (Key Light) ຊ່ວຍກຳນົດທິດທາງຂອງເງົາ ສ່ວນແສງເສີມ (Fill Light) ຊ່ວຍໃຫ້ລາຍລະອຽດໃນມຸມມືດຍັງຄົງເບິ່ງເຫັນໄດ້ຢ່າງນຸ້ມນວນ.'),
  (11, 2, 'ບົດທີ 2: ຜິວສຳຜັດຂອງວັດສະດຸ', 'ຄວາມຫຍາບລະອຽດຂອງຜິວຜ້າ ແລະ ກະດາດ ຈະສະທ້ອນແສງແຕກຕ່າງກັນ ເຮັດໃຫ້ປຶ້ມ 3 ມິຕິເບິ່ງຄືກັບຈັບຕ້ອງໄດ້ແທ້.'),
  (12, 1, 'ບົດທີ 1: ຕື່ນຮູ້ກັບຍາມເຊົ້າ', 'ກ່ອນເລີ່ມຕົ້ນວຽກງານໃນແຕ່ລະວັນ ລອງໃຊ້ເວລາ 5 ນາທີ ນັ່ງຈິບນ້ຳອຸ່ນ ແລະ ຟັງສຽງທຳມະຊາດອ້ອມຂ້າງ ເພື່ອຈັດລະບຽບຄວາມຄິດຢ່າງສະຫງົບ.'),
  (12, 2, 'ບົດທີ 2: ຄວາມສຸກຈາກສິ່ງເລັກນ້ອຍ', 'ແສງແດດອ່ອນໆ ທີ່ສ່ອງຜ່ານປ່ອງຢ້ຽມ ແລະ ປຶ້ມດີໆ ຈັກເຫຼັ້ມ ຄືຂອງຂວັນທີ່ລຽບງ່າຍແຕ່ມີຄຸນຄ່າໃນທຸກໆ ມື້.'),
  (13, 1, 'ບົດທີ 1: ສິລະປະເທິງຜືນຜ້າໄໝ', 'ລວດລາຍນາກ ແລະ ດອກຈຳປາເທິງຜືນຜ້າໄໝລ້ານຊ້າງ ສະທ້ອນເຖິງຄວາມເຊື່ອ ຄວາມອຸດົມສົມບູນ ແລະ ຝີມືອັນປານີດຂອງຊ່າງທໍຜ້າ.'),
  (13, 2, 'ບົດທີ 2: ການສືບທອດພູມປັນຍາ', 'ຈາກການຍ້ອມສີທຳມະຊາດສູ່ກີ່ທໍຜ້າໄມ້ ທຸກຂັ້ນຕອນລ້ວນເຕັມໄປດ້ວຍຄວາມອົດທົນ ແລະ ຄວາມຮັກໃນສິລະປະວັດທະນະທຳ.'),
  (14, 1, 'ບົດທີ 1: ດາວເໜືອເທິງຟ້າກວ້າງ', 'ຄືນເດືອນມືດແຄມຝັ່ງຂອງ ຜູ້ເຖົ້າຜູ້ແກ່ມັກເລົ່ານິທານກ່ຽວກັບກຸ່ມດາວທີ່ຄອຍບອກລະດູການ ແລະ ນຳທາງເຮືອຫາປາໃຫ້ກັບບ້ານຢ່າງປອດໄພ.'),
  (14, 2, 'ບົດທີ 2: ນິທານກ່ອນນອນ', 'ເລື່ອງເລົ່າຈາກຮຸ່ນສູ່ຮຸ່ນ ຊ່ວຍຖັກທໍສາຍໄຍຄວາມອົບອຸ່ນໃນຄອບຄົວ ແລະ ປູກຝັງຈິນຕະນາການໃຫ້ກັບເດັກນ້ອຍ.'),
  (15, 1, 'ຕອນທີ 1: ການຝຶກກາງສາຍຝົນ', 'ທ່າມກາງສາຍຝົນທີ່ຕົກລົງມາຢ່າງໜັກ ນັກດາບໜຸ່ມຍັງຄົງຝຶກຈັງຫວະກ້າວຍ່າງຢ່າງໝັ້ນຄົງ ເພາະຄວາມແຂງແກ່ນເລີ່ມຈາກຄວາມພະຍາຍາມ.'),
  (15, 2, 'ຕອນທີ 2: ຄຳສັນຍາຂອງໝູ່ເພື່ອນ', 'ບໍ່ວ່າເສັ້ນທາງຂ້າງໜ້າຈະຍາກລຳບາກພຽງໃດ ມິດຕະພາບ ແລະ ຄວາມໄວ້ວາງໃຈຈະພາທຸກຄົນກ້າວຜ່ານອຸປະສັກໄປນຳກັນ.'),
  (16, 1, 'ຕອນທີ 1: ຫໍຈົດໝາຍເຫດດິຈິຕອນ', 'ໃນໂລກອະນາຄົດ ຄວາມຊົງຈຳທຸກຢ່າງຖືກຈັດເກັບໄວ້ເປັນໂຄງສ້າງສະຖາປັດຕະຍະກຳແສງ ທີ່ຜູ້ຄົນສາມາດຍ່າງເຂົ້າໄປຢ້ຽມຊົມອະດີດໄດ້.'),
  (16, 2, 'ຕອນທີ 2: ຄຸນຄ່າຂອງຄວາມຮູ້ສຶກແທ້', 'ເຖິງແມ່ນເທັກໂນໂລຢີຈະກ້າວໜ້າພຽງໃດ ແຕ່ຄວາມອົບອຸ່ນຂອງຮອຍຍິ້ມ ແລະ ຄວາມຈິງໃຈກໍຍັງເປັນສິ່ງທີ່ລ້ຳຄ່າທີ່ສຸດສະເໝີ.'),
  (17, 1, 'ບົດກະວີທີ 1: ຝົນແຮກຂອງລະດູ', 'ສຽງຝົນຕົກລິນລົງເທິງໃບບົວ ກິ່ນດິນຊຸ່ມນ້ຳຫອມກຸ່ນ ຊວນໃຫ້ຄິດຮອດວັນເວລາທີ່ແສນອົບອຸ່ນໃນນະຄອນຫຼວງວຽງຈັນ.'),
  (17, 2, 'ບົດກະວີທີ 2: ຮົ່ມຄັນດຽວກັນ', 'ຍ່າງຄຽງຂ້າງກັນໄປຕາມທາງຍ່າງແຄມຂອງ ຟັງສຽງສາຍຝົນເປັນບົດເພງແຫ່ງມິດຕະພາບທີ່ບໍ່ເຄີຍຈາງຫາຍ.'),
  (18, 1, 'ບົດທີ 1: ດິນໜຽວແຄມຝັ່ງນ້ຳ', 'ດິນໜຽວເນື້ອລະອຽດຈາກແຄມຝັ່ງແມ່ນ້ຳຂອງ ເມື່ອຜ່ານການນວດ ແລະ ຂຶ້ນຮູບເທິງແປ້ນໝູນ ກໍກາຍເປັນພາຊະນະທີ່ທັງງົດງາມ ແລະ ໃຊ້ງານໄດ້ດີ.'),
  (18, 2, 'ບົດທີ 2: ລວດລາຍຈາກທຳມະຊາດ', 'ຮອຍເຊືອກ ແລະ ລາຍກີບບົວທີ່ປະທັບລົງເທິງເຄື່ອງປັ້ນດິນເຜົາ ຄືເອກະລັກສະເພາະຕົວຂອງຊ່າງຫັດຖະກຳພື້ນບ້ານ.'),
  (19, 1, 'ບົດທີ 1: ຍິນດີຕ້ອນຮັບສູ່ E-bookshop', 'E-bookshop ລວບລວມໜັງສືອີເລັກໂຕນິກ ນິຍາຍ ແລະ ກາຕູນຄຸນນະພາບທັງ 19 ເຫຼັ້ມໄວ້ໃນຊັ້ນໜັງສື 3 ມິຕິ ເພື່ອໃຫ້ທ່ານເລືອກອ່ານໄດ້ທຸກເວລາ.'),
  (19, 2, 'ບົດທີ 2: ການອ່ານຄືການເດີນທາງ', 'ຂໍຂອບໃຈຜູ້ອ່ານທຸກທ່ານທີ່ຮ່ວມເດີນທາງໄປກັບໂລກແຫ່ງຕົວອັກສອນ ຂໍໃຫ້ທຸກໜ້າກະດາດມອບທັງຄວາມຮູ້ ແລະ ຄວາມສຸກໃຫ້ກັບທ່ານສະເໝີ.');

INSERT OR IGNORE INTO reviews (book_id, user_id, rating, comment) VALUES
  (1, 2, 5, 'ອ່ານງ່າຍ ເປີດໜ້າ 3D ງາມຫຼາຍ ໂຄ້ດຕົວຢ່າງຊັດເຈນ!'),
  (1, 3, 5, 'ເນື້ອຫາດີຫຼາຍ ປົກ 3D ໝູນໄດ້ລື່ນໄຫຼສຸດໆ'),
  (2, 2, 5, 'ບັນຍາກາດລຶກລັບ ໜ້າຕິດຕາມທຸກບົດເລີຍ'),
  (3, 3, 5, 'ສອນ React Three Fiber ກັບ Three.js ໄດ້ເຂົ້າໃຈງ່າຍຫຼາຍ'),
  (5, 2, 5, 'ສັ່ງຊື້ເຫຼັ້ມຈິງມາແລ້ວ ປົກງາມຄືໃນຮູບເລີຍ'),
  (7, 3, 5, 'ພາບປົກມັງງະງາມຫຼາຍ ລໍຖ້າເຫຼັ້ມ 2 ເລີຍ!'),
  (9, 2, 5, 'ອະທິບາຍການຈັດໜ້າ ແລະ ຟອນຕ໌ໄດ້ລະອຽດ ອ່ານສະບາຍຕາຫຼາຍ'),
  (12, 3, 5, 'ອ່ານຕອນເຊົ້າແລ້ວຮູ້ສຶກສະຫງົບ ແລະ ມີພະລັງໃນການເຮັດວຽກ'),
  (13, 2, 5, 'ຮູບລວດລາຍຜ້າໄໝລ້ານຊ້າງງົດງາມ ແລະ ມີຄຸນຄ່າຫຼາຍ'),
  (19, 3, 5, 'ຊັ້ນໜັງສື 19 ເຫຼັ້ມຄົບຊຸດ ເລືອກອ່ານງ່າຍທຸກເວລາເລີຍ!');
