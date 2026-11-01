// Client-side LocalStore & Seed Data Engine for GitHub Pages Static Hosting
// Automatically activates when the Express + SQLite backend (/api/*) is unreachable.

const STORAGE_KEY = 'ebook-ghpages-db-v1';

const INITIAL_DB = {
  categories: [
    { id: 1, name: 'ເທັກໂນໂລຢີ', slug: 'technology' },
    { id: 2, name: 'ນິຍາຍ', slug: 'fiction' },
    { id: 3, name: 'ພັດທະນາຕົນເອງ', slug: 'self-help' },
    { id: 4, name: 'ສິລະປະ & ວັດທະນະທຳ', slug: 'art-culture' },
    { id: 5, name: 'ກາຕູນ', slug: 'manga' },
  ],
  books: [
    {
      id: 1,
      title: 'ເລີ່ມຕົ້ນຂຽນເວັບ',
      author: 'ທີມຜູ້ຂຽນ A',
      description: 'ຄູ່ມື HTML5, CSS3, Modern JavaScript ແລະ WebGL 3D ສຳລັບຜູ້ເລີ່ມຕົ້ນຈົນເຖິງລະດັບມືອາຊີບ ອ່ານຟຣີພ້ອມຕົວຢ່າງໂຄ້ດ.',
      cover_color: '#1e3a8a',
      cover_url: './covers/web-craft.svg',
      gallery_json: '["./covers/web-craft.svg","./covers/r3f-mastery.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: 1,
      categories: 'ເທັກໂນໂລຢີ',
      avg_rating: 5.0,
      review_count: 2,
      total_pages: 4,
      created_at: '2026-10-25 10:00:00',
    },
    {
      id: 2,
      title: 'ເມືອງໃນໝອກ',
      author: 'ທີມຜູ້ຂຽນ B',
      description: 'ນິຍາຍແຟນຕາຊີລຶກລັບແຫ່ງຫຸບເຂົາເໜືອ ເມື່ອໝອກສີເງິນປົກຄຸມເມືອງບູຮານ ແລະ ຄວາມລັບທີ່ຖືກຊ່ອນໄວ້ກວ່າພັນປີກຳລັງຕື່ນຂຶ້ນ.',
      cover_color: '#3b1d5e',
      cover_url: './covers/mist-city.svg',
      gallery_json: '["./covers/mist-city.svg","./covers/mekong-moon.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: 2,
      categories: 'ນິຍາຍ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 3,
      created_at: '2026-10-26 10:00:00',
    },
    {
      id: 3,
      title: 'ສ້າງໂລກ 3D ດ້ວຍ R3F',
      author: 'ທີມພັດທະນາ 3D LAO',
      description: 'ເຈາະເລິກການສ້າງກຣາຟິກ 3D ເທິງເວັບໄຊດ້ວຍແນວຄິດ React Three Fiber, Three.js Shaders, ການຈັດແສງ PBR ແລະ ອະນິເມຊັນ 60fps.',
      cover_color: '#1b4332',
      cover_url: './covers/r3f-mastery.svg',
      gallery_json: '["./covers/r3f-mastery.svg","./covers/web-craft.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: 1,
      categories: 'ເທັກໂນໂລຢີ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 3,
      created_at: '2026-10-27 10:00:00',
    },
    {
      id: 4,
      title: 'ສິລະປະແຫ່ງສະມາທິ',
      author: 'ດຣ. ສົມພອນ ພັດທະນາ',
      description: 'ປ່ຽນຊີວິດ ແລະ ການເຮັດວຽກດ້ວຍສະຕິ ຝຶກໂຟກັສຢ່າງເລິກເຊິ່ງ (Deep Work & Mindfulness) ເພື່ອຄວາມສຸກທີ່ຍືນຍົງ.',
      cover_color: '#266653',
      cover_url: './covers/mindful-art.svg',
      gallery_json: '["./covers/mindful-art.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 0,
      category_id: 3,
      categories: 'ພັດທະນາຕົນເອງ',
      avg_rating: 4.8,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-10-28 10:00:00',
    },
    {
      id: 5,
      title: 'ຕຳນານແສງຈັນແຄມຂອງ',
      author: 'ດວງດາວ ວົງສະຫວັນ',
      description: 'ນິຍາຍຮັກ ແລະ ມິດຕະພາບແຫ່ງສາຍນ້ຳລ້ານຊ້າງ ສະບັບພິມປົກແຂງ (Collector Edition) ພ້ອມທີ່ຄັ່ນໜັງສືລາຍທອງ.',
      cover_color: '#115e59',
      cover_url: './covers/mekong-moon.svg',
      gallery_json: '["./covers/mekong-moon.svg","./covers/luang-prabang.svg"]',
      product_type: 'novel',
      price: 350,
      stock_qty: 18,
      is_featured: 1,
      category_id: 2,
      categories: 'ນິຍາຍ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-10-29 10:00:00',
    },
    {
      id: 6,
      title: 'ມໍລະດົກຫຼວງພະບາງ',
      author: 'ສຸລິຍາ ວັດທະນະທຳ',
      description: 'ບັນທຶກສິລະປະ ສະຖາປັດຕະຍະກຳ ແລະ ວັດວາອາຮາມອັນລ້ຳຄ່າແຫ່ງເມືອງມໍລະດົກໂລກ ພິມ 4 ສີທັງເຫຼັ້ມ.',
      cover_color: '#44372b',
      cover_url: './covers/luang-prabang.svg',
      gallery_json: '["./covers/luang-prabang.svg","./covers/mekong-moon.svg"]',
      product_type: 'novel',
      price: 490,
      stock_qty: 12,
      is_featured: 0,
      category_id: 4,
      categories: 'ສິລະປະ & ວັດທະນະທຳ',
      avg_rating: 4.9,
      review_count: 1,
      total_pages: 1,
      created_at: '2026-10-30 10:00:00',
    },
    {
      id: 7,
      title: 'ນັກຮົບມັງກອນສາຍຟ້າ Vol.1',
      author: 'KENJI & LAO STUDIO',
      description: 'ກາຕູນມັງງະແອັກຊັນຜະຈົນໄພ ພາບສີຄົມຊັດ ເລື່ອງລາວຂອງນັກດາບໜຸ່ມຜູ້ຄອບຄອງພະລັງມັງກອນສາຍຟ້າ.',
      cover_color: '#991b1b',
      cover_url: './covers/thunder-blade.svg',
      gallery_json: '["./covers/thunder-blade.svg","./covers/cyber-vientiane.svg"]',
      product_type: 'manga',
      price: 195,
      stock_qty: 25,
      is_featured: 1,
      category_id: 5,
      categories: 'ກາຕູນ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-10-31 10:00:00',
    },
    {
      id: 8,
      title: 'ນະຄອນໄຊເບີ 2099',
      author: 'AKIRA & CYBER ART',
      description: 'ມັງງະ Sci-Fi Cyberpunk ການຕໍ່ສູ້ຂອງແຮັກເກີໜຸ່ມໃນໂລກອະນາຄົດທີ່ເຕັມໄປດ້ວຍແສງນີອອນ ແລະ AI.',
      cover_color: '#1e1b4b',
      cover_url: './covers/cyber-vientiane.svg',
      gallery_json: '["./covers/cyber-vientiane.svg","./covers/thunder-blade.svg"]',
      product_type: 'manga',
      price: 220,
      stock_qty: 15,
      is_featured: 1,
      category_id: 5,
      categories: 'ກາຕູນ',
      avg_rating: 4.9,
      review_count: 1,
      total_pages: 1,
      created_at: '2026-11-01 10:00:00',
    },
  ],
  pages: {
    1: [
      { page_number: 1, title: 'ບົດນຳ: ຍຸກໃໝ່ຂອງເວັບ 3D', content: 'ຍິນດີຕ້ອນຮັບສູ່ໜັງສື "ເລີ່ມຕົ້ນຂຽນເວັບ".\n\nໃນປັດຈຸບັນ ເວັບໄຊບໍ່ໄດ້ເປັນພຽງໜ້າເອກະສານທຳມະດາອີກຕໍ່ໄປ ແຕ່ສາມາດສ້າງປະສົບການ 3 ມິຕິ (WebGL / Three.js) ທີ່ລື່ນໄຫຼ ແລະ ຕອບສະໜອງກັບຜູ້ໃຊ້ໄດ້ທັນທີ.' },
      { page_number: 2, title: 'HTML5 & Semantic Craft', content: 'HTML5 ແມ່ນໂຄງສ້າງຫຼັກຂອງໜ້າເວັບ.\n\nການໃຊ້ແທັກທີ່ມີຄວາມໝາຍ ເຊັ່ນ <header>, <main>, <article>, ແລະ <dialog> ຊ່ວຍໃຫ້ທັງຜູ້ໃຊ້ງານ ແລະ Screen Reader ເຂົ້າໃຈໂຄງສ້າງເວັບໄຊໄດ້ຢ່າງຊັດເຈນ.' },
      { page_number: 3, title: 'Modern CSS & 3D Perspective', content: 'CSS ຍຸກໃໝ່ມາພ້ອມກັບ Custom Properties (--tokens), Grid Layout ແລະ 3D Transforms.\n\nເຮົາສາມາດໃຊ້ perspective ແລະ transform-style: preserve-3d ເພື່ອສ້າງສັນປຶ້ມ ແລະ ການພິກໜ້າທີ່ສົມຈິງ.' },
      { page_number: 4, title: 'JavaScript ES Modules', content: 'ດ້ວຍ ES Modules (import / export) ເຮົາສາມາດໂຫຼດ Three.js ຜ່ານ importmap ແລະ ຄວບຄຸມ Scene 3D ໄດ້ຢ່າງວ່ອງໄວ.' },
    ],
    2: [
      { page_number: 1, title: 'ບົດທີ 1: ໝອກສີເງິນ', content: 'ໝອກປົກຄຸມເມືອງບູຮານມາສາມມື້ແລ້ວ...\n\nສຽງລະຄັງຈາກຫໍຄອຍກາງເມືອງດັງກັງວານຜ່ານມ່ານໝອກ ທຸກຄົນໃນໝູ່ບ້ານຕ່າງຮູ້ດີວ່າ ເມື່ອໃດທີ່ດວງຈັນປ່ຽນເປັນສີທອງ ປະຕູສູ່ໂລກເບື້ອງຫຼັງຈະເປີດອອກ.' },
      { page_number: 2, title: 'ບົດທີ 2: ກະແຈແຫ່ງຫໍສະໝຸດ', content: 'ຄຳພີບູຮານທີ່ຖືກເກັບຮັກສາໄວ້ໃນຫໍສະໝຸດຊັ້ນໃຕ້ດິນ ເລີ່ມເປັ່ງແສງອອກມາເມື່ອລິນດາຍ່າງເຂົ້າໄປໃກ້ ຕົວອັກສອນລอยຂຶ້ນເໜືອໜ້າເຈ້ຍຄືກັບມີຊີວິດ.' },
      { page_number: 3, title: 'ບົດທີ 3: ການເດີນທາງເລີ່ມຕົ້ນ', content: 'ລົມໜາວພັດຜ່ານຍອດໄມ້ ພາເອົາກິ່ນຫອມຂອງດອກໄມ້ປ່າທີ່ບໍ່ເຄີຍມີໃຜເຫັນມາກ່ອນ ນີ້ຄືຈຸດເລີ່ມຕົ້ນຂອງການຜະຈົນໄພຄັ້ງຍິ່ງໃຫຍ່.' },
    ],
    3: [
      { page_number: 1, title: 'ບົດທີ 1: ແນວຄິດ React Three Fiber', content: 'React Three Fiber (R3F) ຊ່ວຍໃຫ້ເຮົາຈັດການ Scene Graph ຂອງ Three.js ແບບ Declarative.\n\nການແຍກ Mesh, Material (PBR), ແລະ Lighting ອອກເປັນສ່ວນໆ ຊ່ວຍໃຫ້ໂຄ້ດສະອາດ ແລະ ບຳລຸງຮັກສາງ່າຍ.' },
      { page_number: 2, title: 'ບົດທີ 2: PBR Materials & Lighting', content: 'ການເຮັດໃຫ້ປົກໜັງສື 3D ເບິ່ງສົມຈິງ ຕ້ອງໃຊ້ MeshStandardMaterial ຄູ່ກັບ Key Light ໂທນອົບອຸ່ນ ແລະ Rim Light ເພື່ອເນັ້ນຂອບສັນປຶ້ມ.' },
      { page_number: 3, title: 'ບົດທີ 3: Smooth Damping 60fps', content: 'ແທນທີ່ຈະປ່ຽນຄ່າມຸມໝູນທັນທີ ເຮົາໃຊ້ MathUtils.lerp ໃນ Render Loop ເພື່ອໃຫ້ການລາກເມົາສ໌ໝູນປຶ້ມ 3D ມີຄວາມນຸ້ມນວນຄືກັບວັດຖຸຈິງ.' },
    ],
    4: [
      { page_number: 1, title: 'ບົດທີ 1: ລົມຫາຍໃຈ ແລະ ປັດຈຸບັນ', content: 'ໃນໂລກທີ່ໝູນໄວດ້ວຍຂໍ້ມູນຂ່າວສານ ການກັບມາຮັບຮູ້ລົມຫາຍໃຈພຽງ 3 ນາທີ ຄືຈຸດເລີ່ມຕົ້ນຂອງສະມາທິ ແລະ ຄວາມຄິດສ້າງສັນອັນຊົງພະລັງ.' },
      { page_number: 2, title: 'ບົດທີ 2: Deep Work ຄືຫຍັງ?', content: 'ການເຮັດວຽກຢ່າງເລິກເຊິ່ງໂດຍປາສະຈາກສິ່ງລົບກວນ ຊ່ວຍໃຫ້ສະໝອງສ້າງຜົນງານລະດັບ Masterpiece ໃນເວລາທີ່ສັ້ນລົງ.' },
    ],
    5: [
      { page_number: 1, title: 'ຕົວຢ່າງທົດລອງອ່ານ: ຄືນເດືອນເພັງ', content: 'ແສງຈັນສ່ອງລົງມາເທິງຜິວນ້ຳຂອງເປັນປະກາຍສີທອງ...\n\n(ນີ້ແມ່ນໜ້າທົດລອງອ່ານສຳລັບນິຍາຍເຫຼັ້ມຈິງ ທ່ານສາມາດກົດສັ່ງຊື້ເພື່ອຮັບໜັງສືປົກແຂງສະບັບເຕັມໄດ້ທັນທີ)' },
      { page_number: 2, title: 'ຕົວຢ່າງທົດລອງອ່ານ: ສັນຍາແຄມຝັ່ງ', content: 'ສຽງແຄນລ່ອງລອຍມາຕາມສາຍລົມ ຄືກັບຄຳໝັ້ນສັນຍາທີ່ບໍ່ເຄີຍຈາງຫາຍໄປຕາມການເວລາ.' },
    ],
    6: [
      { page_number: 1, title: 'ຕົວຢ່າງທົດລອງອ່ານ: ນະຄອນແຫ່ງວັດວາ', content: 'ຫຼວງພະບາງ ຍາມເຊົ້າທີ່ງຽບສະຫງົບ ຂະບວນໃສ່ບາດເຂົ້າໜຽວຮ້ອນໆ ຄືວິຖີຊີວິດທີ່ສືບທອດກັນມາຫຼາຍຮ້ອຍປີ.' },
    ],
    7: [
      { page_number: 1, title: 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ມັງກອນຕື່ນ', content: '⚡ ຟ້າຜ່າລົງກາງຫຸບເຂົາ! ດາບບູຮານທີ່ຖືກຜະນຶກໄວ້ເລີ່ມສັ່ນສະເທືອນ ພະລັງສາຍຟ້າສີຄາມພຸ່ງຂຶ້ນສູ່ທ້ອງຟ້າ!' },
      { page_number: 2, title: 'ຕົວຢ່າງມັງງະ: ຕອນທີ 2 ການປະທະຄັ້ງທຳອິດ', content: '⚔️ "ຖ້າເຈົ້າຢາກປົກປ້ອງໝູ່ບ້ານນີ້ ຈົ່ງຍົກດາບຂຶ້ນມາ!" ການຜະຈົນໄພຂອງນັກຮົບມັງກອນສາຍຟ້າເລີ່ມຂຶ້ນແລ້ວ!' },
    ],
    8: [
      { page_number: 1, title: 'ຕົວຢ່າງມັງງະ: ຕອນທີ 1 ລະຫັດລັບ 2099', content: '🌐 ປີ 2099 ນະຄອນວຽງຈັນເຕັມໄປດ້ວຍຕຶກລະຟ້າ ແລະ ໂຮໂລແກຣມ 3 ມິຕິ... ແຕ່ໃນເງົາມືດ ລະບົບ AI ກາງກຳລັງຖືກເຈາະລະບົບ!' },
    ],
  },
  reviews: {
    1: [
      { username: 'somchai', rating: 5, comment: 'ອ່ານງ່າຍ ເປີດໜ້າ 3D ງາມຫຼາຍ ໂຄ້ດຕົວຢ່າງຊັດເຈນ!', created_at: '2026-10-30 12:00:00' },
      { username: 'malee', rating: 5, comment: 'ເນື້ອຫາດີຫຼາຍ ປົກ 3D ໝູນໄດ້ລື່ນໄຫຼສຸດໆ', created_at: '2026-10-31 14:20:00' },
    ],
    2: [{ username: 'somchai', rating: 5, comment: 'ບັນຍາກາດລຶກລັບ ໜ້າຕິດຕາມທຸກບົດເລີຍ', created_at: '2026-10-31 09:15:00' }],
    3: [{ username: 'malee', rating: 5, comment: 'ສອນ React Three Fiber ກັບ Three.js ໄດ້ເຂົ້າໃຈງ່າຍຫຼາຍ', created_at: '2026-10-31 16:00:00' }],
    5: [{ username: 'somchai', rating: 5, comment: 'ສັ່ງຊື້ເຫຼັ້ມຈິງມາແລ້ວ ປົກງາມຄືໃນຮູບເລີຍ', created_at: '2026-11-01 08:30:00' }],
    7: [{ username: 'malee', rating: 5, comment: 'ພາບປົກມັງງະເທ່ຫຼາຍ ລໍຖ້າເຫຼັ້ມ 2 ເລີຍ!', created_at: '2026-11-01 11:00:00' }],
  },
  bookmarks: [],
  orders: [],
};

function getDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
  return JSON.parse(JSON.stringify(INITIAL_DB));
}

