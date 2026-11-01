const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./database');
const { getSecret, requireAuth, requireAdmin } = require('./auth');

const router = express.Router();
const one = (sql) => db.prepare(sql);
const all = (sql) => db.prepare(sql);
const validId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const validAssetUrl = (url) => !url || /^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'));

router.get('/health', (_req, res) => res.json({ ok: true }));

router.post('/auth/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (username.length < 2 || username.length > 40 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({ error: 'invalidRegister' });
  }
  try {
    const result = one('INSERT INTO users(username,email,password_hash) VALUES(?,?,?)')
      .run(username, email, bcrypt.hashSync(password, 12));
    return res.status(201).json({
      token: makeToken({ id: result.lastInsertRowid, username, role: 'reader' }),
      user: { id: result.lastInsertRowid, username, role: 'reader' },
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'accountExists' });
    throw error;
  }
});

router.post('/auth/login', (req, res) => {
  const identity = String(req.body.identity || '').trim();
  const user = one('SELECT id, username, email, password_hash, role FROM users WHERE email = ? OR username = ?')
    .get(identity.toLowerCase(), identity);
  if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'invalidLogin' });
  }
  return res.json({ token: makeToken(user), user: { id: user.id, username: user.username, role: user.role } });
});

function makeToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, getSecret(), { expiresIn: '7d' });
}

router.get('/categories', (_req, res) => res.json(all('SELECT id,name,slug FROM categories ORDER BY id').all()));

router.get('/books', (req, res) => {
  const q = `%${String(req.query.q || '').trim().slice(0, 100)}%`;
  const categoryId = validId(req.query.category) ? Number(req.query.category) : null;
  const type = ['ebook', 'novel', 'manga'].includes(String(req.query.type || '')) ? String(req.query.type) : null;
  const sort = String(req.query.sort || 'popular');

  let orderBy = 'b.is_featured DESC, avg_rating DESC, b.created_at DESC';
  if (sort === 'latest') orderBy = 'b.created_at DESC, b.id DESC';
  else if (sort === 'price_asc') orderBy = 'b.price ASC, b.title COLLATE NOCASE ASC';
  else if (sort === 'price_desc') orderBy = 'b.price DESC, b.title COLLATE NOCASE ASC';

  const books = all(`SELECT b.id,b.title,b.author,b.description,b.cover_color,b.cover_url,b.gallery_json,b.language,b.created_at,
      b.product_type,b.price,b.stock_qty,b.is_featured,
      COALESCE(s.avg_rating,0) avg_rating, COALESCE(s.review_count,0) review_count, COALESCE(s.total_pages,0) total_pages,
      GROUP_CONCAT(DISTINCT c.name) categories
    FROM books b LEFT JOIN book_stats s ON s.id=b.id
    LEFT JOIN book_categories bc ON bc.book_id=b.id LEFT JOIN categories c ON c.id=bc.category_id
    WHERE b.is_published=1 AND (b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)
      AND (? IS NULL OR EXISTS(SELECT 1 FROM book_categories x WHERE x.book_id=b.id AND x.category_id=?))
      AND (? IS NULL OR b.product_type=?)
    GROUP BY b.id ORDER BY ${orderBy}`).all(q, q, q, categoryId, categoryId, type, type);
  return res.json(books);
});

router.get('/books/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'notFound' });
  const book = one(`SELECT b.*,COALESCE(s.avg_rating,0) avg_rating,COALESCE(s.review_count,0) review_count,
      COALESCE(s.total_pages,0) total_pages,GROUP_CONCAT(DISTINCT c.name) categories
    FROM books b LEFT JOIN book_stats s ON s.id=b.id LEFT JOIN book_categories bc ON bc.book_id=b.id
    LEFT JOIN categories c ON c.id=bc.category_id WHERE b.id=? AND b.is_published=1 GROUP BY b.id`).get(Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'notFound' });
  return res.json(book);
});

router.get('/books/:id/pages', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'notFound' });
  return res.json(all('SELECT page_number,title,content FROM pages WHERE book_id=? ORDER BY page_number').all(Number(req.params.id)));
});

router.get('/books/:id/reviews', (req, res) => res.json(all(`SELECT r.rating,r.comment,r.created_at,u.username
  FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.book_id=? ORDER BY r.created_at DESC`)
  .all(Number(req.params.id))));

