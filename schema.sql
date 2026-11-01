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
  (1, 'ເລີ່ມຕົ້ນຂຽນເວັບ', 'ທີມຜູ້ຂຽນ A', 'ຄູ່ມື HTML5, CSS3, Modern JavaScript ແລະ WebGL 3D ສຳລັບຜູ້ເລີ່ມຕົ້ນຈົນເຖິງລະດັບມືອາຊີບ ອ່ານຟຣີພ້ອມຕົວຢ່າງໂຄ້ດ.', '#1e3a8a', '/covers/web-craft.svg', '["/covers/web-craft.svg","/covers/r3f-mastery.svg"]', 'ebook', 0, 0, 1),
  (2, 'ເມືອງໃນໝອກ', 'ທີມຜູ້ຂຽນ B', 'ນິຍາຍແຟນຕາຊີລຶກລັບແຫ່ງຫຸບເຂົາເໜືອ ເມື່ອໝອກສີເງິນປົກຄຸມເມືອງບູຮານ ແລະ ຄວາມລັບທີ່ຖືກซ່ອນໄວ້ກວ່າພັນປີກຳລັງຕື່ນຂຶ້ນ.', '#3b1d5e', '/covers/mist-city.svg', '["/covers/mist-city.svg","/covers/mekong-moon.svg"]', 'ebook', 0, 0, 1),
  (3, 'ສ້າງໂລກ 3D ດ້ວຍ R3F', 'ທີມພັດທະນາ 3D LAO', 'เจาะลึกการสร้างกราฟิก 3D บนเว็บไซต์ด้วยแนวคิด React Three Fiber, Three.js Shaders, การจัดแสง PBR และอนิเมชัน 60fps.', '#1b4332', '/covers/r3f-mastery.svg', '["/covers/r3f-mastery.svg","/covers/web-craft.svg"]', 'ebook', 0, 0, 1),
  (4, 'ສິລະປະແຫ່ງສະມາທິ', 'ດຣ. ສົມພອນ ພັດທະນາ', 'ປ່ຽນຊີວິດ ແລະ ການເຮັດວຽກດ້ວຍສະຕິ ຝຶກໂຟກັສຢ່າງເລິກເຊິ່ງ (Deep Work & Mindfulness) ເພື່ອຄວາມສຸກທີ່ຍືນຍົງ.', '#266653', '/covers/mindful-art.svg', '["/covers/mindful-art.svg"]', 'ebook', 0, 0, 0),
  (5, 'ຕຳນານແສງຈັນແຄມຂອງ', 'ດວງດາວ ວົງສະຫວັນ', 'ນິຍາຍຮັກ ແລະ ມິດຕະພາບແຫ່ງສາຍນ້ຳລ້ານຊ້າງ ສະບັບພິມປົກແຂງ (Collector Edition) ພ້ອມທີ່ຄັ່ນໜັງສືລາຍທອງ.', '#115e59', '/covers/mekong-moon.svg', '["/covers/mekong-moon.svg","/covers/luang-prabang.svg"]', 'novel', 350, 18, 1),
  (6, 'ມໍລະດົກຫຼວງພະບາງ', 'ສຸລິຍາ ວັດທະນະທຳ', 'ບັນທຶກສິລະປະ ສະຖາປັດຕະຍະກຳ ແລະ ວັດວາອາຮາມອັນລ້ຳຄ່າແຫ່ງເມືອງມໍລະດົກໂລກ ພິມ 4 ສີທັງເຫຼັ້ມ.', '#44372b', '/covers/luang-prabang.svg', '["/covers/luang-prabang.svg","/covers/mekong-moon.svg"]', 'novel', 490, 12, 0),
  (7, 'ນັກຮົບມັງກອນສາຍຟ້າ Vol.1', 'KENJI & LAO STUDIO', 'ກາຕູນມັງງະແອັກຊັນຜະຈົນໄພ ພາບສີຄົມຊັດ ເລື່ອງລາວຂອງນັກດາບໜຸ່ມຜູ້ຄອບຄອງພະລັງມັງກອນສາຍຟ້າ.', '#991b1b', '/covers/thunder-blade.svg', '["/covers/thunder-blade.svg","/covers/cyber-vientiane.svg"]', 'manga', 195, 25, 1),
  (8, 'ນະຄອນໄຊເບີ 2099', 'AKIRA & CYBER ART', 'ມັງງະ Sci-Fi Cyberpunk ການຕໍ່ສູ້ຂອງແຮັກເກີໜຸ່ມໃນໂລກອະນາຄົດທີ່ເຕັມໄປດ້ວຍແສງນີອອນ ແລະ AI.', '#1e1b4b', '/covers/cyber-vientiane.svg', '["/covers/cyber-vientiane.svg","/covers/thunder-blade.svg"]', 'manga', 220, 15, 1);

INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES
  (1, 1), (2, 2), (3, 1), (4, 3), (5, 2), (6, 4), (7, 5), (8, 5);