function saveDb(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeFakeJwt(user) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(user))));
  return `${header}.${payload}.ghpages`;
}

export async function handleStaticApi(url, options = {}) {
  const db = getDb();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;

  if (path === '/categories') return db.categories;

  if (path === '/books' && method === 'GET') {
    const q = (parsed.searchParams.get('q') || '').trim().toLowerCase();
    const cat = Number(parsed.searchParams.get('category') || 0);
    const type = parsed.searchParams.get('type') || '';
    const sort = parsed.searchParams.get('sort') || 'popular';
    let list = db.books.filter((b) => {
      const matchQ = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
      const matchCat = !cat || Number(b.category_id) === cat;
      const matchType = !type || b.product_type === type;
      return matchQ && matchCat && matchType;
    });
    if (sort === 'latest') list.sort((a, b) => b.id - a.id);
    else if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => (b.is_featured - a.is_featured) || (b.avg_rating - a.avg_rating));
    return list;
  }

  const bookMatch = path.match(/^\/books\/(\d+)$/);
  if (bookMatch && method === 'GET') {
    const book = db.books.find((b) => b.id === Number(bookMatch[1]));
    if (!book) throw Object.assign(new Error('notFound'), { key: 'notFound', status: 404 });
    return book;
  }

  const pagesMatch = path.match(/^\/books\/(\d+)\/pages$/);
  if (pagesMatch && method === 'GET') {
    return db.pages[Number(pagesMatch[1])] || [];
  }

  const reviewsMatch = path.match(/^\/books\/(\d+)\/reviews$/);
  if (reviewsMatch) {
    const id = Number(reviewsMatch[1]);
    if (method === 'GET') return db.reviews[id] || [];
    if (method === 'POST') {
      const user = JSON.parse(localStorage.getItem('ebook-user') || '{"username":"reader"}');
      if (!db.reviews[id]) db.reviews[id] = [];
      db.reviews[id].unshift({
        username: user.username,
        rating: Number(body.rating || 5),
        comment: String(body.comment || ''),
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });
      const book = db.books.find((b) => b.id === id);
      if (book) {
        book.review_count = db.reviews[id].length;
        book.avg_rating = db.reviews[id].reduce((s, r) => s + r.rating, 0) / book.review_count;
      }
      saveDb(db);
      return { ok: true };
    }
  }

  const progressMatch = path.match(/^\/books\/(\d+)\/progress$/);
  if (progressMatch) {
    const id = Number(progressMatch[1]);
    const saved = JSON.parse(localStorage.getItem('ebook-progress') || '{}');
    if (method === 'GET') return { last_page: saved[id] || 1 };
    if (method === 'PUT') {
      saved[id] = Number(body.page || 1);
      localStorage.setItem('ebook-progress', JSON.stringify(saved));
      return { ok: true };
    }
  }

  if (path === '/auth/login' && method === 'POST') {
    const identity = String(body.identity || '').trim().toLowerCase();
    const isAdmin = identity === 'admin' || identity === 'admin@example.com';
    const user = { id: isAdmin ? 1 : 2, username: isAdmin ? 'admin' : (identity.split('@')[0] || 'reader'), role: isAdmin ? 'admin' : 'reader' };
    return { token: makeFakeJwt(user), user };
  }

  if (path === '/auth/register' && method === 'POST') {
    const username = String(body.username || 'reader').trim();
    const user = { id: Date.now(), username, role: 'reader' };
    return { token: makeFakeJwt(user), user };
  }

  if (path === '/bookmarks' && method === 'GET') return db.bookmarks;
  const addBookmarkMatch = path.match(/^\/books\/(\d+)\/bookmarks$/);
  if (addBookmarkMatch && method === 'POST') {
    const book = db.books.find((b) => b.id === Number(addBookmarkMatch[1]));
    const item = { id: Date.now(), book_id: Number(addBookmarkMatch[1]), page_number: Number(body.page || 1), title: book?.title || '' };
    db.bookmarks.unshift(item);
    saveDb(db);
    return item;
  }
  const delBookmarkMatch = path.match(/^\/bookmarks\/(\d+)$/);
  if (delBookmarkMatch && method === 'DELETE') {
    db.bookmarks = db.bookmarks.filter((b) => b.id !== Number(delBookmarkMatch[1]));
    saveDb(db);
    return { ok: true };
  }

  if (path === '/shop/products') {
    return db.books.filter((b) => ['novel', 'manga'].includes(b.product_type) && b.price > 0);
  }

  if (path === '/orders') {
    if (method === 'GET') return db.orders;
    if (method === 'POST') {
      const lines = (body.items || []).map((item) => {
        const b = db.books.find((x) => x.id === Number(item.book_id));
        if (b) b.stock_qty = Math.max(0, b.stock_qty - Number(item.quantity || 1));
        return `${b?.title || 'Book'} × ${item.quantity}`;
      });
      const total = (body.items || []).reduce((sum, item) => {
        const b = db.books.find((x) => x.id === Number(item.book_id));
        return sum + (b ? b.price * Number(item.quantity || 1) : 0);
      }, 0);
      const order = {
        id: db.orders.length + 1,
        customer_name: body.customer_name,
        phone: body.phone,
        address: body.address,
        items: lines.join(', '),
        total_amount: total,
        status: 'placed',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      db.orders.unshift(order);
      saveDb(db);
      return order;
    }
  }

  if (path === '/admin/dashboard') {
    const products = db.books.filter((b) => ['novel', 'manga'].includes(b.product_type));
    return {
      product_count: products.length,
      units_in_stock: products.reduce((s, p) => s + Number(p.stock_qty || 0), 0),
      low_stock: products.filter((p) => p.stock_qty > 0 && p.stock_qty <= 5).length,
      order_count: db.orders.filter((o) => o.status !== 'cancelled').length,
      revenue: db.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0),
      products,
      orders: db.orders,
    };
  }

  if (path === '/admin/books' && method === 'POST') {
    const id = db.books.length + 1;
    const cat = db.categories.find((c) => c.id === Number(body.category_id));
    db.books.unshift({
      id,
      title: body.title,
      author: body.author,
      description: body.description,
      cover_color: body.cover_color || '#266653',
      cover_url: body.cover_url || './covers/web-craft.svg',
      gallery_json: JSON.stringify([body.cover_url || './covers/web-craft.svg']),
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: Number(body.category_id || 1),
      categories: cat?.name || '',
      avg_rating: 5.0,
      review_count: 0,
      total_pages: (body.pages || []).length,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
    db.pages[id] = (body.pages || []).map((p, i) => ({ page_number: i + 1, title: p.title, content: p.content }));
    saveDb(db);
    return { id };
  }

  if (path === '/admin/products' && method === 'POST') {
    const id = db.books.length + 1;
    const cover = body.cover_url || './covers/mekong-moon.svg';
    db.books.unshift({
      id,
      title: body.title,
      author: body.author,
      description: body.description,
      cover_color: '#266653',
      cover_url: cover,
      gallery_json: JSON.stringify([cover, ...(body.image_urls || [])]),
      product_type: body.product_type || 'novel',
      price: Number(body.price || 199),
      stock_qty: Number(body.stock_qty || 10),
      is_featured: 1,
      category_id: Number(body.category_id || 2),
      avg_rating: 5.0,
      review_count: 0,
      total_pages: 1,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
    db.pages[id] = [{ page_number: 1, title: body.title, content: body.description || 'Sample preview page.' }];
    saveDb(db);
    return { id };
  }

  const patchProdMatch = path.match(/^\/admin\/products\/(\d+)$/);
  if (patchProdMatch && method === 'PATCH') {
    const prod = db.books.find((b) => b.id === Number(patchProdMatch[1]));
    if (prod) {
      prod.price = Number(body.price);
      prod.stock_qty = Number(body.stock_qty);
      saveDb(db);
    }
    return { ok: true };
  }

  const patchOrderMatch = path.match(/^\/admin\/orders\/(\d+)\/status$/);
  if (patchOrderMatch && method === 'PATCH') {
    const ord = db.orders.find((o) => o.id === Number(patchOrderMatch[1]));
    if (ord) {
      ord.status = body.status;
      saveDb(db);
    }
    return { ok: true };
  }

  return { ok: true };
}