router.post('/books/:id/reviews', requireAuth, (req, res) => {
  const rating = Number(req.body.rating);
  if (!validId(req.params.id)) return res.status(400).json({ error: 'notFound' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'invalidRating' });
  const comment = String(req.body.comment || '').trim().slice(0, 1000) || null;
  one(`INSERT INTO reviews(book_id,user_id,rating,comment) VALUES(?,?,?,?)
    ON CONFLICT(book_id,user_id) DO UPDATE SET rating=excluded.rating, comment=excluded.comment, created_at=CURRENT_TIMESTAMP`)
    .run(Number(req.params.id), req.user.id, rating, comment);
  return res.status(201).json({ ok: true });
});

router.get('/wishlist', requireAuth, (req, res) => {
  const row = one('SELECT wishlist_json FROM users WHERE id=?').get(req.user.id);
  let ids = [];
  try { ids = JSON.parse(row?.wishlist_json || '[]').filter(validId).map(Number); } catch { ids = []; }
  return res.json({ ids });
});

router.post('/wishlist/:bookId', requireAuth, (req, res) => {
  const bookId = Number(req.params.bookId);
  if (!validId(bookId)) return res.status(400).json({ error: 'notFound' });
  const row = one('SELECT wishlist_json FROM users WHERE id=?').get(req.user.id);
  let ids = [];
  try { ids = JSON.parse(row?.wishlist_json || '[]').filter(validId).map(Number); } catch { ids = []; }
  const index = ids.indexOf(bookId);
  const wished = index === -1;
  if (wished) ids.unshift(bookId);
  else ids.splice(index, 1);
  one('UPDATE users SET wishlist_json=? WHERE id=?').run(JSON.stringify(ids.slice(0, 100)), req.user.id);
  return res.json({ wished, ids });
});

router.get('/books/:id/progress', requireAuth, (req, res) => {
  return res.json(one('SELECT last_page FROM reading_progress WHERE user_id=? AND book_id=?')
    .get(req.user.id, Number(req.params.id)) || { last_page: 1 });
});

router.put('/books/:id/progress', requireAuth, (req, res) => {
  const page = Number(req.body.page);
  if (!Number.isInteger(page) || page < 1) return res.status(400).json({ error: 'invalidPage' });
  one(`INSERT INTO reading_progress(user_id,book_id,last_page) VALUES(?,?,?)
    ON CONFLICT(user_id,book_id) DO UPDATE SET last_page=excluded.last_page,updated_at=CURRENT_TIMESTAMP`)
    .run(req.user.id, Number(req.params.id), page);
  return res.json({ ok: true });
});

router.get('/bookmarks', requireAuth, (req, res) => res.json(all(`SELECT m.id,m.book_id,m.page_number,m.note,m.created_at,b.title
  FROM bookmarks m JOIN books b ON b.id=m.book_id WHERE m.user_id=? ORDER BY m.created_at DESC`).all(req.user.id)));

router.post('/books/:id/bookmarks', requireAuth, (req, res) => {
  const page = Number(req.body.page);
  if (!Number.isInteger(page) || page < 1) return res.status(400).json({ error: 'invalidPage' });
  const result = one('INSERT INTO bookmarks(user_id,book_id,page_number,note) VALUES(?,?,?,?)')
    .run(req.user.id, Number(req.params.id), page, String(req.body.note || '').trim().slice(0, 200) || null);
  return res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/bookmarks/:id', requireAuth, (req, res) => {
  const result = one('DELETE FROM bookmarks WHERE id=? AND user_id=?').run(Number(req.params.id), req.user.id);
  return result.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'notFound' });
});