INSERT OR IGNORE INTO pages (book_id, page_number, title, content) VALUES
  (1, 1, 'ບົດນຳ: ຍຸກໃໝ່ຂອງເວັບ 3D', 'ຍິນດີຕ້ອນຮັບສູ່ໜັງສື "ເລີ່ມຕົ້ນຂຽນເວັບ".\n\nໃນປັດຈຸບັນ ເວັບໄຊບໍ່ໄດ້ເປັນພຽງໜ້າເອກະສານທຳມະດາອີກຕໍ່ໄປ ແຕ່ສາມາດສ້າງປະສົບການ 3 ມິຕິ (WebGL / Three.js) ທີ່ລື່ນໄຫຼ ແລະ ຕອບສະໜອງກັບຜູ້ໃຊ້ໄດ້ທັນທີ.'),
  (1, 2, 'HTML5 & Semantic Craft', 'HTML5 ແມ່ນໂຄງສ້າງຫຼັກຂອງໜ້າເວັບ.\n\nການໃຊ້ແທັກທີ່ມີຄວາມໝາຍ ເຊັ່ນ <header>, <main>, <article>, ແລະ <dialog> ຊ່ວຍໃຫ້ທັງຜູ້ໃຊ້ງານ ແລະ Screen Reader ເຂົ້າໃຈໂຄງສ້າງເວັບໄຊໄດ້ຢ່າງຊັດເຈນ.'),
  (1, 3, 'Modern CSS & 3D Perspective', 'CSS ຍຸກໃໝ່ມາພ້ອມກັບ Custom Properties (--tokens), Grid Layout ແລະ 3D Transforms.\n\nເຮົາສາມາດໃຊ້ perspective ແລະ transform-style: preserve-3d ເພື່ອສ້າງສັນປຶ້ມ ແລະ ການພິກໜ້າທີ່ສົມຈິງ.'),
  (1, 4, 'JavaScript ES Modules', 'ດ້ວຍ ES Modules (import / export) ໂດຍບໍ່ຕ້ອງพึ่งพา Bundler ທີ່ຊັບຊ້ອນ ເຮົາສາມາດໂຫຼດ Three.js ຜ່ານ importmap ແລະ ຄວບຄຸມ Scene 3D ໄດ້ຢ່າງວ່ອງໄວ.'),
  (2, 1, 'ບົດທີ 1: ໝອກສີເງິນ', 'ໝອກປົກຄຸມເມືອງບູຮານມາສາມມື້ແລ້ວ...\n\nສຽງລະຄັງຈາກຫໍຄອຍກາງເມືອງດັງກັງວານຜ່ານມ່ານໝອກ ທຸກຄົນໃນໝູ່ບ້ານຕ່າງຮູ້ດີວ່າ ເມື່ອໃດທີ່ດວງຈັນປ່ຽນເປັນສີທອງ ປະຕູສູ່ໂລກເບື້ອງຫຼັງຈະເປີດອອກ.'),
  (2, 2, 'ບົດທີ 2: ກະແຈແຫ່ງຫໍສະໝຸດ', 'ຄຳພີບູຮານທີ່ຖືກເກັບຮັກສາໄວ້ໃນຫໍສະໝຸດຊັ້ນໃຕ້ດິນ ເລີ່ມเปล่งແສງອອກມາເມື່ອລິນດາຍ່າງເຂົ້າໄປໃກ້ ຕົວອັກສອນລอยຂຶ້ນເหนືອໜ້າເຈ້ຍຄືກັບມີຊີວິດ.'),
  (2, 3, 'ບົດທີ 3: ການເດີນທາງເລີ່ມຕົ້ນ', 'ລົມໜາວພັດຜ່ານຍອດໄມ້ ພາເອົາກິ່ນຫອມຂອງດອກໄມ້ປ່າທີ່ບໍ່ເຄີຍມີໃຜເຫັນມາກ່ອນ ນີ້ຄືຈຸດເລີ່ມຕົ້ນຂອງການຜະຈົນໄພຄັ້ງຍິ່ງໃຫຍ່.'),
  (3, 1, 'ບົດທີ 1: ແນວຄິດ React Three Fiber', 'React Three Fiber (R3F) ຊ່ວຍໃຫ້ເຮົາຈັດການ Scene Graph ຂອງ Three.js ແບບ Declarative.\n\nການແຍກ Mesh, Material (PBR), ແລະ Lighting ອອກເປັນສ່ວນໆ ຊ່ວຍໃຫ້ໂຄ້ດສະອາດ ແລະ ບຳລຸງຮັກສາງ່າຍ.'),
  (3, 2, 'ບົດທີ 2: PBR Materials & Lighting', 'ການເຮັດໃຫ້ປົກໜັງສື 3D ເບິ່ງສົມຈິງ ຕ້ອງໃຊ້ MeshStandardMaterial ຫຼື MeshPhysicalMaterial ຄູ່ກັບ Key Light ໂທນອົບອຸ່ນ ແລະ Rim Light ເພື່ອເນັ້ນຂອບສັນປຶ້ມ.'),
  (3, 3, 'ບົດທີ 3: Smooth Damping 60fps', 'ແທນທີ່ຈະປ່ຽນຄ່າມຸມໝູນທັນທີ ເຮົາໃຊ້ MathUtils.lerp ໃນ Render Loop ເພື່ອໃຫ້ການລາກเมาส์ໝູນປຶ້ມ 3D ມີຄວາມນຸ້ມນວນຄືກັບວັດຖຸຈິງ.'),
  (4, 1, 'ບົດທີ 1: ລົມຫາຍໃຈ ແລະ ປັດຈຸບັນ', 'ໃນໂລກທີ່ໝູນໄວດ້ວຍຂໍ້ມູນຂ່າວສານ ການກັບມາຮັບຮູ້ລົມຫາຍໃຈພຽງ 3 ນາທີ ຄືຈຸດເລີ່ມຕົ້ນຂອງສະມາທິ ແລະ ຄວາມຄິດສ້າງສັນອັນทรงພະລັງ.'),
  (4, 2, 'ບົດທີ 2: Deep Work ຄືຫຍັງ?', 'ການເຮັດວຽກຢ່າງເລິກເຊິ່ງໂດຍປາສະຈາກສິ່ງລົບກວນ ຊ່ວຍໃຫ້ສະໝອງສ້າງຜົນງານລະດັບ Masterpiece ໃນເວລາທີ່ສັ້ນລົງ.'),
  (5, 1, 'ຕົວຢ່າງທົດລອງອ່ານ: ຄືນເດືອນເພັງ', 'ແສງຈັນສ່ອງລົງມາເທິງຜິວນ້ຳຂອງເປັນประกายສີທອງ...\n\n(ນີ້ແມ່ນໜ້າທົດລອງອ່ານສຳລັບນິຍາຍເຫຼັ້ມຈິງ ທ່ານສາມາດກົດສັ່ງຊື້ເພື່ອຮັບໜັງສືປົກແຂງສະບັບເຕັມໄດ້ທັນທີ)'),
  (5, 2, 'ຕົວຢ່າງທົດລອງອ່ານ: ສັນຍາແຄມຝັ່ງ', 'ສຽງແຄນລ່ອງລອຍມາຕາມສາຍລົມ ຄືກັບຄຳໝັ້ນສັນຍາທີ່ບໍ່ເຄີຍຈາງຫາຍໄປຕາມການເວລາ.'),
  (6, 1, 'ຕົວຢ່າງທົດລອງອ່ານ: ນະຄອນແຫ່ງວັດວາ', 'ຫຼວງພະບາງ ຍາມເຊົ້າທີ່ງຽບສະຫງົບ ຂະບວນໃສ່ບາດເຂົ້າໜຽວຮ້ອນໆ ຄືວິຖີຊີວິດທີ່ສືບທອດກັນມາຫຼາຍຮ້ອຍປີ.'),
  (7, 1, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ມັງກອນຕື່ນ', '⚡ ຟ້າຜ່າລົງກາງຫຸບເຂົາ! ດາບບູຮານທີ່ຖືກຜະນຶກໄວ້ເລີ່ມສັ່ນສະເທືອນ ພະລັງສາຍຟ້າສີຄາມພຸ່ງຂຶ້ນສູ່ທ້ອງຟ້າ!'),
  (7, 2, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 2 ການປະທະຄັ້ງທຳອິດ', '⚔️ "ຖ້າເຈົ້າຢາກປົກປ້ອງໝູ່ບ້ານນີ້ ຈົ່ງຍົກດາບຂຶ້ນມາ!" ການຜະຈົນໄພຂອງນັກຮົບມັງກອນສາຍຟ້າເລີ່ມຂຶ້ນແລ້ວ!'),
  (8, 1, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ລະຫັດລັບ 2099', '🌐 ປີ 2099 ນະຄອນเวียงจันทน์ເຕັມໄປດ້ວຍຕຶກລະຟ້າ ແລະ ໂຮໂລແກຣມ 3 ມິຕິ... ແຕ່ໃນເງົາມືດ ລະບົບ AI ກາງກຳລັງຖືກเจาะລະບົບ!');

INSERT OR IGNORE INTO reviews (book_id, user_id, rating, comment) VALUES
  (1, 2, 5, 'ອ່ານງ່າຍ ເປີດໜ້າ 3D ງາມຫຼາຍ ໂຄ້ດຕົວຢ່າງຊັດເຈນ!'),
  (1, 3, 5, 'ເນື້ອຫາດີຫຼາຍ ປົກ 3D ໝູນໄດ້ລື່ນໄຫຼສຸດໆ'),
  (2, 2, 5, 'ບັນຍາກາດລຶກລັບ ໜ້າຕິດຕາມທຸກບົດເລີຍ'),
  (3, 3, 5, 'ສอน React Three Fiber ກັບ Three.js ໄດ້ເຂົ້າໃຈງ່າຍຫຼາຍ'),
  (5, 2, 5, 'ສັ່ງຊື້ເຫຼັ້ມຈິງມາແລ້ວ ປົກງາມຄືໃນຮູບເລີຍ'),
  (7, 3, 5, 'ພາບປົກມັງງະเท่ຫຼາຍ ລໍຖ້າເຫຼັ້ມ 2 ເລີຍ!');
