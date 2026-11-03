// Client-side LocalStore & Seed Data Engine for GitHub Pages Static Hosting
// Automatically activates when the Express + SQLite backend (/api/*) is unreachable.

const STORAGE_KEY = 'ebook-ghpages-db-v2';

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
      description: 'ປຶ້ມແນະນຳພື້ນຖານການສ້າງເວັບໄຊ ອະທິບາຍເຂົ້າໃຈງ່າຍ ເໝາະສຳລັບຜູ້ທີ່ຢາກເລີ່ມຕົ້ນຮຽນຮູ້ດ້ວຍຕົນເອງ.',
      cover_color: '#4d746d',
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
      description: 'ເລື່ອງລາວການເດີນທາງໃນເມືອງບູຮານທ່າມກາງສາຍໝອກ ອ່ານເພີນ ແລະ ຊວນໃຫ້ຕິດຕາມຕະຫຼອດທັງເຫຼັ້ມ.',
      cover_color: '#9a8ab8',
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
      description: 'ແນະນຳການເຮັດພາບ 3 ມິຕິເທິງໜ້າເວັບ ພ້ອມຕົວຢ່າງການຈັດແສງ ແລະ ການເຄື່ອນໄຫວທີ່ນຸ້ມນວນ.',
      cover_color: '#162c55',
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
      description: 'ແນວທາງການຝຶກສະຕິ ແລະ ການຈັດລະບຽບຄວາມຄິດ ເພື່ອໃຫ້ເຮັດວຽກ ແລະ ໃຊ້ຊີວິດໄດ້ຢ່າງມີຄວາມສຸກ.',
      cover_color: '#bd5a34',
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
      description: 'ນິຍາຍຮັກ ແລະ ມິດຕະພາບແຄມຝັ່ງແມ່ນ້ຳຂອງ ຖ່າຍທອດບັນຍາກາດວິຖີຊີວິດອັນອົບອຸ່ນ.',
      cover_color: '#6f2130',
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
      description: 'ບັນທຶກຮູບພາບ ແລະ ເລື່ອງລາວຄວາມງົດງາມຂອງວັດວາອາຮາມ ແລະ ຮີດຄອງປະເພນີເມືອງຫຼວງພະບາງ.',
      cover_color: '#1c304b',
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
      description: 'ກາຕູນຜະຈົນໄພຂອງນັກດາບໜຸ່ມ ພາບແຕ້ມລະອຽດສວຍງາມ ອ່ານມ່ວນທຸກຕອນ.',
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
      description: 'ເລື່ອງລາວໃນໂລກອະນາຄົດປີ 2099 ທີ່ເຕັມໄປດ້ວຍເທັກໂນໂລຢີລ້ຳສະໄໝ ແລະ ການໄຂປິດສະໜາ.',
      cover_color: '#d36e5d',
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
    {
      id: 9,
      title: 'ສິລະປະການຈັດໜ້າ ແລະ ຕົວອັກສອນ',
      author: 'ໂຮງພິມວຽງຈັນ',
      description: 'ແນະນຳຫຼັກການເລືອກໃຊ້ຟອນຕ໌ ແລະ ການຈັດວາງໜ້າເອກະສານໃຫ້ອ່ານງ່າຍ ແລະ ສະບາຍຕາ.',
      cover_color: '#d44c40',
      cover_url: './covers/vol-09.svg',
      gallery_json: '["./covers/vol-09.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: 4,
      categories: 'ສິລະປະ & ວັດທະນະທຳ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-01 12:00:00',
    },
    {
      id: 10,
      title: 'ບັນທຶກການເດີນທາງພູພຽງບໍລະເວນ',
      author: 'ຄຳພັນ ວົງດາລາ',
      description: 'ເລື່ອງເລົ່າຈາກສວນກາເຟ ທຳມະຊາດປ່າໄມ້ ແລະ ວິຖີຊີວິດຜູ້ຄົນເທິງພູພຽງບໍລະເວນ.',
      cover_color: '#25282a',
      cover_url: './covers/vol-10.svg',
      gallery_json: '["./covers/vol-10.svg"]',
      product_type: 'novel',
      price: 320,
      stock_qty: 14,
      is_featured: 0,
      category_id: 2,
      categories: 'ນິຍາຍ',
      avg_rating: 4.9,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-01 14:00:00',
    },
    {
      id: 11,
      title: 'ພື້ນຖານແສງ ແລະ ເງົາໃນງານກຣາຟິກ',
      author: 'ທີມພັດທະນາ 3D LAO',
      description: 'ອະທິບາຍຫຼັກການຈັດແສງເງົາເພື່ອໃຫ້ພາບ 3 ມິຕິເບິ່ງມີມິຕິ ແລະ ສົມຈິງຫຼາຍຂຶ້ນ.',
      cover_color: '#30639d',
      cover_url: './covers/vol-11.svg',
      gallery_json: '["./covers/vol-11.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 0,
      category_id: 1,
      categories: 'ເທັກໂນໂລຢີ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-01 16:00:00',
    },
    {
      id: 12,
      title: 'ຄວາມງຽບສະຫງົບຍາມເຊົ້າ',
      author: 'ດຣ. ສົມພອນ ພັດທະນາ',
      description: 'ບົດຄວາມສັ້ນໆ ທີ່ຊວນໃຫ້ຜູ້ອ່ານໄດ້ພັກຜ່ອນຈິດໃຈ ແລະ ເລີ່ມຕົ້ນມື້ໃໝ່ຢ່າງສົດຊື່ນ.',
      cover_color: '#262421',
      cover_url: './covers/vol-12.svg',
      gallery_json: '["./covers/vol-12.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: 3,
      categories: 'ພັດທະນາຕົນເອງ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-02 08:00:00',
    },
    {
      id: 13,
      title: 'ລວດລາຍຜ້າໄໝລ້ານຊ້າງ',
      author: 'ຫໍພິພິທະພັນສິລະປະສິ່ງທໍ',
      description: 'ລວບລວມປະຫວັດຄວາມເປັນມາ ແລະ ຄວາມໝາຍອັນລ້ຳຄ່າຂອງລວດລາຍຜ້າໄໝບູຮານ.',
      cover_color: '#8e2f36',
      cover_url: './covers/vol-13.svg',
      gallery_json: '["./covers/vol-13.svg"]',
      product_type: 'novel',
      price: 450,
      stock_qty: 10,
      is_featured: 1,
      category_id: 4,
      categories: 'ສິລະປະ & ວັດທະນະທຳ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-02 10:00:00',
    },
    {
      id: 14,
      title: 'ນິທານດວງດາວລ່ອງແມ່ນ້ຳຂອງ',
      author: 'ສຸລິຍາ ວັດທະນະທຳ',
      description: 'ລວມນິທານພື້ນບ້ານ ແລະ ຄວາມເຊື່ອກ່ຽວກັບດວງດາວຂອງຜູ້ຄົນລ່ອງແມ່ນ້ຳຂອງ.',
      cover_color: '#76a9c5',
      cover_url: './covers/vol-14.svg',
      gallery_json: '["./covers/vol-14.svg"]',
      product_type: 'novel',
      price: 290,
      stock_qty: 16,
      is_featured: 0,
      category_id: 2,
      categories: 'ນິຍາຍ',
      avg_rating: 4.9,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-02 12:00:00',
    },
    {
      id: 15,
      title: 'ວິຖີແຫ່ງນັກດາບ',
      author: 'KENJI & LAO STUDIO',
      description: 'ຕອນພິເສດທີ່ເລົ່າເຖິງການຝຶກຝົນຈິດໃຈ ແລະ ມິດຕະພາບຂອງກຸ່ມນັກຮົບໜຸ່ມ.',
      cover_color: '#626a49',
      cover_url: './covers/vol-15.svg',
      gallery_json: '["./covers/vol-15.svg"]',
      product_type: 'manga',
      price: 210,
      stock_qty: 20,
      is_featured: 0,
      category_id: 5,
      categories: 'ກາຕູນ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-02 14:00:00',
    },
    {
      id: 16,
      title: 'ສະຖາປັດຕະຍະກຳແຫ່ງຄວາມຊົງຈຳ',
      author: 'AKIRA & CYBER ART',
      description: 'ເລື່ອງລາວຂອງການເກັບຮັກສາຄວາມຊົງຈຳອັນລ້ຳຄ່າໄວ້ໃນໂລກດິຈິຕອນ.',
      cover_color: '#1d4fa8',
      cover_url: './covers/vol-16.svg',
      gallery_json: '["./covers/vol-16.svg"]',
      product_type: 'manga',
      price: 230,
      stock_qty: 14,
      is_featured: 0,
      category_id: 5,
      categories: 'ກາຕູນ',
      avg_rating: 4.9,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-02 16:00:00',
    },
    {
      id: 17,
      title: 'ບົດກະວີລະດູຝົນ ວຽງຈັນ',
      author: 'ດວງດາວ ວົງສະຫວັນ',
      description: 'ລວມບົດກະວີອ່ານສະບາຍ ຖ່າຍທອດກິ່ນອາຍສາຍຝົນ ແລະ ຄວາມຜູກພັນຂອງຜູ້ຄົນ.',
      cover_color: '#8f2f45',
      cover_url: './covers/vol-17.svg',
      gallery_json: '["./covers/vol-17.svg"]',
      product_type: 'novel',
      price: 260,
      stock_qty: 15,
      is_featured: 0,
      category_id: 2,
      categories: 'ນິຍາຍ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-03 08:00:00',
    },
    {
      id: 18,
      title: 'ເຄື່ອງປັ້ນດິນເຜົາລ່ອງຂອງ',
      author: 'ສຸລິຍາ ວັດທະນະທຳ',
      description: 'ພາໄປຮູ້ຈັກພູມປັນຍາການປັ້ນດິນເຜົາພື້ນບ້ານທີ່ສືບທອດກັນມາຫຼາຍຊົ່ວອາຍຸຄົນ.',
      cover_color: '#4c3970',
      cover_url: './covers/vol-18.svg',
      gallery_json: '["./covers/vol-18.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 0,
      category_id: 4,
      categories: 'ສິລະປະ & ວັດທະນະທຳ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-03 09:00:00',
    },
    {
      id: 19,
      title: 'E-bookshop ສະບັບຄົບຊຸດ',
      author: 'ຄະນະບັນນາທິການ',
      description: 'ລວບລວມຜົນງານຄັດສັນທັງໝົດໃນຊັ້ນໜັງສື ເພື່ອໃຫ້ທ່ານເປີດອ່ານໄດ້ທຸກເວລາ.',
      cover_color: '#365943',
      cover_url: './covers/vol-19.svg',
      gallery_json: '["./covers/vol-19.svg"]',
      product_type: 'ebook',
      price: 0,
      stock_qty: 0,
      is_featured: 1,
      category_id: 3,
      categories: 'ພັດທະນາຕົນເອງ',
      avg_rating: 5.0,
      review_count: 1,
      total_pages: 2,
      created_at: '2026-11-03 10:00:00',
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
    9: [
      { page_number: 1, title: 'ບົດທີ 1: ຈັງຫວະຂອງຕົວອັກສອນ', content: 'ການຈັດໜ້າໜັງສືທີ່ດີ ເລີ່ມຕົ້ນຈາກການເລືອກຂະໜາດຟອນຕ໌ ແລະ ໄລຍະຫ່າງລະຫວ່າງແຖວທີ່ພໍດີ ເພື່ອໃຫ້ຜູ້ອ່ານຮູ້ສຶກຜ່ອນຄາຍຕະຫຼອດການອ່ານ.' },
      { page_number: 2, title: 'ບົດທີ 2: ພື້ນທີ່ວ່າງເທິງໜ້າເຈ້ຍ', content: 'ຂອບກະດາດສີຄຣີມ ແລະ ພື້ນທີ່ວ່າງອ້ອມຂໍ້ຄວາມ ຊ່ວຍໃຫ້ສາຍຕາພັກຜ່ອນ ແລະ ເຮັດໃຫ້ເນື້ອຫາໂດດເດັ່ນຂຶ້ນຢ່າງເປັນທຳມະຊາດ.' },
    ],
    10: [
      { page_number: 1, title: 'ບົດທີ 1: ສາຍໝອກເທິງພູພຽງ', content: 'ຍາມເຊົ້າເທິງພູພຽງບໍລະເວນ ອາກາດເຢັນສະບາຍ ກິ່ນຫອມຂອງດອກກາເຟສົດລ່ອງລອຍມາຕາມສາຍລົມ ພ້ອມສຽງນ້ຳຕົກຕາດທີ່ດັງກັງວານຢູ່ໄກໆ.' },
      { page_number: 2, title: 'ບົດທີ 2: ວິຖີຄົນຮັກກາເຟ', content: 'ທຸກເມັດກາເຟຜ່ານການດູແລດ້ວຍຄວາມຕັ້ງໃຈ ຕັ້ງແຕ່ການປູກ ການເກັບກ່ຽວ ຈົນເຖິງຈອກກາເຟອຸ່ນໆ ໃນມືຂອງຜູ້ອ່ານ.' },
    ],
    11: [
      { page_number: 1, title: 'ບົດທີ 1: ແສງຫຼັກ ແລະ ແສງເສີມ', content: 'ໃນງານກຣາຟິກ 3 ມິຕິ ແສງຫຼັກ (Key Light) ຊ່ວຍກຳນົດທິດທາງຂອງເງົາ ສ່ວນແສງເສີມ (Fill Light) ຊ່ວຍໃຫ້ລາຍລະອຽດໃນມຸມມືດຍັງຄົງເບິ່ງເຫັນໄດ້ຢ່າງນຸ້ມນວນ.' },
      { page_number: 2, title: 'ບົດທີ 2: ຜິວສຳຜັດຂອງວັດສະດຸ', content: 'ຄວາມຫຍາບລະອຽດຂອງຜິວຜ້າ ແລະ ກະດາດ ຈະສະທ້ອນແສງແຕກຕ່າງກັນ ເຮັດໃຫ້ປຶ້ມ 3 ມິຕິເບິ່ງຄືກັບຈັບຕ້ອງໄດ້ແທ້.' },
    ],
    12: [
      { page_number: 1, title: 'ບົດທີ 1: ຕື່ນຮູ້ກັບຍາມເຊົ້າ', content: 'ກ່ອນເລີ່ມຕົ້ນວຽກງານໃນແຕ່ລະວັນ ລອງໃຊ້ເວລາ 5 ນາທີ ນັ່ງຈິບນ້ຳອຸ່ນ ແລະ ຟັງສຽງທຳມະຊາດອ້ອມຂ້າງ ເພື່ອຈັດລະບຽບຄວາມຄິດຢ່າງສະຫງົບ.' },
      { page_number: 2, title: 'ບົດທີ 2: ຄວາມສຸກຈາກສິ່ງເລັກນ້ອຍ', content: 'ແສງແດດອ່ອນໆ ທີ່ສ່ອງຜ່ານປ່ອງຢ້ຽມ ແລະ ປຶ້ມດີໆ ຈັກເຫຼັ້ມ ຄືຂອງຂວັນທີ່ລຽບງ່າຍແຕ່ມີຄຸນຄ່າໃນທຸກໆ ມື້.' },
    ],
    13: [
      { page_number: 1, title: 'ບົດທີ 1: ສິລະປະເທິງຜືນຜ້າໄໝ', content: 'ລວດລາຍນາກ ແລະ ດອກຈຳປາເທິງຜືນຜ້າໄໝລ້ານຊ້າງ ສະທ້ອນເຖິງຄວາມເຊື່ອ ຄວາມອຸດົມສົມບູນ ແລະ ຝີມືອັນປານີດຂອງຊ່າງທໍຜ້າ.' },
      { page_number: 2, title: 'ບົດທີ 2: ການສືບທອດພູມປັນຍາ', content: 'ຈາກການຍ້ອມສີທຳມະຊາດສູ່ກີ່ທໍຜ້າໄມ້ ທຸກຂັ້ນຕອນລ້ວນເຕັມໄປດ້ວຍຄວາມອົດທົນ ແລະ ຄວາມຮັກໃນສິລະປະວັດທະນະທຳ.' },
    ],
    14: [
      { page_number: 1, title: 'ບົດທີ 1: ດາວເໜືອເທິງຟ້າກວ້າງ', content: 'ຄືນເດືອນມືດແຄມຝັ່ງຂອງ ຜູ້ເຖົ້າຜູ້ແກ່ມັກເລົ່ານິທານກ່ຽວກັບກຸ່ມດາວທີ່ຄອຍບອກລະດູການ ແລະ ນຳທາງເຮືອຫາປາໃຫ້ກັບບ້ານຢ່າງປອດໄພ.' },
      { page_number: 2, title: 'ບົດທີ 2: ນິທານກ່ອນນອນ', content: 'ເລື່ອງເລົ່າຈາກຮຸ່ນສູ່ຮຸ່ນ ຊ່ວຍຖັກທໍສາຍໄຍຄວາມອົບອຸ່ນໃນຄອບຄົວ ແລະ ປູກຝັງຈິນຕະນາການໃຫ້ກັບເດັກນ້ອຍ.' },
    ],
    15: [
      { page_number: 1, title: 'ຕອນທີ 1: ການຝຶກກາງສາຍຝົນ', content: 'ທ່າມກາງສາຍຝົນທີ່ຕົກລົງມາຢ່າງໜັກ ນັກດາບໜຸ່ມຍັງຄົງຝຶກຈັງຫວະກ້າວຍ່າງຢ່າງໝັ້ນຄົງ ເພາະຄວາມແຂງແກ່ນເລີ່ມຈາກຄວາມພະຍາຍາມ.' },
      { page_number: 2, title: 'ຕອນທີ 2: ຄຳສັນຍາຂອງໝູ່ເພື່ອນ', content: 'ບໍ່ວ່າເສັ້ນທາງຂ້າງໜ້າຈະຍາກລຳບາກພຽງໃດ ມິດຕະພາບ ແລະ ຄວາມໄວ້ວາງໃຈຈະພາທຸກຄົນກ້າວຜ່ານອຸປະສັກໄປນຳກັນ.' },
    ],
    16: [
      { page_number: 1, title: 'ຕອນທີ 1: ຫໍຈົດໝາຍເຫດດິຈິຕອນ', content: 'ໃນໂລກອະນາຄົດ ຄວາມຊົງຈຳທຸກຢ່າງຖືກຈັດເກັບໄວ້ເປັນໂຄງສ້າງສະຖາປັດຕະຍະກຳແສງ ທີ່ຜູ້ຄົນສາມາດຍ່າງເຂົ້າໄປຢ້ຽມຊົມອະດີດໄດ້.' },
      { page_number: 2, title: 'ຕອນທີ 2: ຄຸນຄ່າຂອງຄວາມຮູ້ສຶກແທ້', content: 'ເຖິງແມ່ນເທັກໂນໂລຢີຈະກ້າວໜ້າພຽງໃດ ແຕ່ຄວາມອົບອຸ່ນຂອງຮອຍຍິ້ມ ແລະ ຄວາມຈິງໃຈກໍຍັງເປັນສິ່ງທີ່ລ້ຳຄ່າທີ່ສຸດສະເໝີ.' },
    ],
    17: [
      { page_number: 1, title: 'ບົດກະວີທີ 1: ຝົນແຮກຂອງລະດູ', content: 'ສຽງຝົນຕົກລິນລົງເທິງໃບບົວ ກິ່ນດິນຊຸ່ມນ້ຳຫອມກຸ່ນ ຊວນໃຫ້ຄິດຮອດວັນເວລາທີ່ແສນອົບອຸ່ນໃນນະຄອນຫຼວງວຽງຈັນ.' },
      { page_number: 2, title: 'ບົດກະວີທີ 2: ຮົ່ມຄັນດຽວກັນ', content: 'ຍ່າງຄຽງຂ້າງກັນໄປຕາມທາງຍ່າງແຄມຂອງ ຟັງສຽງສາຍຝົນເປັນບົດເພງແຫ່ງມິດຕະພາບທີ່ບໍ່ເຄີຍຈາງຫາຍ.' },
    ],
    18: [
      { page_number: 1, title: 'ບົດທີ 1: ດິນໜຽວແຄມຝັ່ງນ້ຳ', content: 'ດິນໜຽວເນື້ອລະອຽດຈາກແຄມຝັ່ງແມ່ນ້ຳຂອງ ເມື່ອຜ່ານການນວດ ແລະ ຂຶ້ນຮູບເທິງແປ້ນໝູນ ກໍກາຍເປັນພາຊະນະທີ່ທັງງົດງາມ ແລະ ໃຊ້ງານໄດ້ດີ.' },
      { page_number: 2, title: 'ບົດທີ 2: ລວດລາຍຈາກທຳມະຊາດ', content: 'ຮອຍເຊືອກ ແລະ ລາຍກີບບົວທີ່ປະທັບລົງເທິງເຄື່ອງປັ້ນດິນເຜົາ ຄືເອກະລັກສະເພາະຕົວຂອງຊ່າງຫັດຖະກຳພື້ນບ້ານ.' },
    ],
    19: [
      { page_number: 1, title: 'ບົດທີ 1: ຍິນດີຕ້ອນຮັບສູ່ E-bookshop', content: 'E-bookshop ລວບລວມໜັງສືອີເລັກໂຕນິກ ນິຍາຍ ແລະ ກາຕູນຄຸນນະພາບທັງ 19 ເຫຼັ້ມໄວ້ໃນຊັ້ນໜັງສື 3 ມິຕິ ເພື່ອໃຫ້ທ່ານເລືອກອ່ານໄດ້ທຸກເວລາ.' },
      { page_number: 2, title: 'ບົດທີ 2: ການອ່ານຄືການເດີນທາງ', content: 'ຂໍຂອບໃຈຜູ້ອ່ານທຸກທ່ານທີ່ຮ່ວມເດີນທາງໄປກັບໂລກແຫ່ງຕົວອັກສອນ ຂໍໃຫ້ທຸກໜ້າກະດາດມອບທັງຄວາມຮູ້ ແລະ ຄວາມສຸກໃຫ້ກັບທ່ານສະເໝີ.' },
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
    7: [{ username: 'malee', rating: 5, comment: 'ພາບປົກມັງງະງາມຫຼາຍ ລໍຖ້າເຫຼັ້ມ 2 ເລີຍ!', created_at: '2026-11-01 11:00:00' }],
    9: [{ username: 'somchai', rating: 5, comment: 'ອະທິບາຍການຈັດໜ້າ ແລະ ຟອນຕ໌ໄດ້ລະອຽດ ອ່ານສະບາຍຕາຫຼາຍ', created_at: '2026-11-01 15:00:00' }],
    12: [{ username: 'malee', rating: 5, comment: 'ອ່ານຕອນເຊົ້າແລ້ວຮູ້ສຶກສະຫງົບ ແລະ ມີພະລັງໃນການເຮັດວຽກ', created_at: '2026-11-02 09:30:00' }],
    13: [{ username: 'somchai', rating: 5, comment: 'ຮູບລວດລາຍຜ້າໄໝລ້ານຊ້າງງົດງາມ ແລະ ມີຄຸນຄ່າຫຼາຍ', created_at: '2026-11-02 14:00:00' }],
    19: [{ username: 'malee', rating: 5, comment: 'ຊັ້ນໜັງສື 19 ເຫຼັ້ມຄົບຊຸດ ເລືອກອ່ານງ່າຍທຸກເວລາເລີຍ!', created_at: '2026-11-03 10:30:00' }],
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