router.post('/admin/books', requireAuth, requireAdmin, (req, res) => {
  const { title, author, description, cover_color, cover_url, language, category_id, pages } = req.body;
  const cleanCover = String(cover_url || '').trim();
  if (!String(title || '').trim() || !String(author || '').trim() || !Array.isArray(pages) || pages.length < 1 || pages.length > 300 || !validAssetUrl(cleanCover)) {
    return res.status(400).json({ error: 'invalidBook' });
  }
  const addBook = db.transaction(() => {
    const result = one(`INSERT INTO books(title,author,description,cover_color,cover_url,language)
      VALUES(?,?,?,?,?,?)`).run(String(title).trim(), String(author).trim(), String(description || '').trim(),
      /^#[0-9a-f]{6}$/i.test(cover_color) ? cover_color : '#266653', cleanCover || '/covers/web-craft.svg',
      String(language || 'lo').slice(0, 10));
    const bookId = result.lastInsertRowid;
    if (validId(category_id)) one('INSERT OR IGNORE INTO book_categories(book_id,category_id) VALUES(?,?)').run(bookId, Number(category_id));
    const insertPage = one('INSERT INTO pages(book_id,page_number,title,content) VALUES(?,?,?,?)');
    pages.forEach((page, index) => insertPage.run(bookId, index + 1, String(page.title || '').slice(0, 150), String(page.content || '')));
    return bookId;
  });
  return res.status(201).json({ id: addBook() });
});

