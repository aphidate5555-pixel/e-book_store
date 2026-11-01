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
  db.prepare(`UPDATE books SET cover_url = '/covers/web-craft.svg', cover_color = '#1e3a8a', gallery_json = '["/covers/web-craft.svg","/covers/r3f-mastery.svg"]', is_featured = 1 WHERE id = 1 AND (cover_url IS NULL OR cover_url = '')`).run();
  db.prepare(`UPDATE books SET cover_url = '/covers/mist-city.svg', cover_color = '#3b1d5e', gallery_json = '["/covers/mist-city.svg","/covers/mekong-moon.svg"]', is_featured = 1 WHERE id = 2 AND (cover_url IS NULL OR cover_url = '')`).run();

  // Seed additional showcase E-Books, Novels, and Manga if catalog has fewer than 5 books
  const bookCount = db.prepare('SELECT COUNT(*) AS count FROM books').get().count;
  if (bookCount < 5) {
    const insertBook = db.prepare(`INSERT OR IGNORE INTO books (id, title, author, description, cover_color, cover_url, gallery_json, product_type, price, stock_qty, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const extraBooks = [
      [3, 'ສ້າງໂລກ 3D ດ້ວຍ R3F', 'ທີມພັດທະນາ 3D LAO', 'ເຈາະເລິກການສ້າງກຣາຟິກ 3D ເທິງເວັບໄຊດ້ວຍແນວຄິດ React Three Fiber, Three.js Shaders, ການຈັດແສງ PBR ແລະ ອະນິເມຊັນ 60fps.', '#1b4332', '/covers/r3f-mastery.svg', '["/covers/r3f-mastery.svg","/covers/web-craft.svg"]', 'ebook', 0, 0, 1],
      [4, 'ສິລະປະແຫ່ງສະມາທິ', 'ດຣ. ສົມພອນ ພັດທະນາ', 'ປ່ຽນຊີວິດ ແລະ ການເຮັດວຽກດ້ວຍສະຕິ ຝຶກໂຟກັສຢ່າງເລິກເຊິ່ງ (Deep Work & Mindfulness) ເພື່ອຄວາມສຸກທີ່ຍືນຍົງ.', '#266653', '/covers/mindful-art.svg', '["/covers/mindful-art.svg"]', 'ebook', 0, 0, 0],
      [5, 'ຕຳນານແສງຈັນແຄມຂອງ', 'ດວງດາວ ວົງສະຫວັນ', 'ນິຍາຍຮັກ ແລະ ມິດຕະພາບແຫ່ງສາຍນ້ຳລ້ານຊ້າງ ສະບັບພິມປົກແຂງ (Collector Edition) ພ້ອມທີ່ຄັ່ນໜັງສືລາຍທອງ.', '#115e59', '/covers/mekong-moon.svg', '["/covers/mekong-moon.svg","/covers/luang-prabang.svg"]', 'novel', 350, 18, 1],
      [6, 'ມໍລະດົກຫຼວງພະບາງ', 'ສຸລິຍາ ວັດທະນະທຳ', 'ບັນທຶກສິລະປະ ສະຖາປັດຕະຍະກຳ ແລະ ວັດວາອາຮາມອັນລ້ຳຄ່າແຫ່ງເມືອງມໍລະດົກໂລກ ພິມ 4 ສີທັງເຫຼັ້ມ.', '#44372b', '/covers/luang-prabang.svg', '["/covers/luang-prabang.svg","/covers/mekong-moon.svg"]', 'novel', 490, 12, 0],
      [7, 'ນັກຮົບມັງກອນສາຍຟ້າ Vol.1', 'KENJI & LAO STUDIO', 'ກາຕູນມັງງະແອັກຊັນຜະຈົນໄພ ພາບສີຄົມຊັດ ເລື່ອງລາວຂອງນັກດາບໜຸ່ມຜູ້ຄອບຄອງພະລັງມັງກອນສາຍຟ້າ.', '#991b1b', '/covers/thunder-blade.svg', '["/covers/thunder-blade.svg","/covers/cyber-vientiane.svg"]', 'manga', 195, 25, 1],
      [8, 'ນະຄອນໄຊເບີ 2099', 'AKIRA & CYBER ART', 'ມັງງະ Sci-Fi Cyberpunk ການຕໍ່ສູ້ຂອງແຮັກເກີໜຸ່ມໃນໂລກອະນາຄົດທີ່ເຕັມໄປດ້ວຍແສງນີອອນ ແລະ AI.', '#1e1b4b', '/covers/cyber-vientiane.svg', '["/covers/cyber-vientiane.svg","/covers/thunder-blade.svg"]', 'manga', 220, 15, 1],
    ];
    extraBooks.forEach((b) => insertBook.run(...b));

    const insertBookCat = db.prepare('INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)');
    [[3, 1], [4, 3], [5, 2], [6, 5], [7, 4], [8, 4]].forEach(([bId, cId]) => insertBookCat.run(bId, cId));

    const insertPage = db.prepare('INSERT OR IGNORE INTO pages (book_id, page_number, title, content) VALUES (?, ?, ?, ?)');
    [
      [1, 4, 'JavaScript ES Modules', 'ດ້ວຍ ES Modules (import / export) ເຮົາສາມາດໂຫຼດ Three.js ຜ່ານ importmap ແລະ ຄວບຄຸມ Scene 3D ໄດ້ຢ່າງວ່ອງໄວ.'],
      [2, 2, 'ບົດທີ 2: ກະແຈແຫ່ງຫໍສະໝຸດ', 'ຄຳພີບູຮານທີ່ຖືກເກັບຮັກສາໄວ້ໃນຫໍສະໝຸດຊັ້ນໃຕ້ດິນ ເລີ່ມເປັ່ງແສງອອກມາເມື່ອລິນດາຍ່າງເຂົ້າໄປໃກ້ ຕົວອັກສອນລอยຂຶ້ນເໜືອໜ້າເຈ້ຍຄືກັບມີຊີວິດ.'],
      [2, 3, 'ບົດທີ 3: ການເດີນທາງເລີ່ມຕົ້ນ', 'ລົມໜາວພັດຜ່ານຍອດໄມ້ ພາເອົາກິ່ນຫອມຂອງດອກໄມ້ປ່າທີ່ບໍ່ເຄີຍມີໃຜເຫັນມາກ່ອນ ນີ້ຄືຈຸດເລີ່ມຕົ້ນຂອງການຜະຈົນໄພຄັ້ງຍິ່ງໃຫຍ່.'],
      [3, 1, 'ບົດທີ 1: ແນວຄິດ React Three Fiber', 'React Three Fiber (R3F) ຊ່ວຍໃຫ້ເຮົາຈັດການ Scene Graph ຂອງ Three.js ແບບ Declarative.\n\nການແຍກ Mesh, Material (PBR), ແລະ Lighting ອອກເປັນສ່ວນໆ ຊ່ວຍໃຫ້ໂຄ້ດສະອາດ ແລະ ບຳລຸງຮັກສາງ່າຍ.'],
      [3, 2, 'ບົດທີ 2: PBR Materials & Lighting', 'ການເຮັດໃຫ້ປົກໜັງສື 3D ເບິ່ງສົມຈິງ ຕ້ອງໃຊ້ MeshStandardMaterial ຄູ່ກັບ Key Light ໂທນອົບອຸ່ນ ແລະ Rim Light ເພື່ອເນັ້ນຂອບສັນປຶ້ມ.'],
      [3, 3, 'ບົດທີ 3: Smooth Damping 60fps', 'ແທນທີ່ຈະປ່ຽນຄ່າມຸມໝູນທັນທີ ເຮົາໃຊ້ MathUtils.lerp ໃນ Render Loop ເພື່ອໃຫ້ການລາກເມົາສ໌ໝູນປຶ້ມ 3D ມີຄວາມນຸ້ມນວນຄືກັບວັດຖຸຈິງ.'],
      [4, 1, 'ບົດທີ 1: ລົມຫາຍໃຈ ແລະ ປັດຈຸບັນ', 'ໃນໂລກທີ່ໝູນໄວດ້ວຍຂໍ້ມູນຂ່າວສານ ການກັບມາຮັບຮູ້ລົມຫາຍໃຈພຽງ 3 ນາທີ ຄືຈຸດເລີ່ມຕົ້ນຂອງສະມາທິ ແລະ ຄວາມຄິດສ້າງສັນອັນຊົງພະລັງ.'],
      [4, 2, 'ບົດທີ 2: Deep Work ຄືຫຍັງ?', 'ການເຮັດວຽກຢ່າງເລິກເຊິ່ງໂດຍປາສະຈາກສິ່ງລົບກວນ ຊ່ວຍໃຫ້ສະໝອງສ້າງຜົນງານລະດັບ Masterpiece ໃນເວລາທີ່ສັ້ນລົງ.'],
      [5, 1, 'ຕົວຢ່າງທົດລອງອ່ານ: ຄືນເດືອນເພັງ', 'ແສງຈັນສ່ອງລົງມາເທິງຜິວນ້ຳຂອງເປັນປະກາຍສີທອງ...\n\n(ນີ້ແມ່ນໜ້າທົດລອງອ່ານສຳລັບນິຍາຍເຫຼັ້ມຈິງ ທ່ານສາມາດກົດສັ່ງຊື້ເພື່ອຮັບໜັງສືປົກແຂງສະບັບເຕັມໄດ້ທັນທີ)'],
      [5, 2, 'ຕົວຢ່າງທົດລອງອ່ານ: ສັນຍາແຄມຝັ່ງ', 'ສຽງແຄນລ່ອງລອຍມາຕາມສາຍລົມ ຄືກັບຄຳໝັ້ນສັນຍາທີ່ບໍ່ເຄີຍຈາງຫາຍໄປຕາມການເວລາ.'],
      [6, 1, 'ຕົວຢ່າງທົດລອງອ່ານ: ນະຄອນແຫ່ງວັດວາ', 'ຫຼວງພະບາງ ຍາມເຊົ້າທີ່ງຽບສະຫງົບ ຂະບວນໃສ່ບາດເຂົ້າໜຽວຮ້ອນໆ ຄືວິຖີຊີວິດທີ່ສືບທອດກັນມາຫຼາຍຮ້ອຍປີ.'],
      [7, 1, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ມັງກອນຕື່ນ', '⚡ ຟ້າຜ່າລົງກາງຫຸບເຂົາ! ດາບບູຮານທີ່ຖືກຜະນຶກໄວ້ເລີ່ມສັ່ນສະເທືອນ ພະລັງສາຍຟ້າສີຄາມພຸ່ງຂຶ້ນສູ່ທ້ອງຟ້າ!'],
      [7, 2, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 2 ການປະທະຄັ້ງທຳອິດ', '⚔️ "ຖ້າເຈົ້າຢາກປົກປ້ອງໝູ່ບ້ານນີ້ ຈົ່ງຍົກດາບຂຶ້ນມາ!" ການຜະຈົນໄພຂອງນັກຮົບມັງກອນສາຍຟ້າເລີ່ມຂຶ້ນແລ້ວ!'],
      [8, 1, 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ລະຫັດລັບ 2099', '🌐 ປີ 2099 ນະຄອນວຽງຈັນເຕັມໄປດ້ວຍຕຶກລະຟ້າ ແລະ ໂຮໂລແກຣມ 3 ມິຕິ... ແຕ່ໃນເງົາມືດ ລະບົບ AI ກາງກຳລັງຖືກເຈາະລະບົບ!'],
    ].forEach((p) => insertPage.run(...p));
  }

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