router.post('/admin/products', requireAuth, requireAdmin, (req, res) => {
  const title = String(req.body.title || '').trim();
  const author = String(req.body.author || '').trim();
  const type = String(req.body.product_type || 'novel');
  const price = Number(req.body.price);
  const stock = Number(req.body.stock_qty);
  const coverUrl = String(req.body.cover_url || '').trim();
  const gallery = Array.isArray(req.body.image_urls) ? req.body.image_urls.map((url) => String(url).trim()).filter(Boolean) : [];
  if (!title || title.length > 200 || !author || author.length > 120 || !['novel', 'manga'].includes(type)
      || !Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(stock) || stock < 0
      || !validAssetUrl(coverUrl) || gallery.some((url) => !validAssetUrl(url))) {
    return res.status(400).json({ error: 'invalidProduct' });
  }
  const createProduct = db.transaction(() => {
    const cover = coverUrl || gallery[0] || (type === 'manga' ? '/covers/thunder-blade.svg' : '/covers/mekong-moon.svg');
    const images = [...new Set([...(cover ? [cover] : []), ...gallery])];
    const result = one(`INSERT INTO books(title,author,description,cover_color,cover_url,gallery_json,product_type,price,stock_qty,language)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(title, author, String(req.body.description || '').trim().slice(0, 3000),
      /^#[\da-f]{6}$/i.test(req.body.cover_color) ? req.body.cover_color : '#266653', cover, JSON.stringify(images),
      type, price, stock, String(req.body.language || 'lo').slice(0, 10));
    if (validId(req.body.category_id)) one('INSERT OR IGNORE INTO book_categories(book_id,category_id) VALUES(?,?)').run(result.lastInsertRowid, Number(req.body.category_id));
    return result.lastInsertRowid;
  });
  return res.status(201).json({ id: createProduct() });
});

router.patch('/admin/products/:id', requireAuth, requireAdmin, (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'notFound' });
  const price = Number(req.body.price);
  const stock = Number(req.body.stock_qty);
  if (!Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'invalidProduct' });
  }
  const result = one("UPDATE books SET price=?,stock_qty=? WHERE id=? AND product_type IN ('novel','manga')")
    .run(price, stock, Number(req.params.id));
  return result.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'notFound' });
});

router.post('/orders', requireAuth, (req, res) => {
  const customerName = String(req.body.customer_name || '').trim().slice(0, 120);
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim().slice(0, 1000);
  const requested = req.body.items;
  if (!customerName || !/^\+?[\d\s().-]{8,20}$/.test(phone) || !address || address.length < 8
      || !Array.isArray(requested) || !requested.length || requested.length > 20) {
    return res.status(400).json({ error: 'invalidOrder' });
  }
  const quantities = new Map();
  for (const item of requested) {
    const id = Number(item?.book_id);
    const quantity = Number(item?.quantity);
    if (!validId(id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: 'invalidOrder' });
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  try {
    const createOrder = db.transaction(() => {
      const lines = [...quantities].map(([id, quantity]) => {
        const product = one('SELECT id,title,price,stock_qty,product_type FROM books WHERE id=? AND is_published=1').get(id);
        if (!product || !['novel', 'manga'].includes(product.product_type) || product.price < 1) throw Object.assign(new Error('productUnavailable'), { publicError: 'productUnavailable', httpStatus: 409 });
        if (product.stock_qty < quantity) throw Object.assign(new Error('insufficientStock'), { publicError: 'insufficientStock', httpStatus: 409 });
        return { ...product, quantity };
      });
      const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      if (!Number.isSafeInteger(total)) throw Object.assign(new Error('invalidOrder'), { publicError: 'invalidOrder', httpStatus: 400 });
      const order = one('INSERT INTO orders(user_id,customer_name,phone,address,total_amount) VALUES(?,?,?,?,?)')
        .run(req.user.id, customerName, phone, address, total);
      const addLine = one('INSERT INTO order_items(order_id,book_id,quantity,unit_price) VALUES(?,?,?,?)');
      const deduct = one('UPDATE books SET stock_qty=stock_qty-? WHERE id=? AND stock_qty>=?');
      lines.forEach((line) => {
        if (!deduct.run(line.quantity, line.id, line.quantity).changes) throw Object.assign(new Error('insufficientStock'), { publicError: 'insufficientStock', httpStatus: 409 });
        addLine.run(order.lastInsertRowid, line.id, line.quantity, line.price);
      });
      return { id: order.lastInsertRowid, total_amount: total };
    });
    return res.status(201).json(createOrder.immediate());
  } catch (error) {
    if (error.publicError) return res.status(error.httpStatus).json({ error: error.publicError });
    throw error;
  }
});

router.get('/shop/products', (_req, res) => res.json(all(`SELECT id,title,price,stock_qty,cover_url,product_type,gallery_json
  FROM books WHERE is_published=1 AND product_type IN ('novel','manga') AND price>0 ORDER BY title COLLATE NOCASE`).all()));

router.get('/orders', requireAuth, (req, res) => res.json(all(`SELECT o.id,o.customer_name,o.phone,o.address,o.total_amount,o.status,o.created_at,
    GROUP_CONCAT(b.title || ' × ' || oi.quantity, ', ') AS items
  FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN books b ON b.id=oi.book_id
  WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC`).all(req.user.id)));

router.get('/admin/dashboard', requireAuth, requireAdmin, (_req, res) => {
  const inventory = one(`SELECT COUNT(*) AS product_count,COALESCE(SUM(stock_qty),0) AS units_in_stock,
      COALESCE(SUM(CASE WHEN stock_qty BETWEEN 1 AND 5 THEN 1 ELSE 0 END),0) AS low_stock
    FROM books WHERE product_type IN ('novel','manga') AND is_published=1`).get();
  const sales = one(`SELECT COUNT(*) AS order_count,COALESCE(SUM(total_amount),0) AS revenue
    FROM orders WHERE status!='cancelled'`).get();
  const products = all(`SELECT id,title,author,product_type,price,stock_qty,cover_url,is_published
    FROM books WHERE product_type IN ('novel','manga') ORDER BY title COLLATE NOCASE`).all();
  const orders = all(`SELECT o.id,o.customer_name,o.phone,o.address,o.total_amount,o.status,o.created_at,
      GROUP_CONCAT(b.title || ' × ' || oi.quantity, ', ') AS items
    FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN books b ON b.id=oi.book_id
    GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`).all();
  return res.json({ ...inventory, ...sales, products, orders });
});

router.patch('/admin/orders/:id/status', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '');
  if (!validId(id) || !['processing', 'shipped', 'cancelled'].includes(status)) return res.status(400).json({ error: 'invalidOrderStatus' });
  const updateStatus = db.transaction(() => {
    const order = one('SELECT id,status FROM orders WHERE id=?').get(id);
    if (!order) return null;
    if (order.status === 'shipped' && status !== 'shipped') throw Object.assign(new Error('orderAlreadyShipped'), { publicError: 'orderAlreadyShipped' });
    if (order.status === 'cancelled' && status !== 'cancelled') throw Object.assign(new Error('orderAlreadyCancelled'), { publicError: 'orderAlreadyCancelled' });
    if (status === 'cancelled' && order.status !== 'cancelled') {
      all('SELECT book_id,quantity FROM order_items WHERE order_id=?').all(id)
        .forEach((line) => one('UPDATE books SET stock_qty=stock_qty+? WHERE id=?').run(line.quantity, line.book_id));
    }
    one('UPDATE orders SET status=? WHERE id=?').run(status, id);
    return { ok: true };
  });
  try {
    const result = updateStatus();
    return result ? res.json(result) : res.status(404).json({ error: 'notFound' });
  } catch (error) {
    if (error.publicError) return res.status(409).json({ error: error.publicError });
    throw error;
  }
});

module.exports = router;
