const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./database');
const { getSecret, requireAuth, requireAdmin } = require('./auth');

const router = express.Router();
const one = (sql) => db.prepare(sql);
const all = (sql) => db.prepare(sql);
const validId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

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
    return res.status(201).json({ token: makeToken({ id: result.lastInsertRowid, username, role: 'reader' }) });
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
  const books = all(`SELECT b.id,b.title,b.author,b.description,b.cover_color,b.cover_url,b.language,b.created_at,
      COALESCE(s.avg_rating,0) avg_rating, COALESCE(s.review_count,0) review_count, COALESCE(s.total_pages,0) total_pages,
      GROUP_CONCAT(DISTINCT c.name) categories
    FROM books b LEFT JOIN book_stats s ON s.id=b.id
    LEFT JOIN book_categories bc ON bc.book_id=b.id LEFT JOIN categories c ON c.id=bc.category_id
    WHERE b.is_published=1 AND (b.title LIKE ? OR b.author LIKE ?)
      AND (? IS NULL OR EXISTS(SELECT 1 FROM book_categories x WHERE x.book_id=b.id AND x.category_id=?))
    GROUP BY b.id ORDER BY b.created_at DESC`).all(q, q, categoryId, categoryId);
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
  try {
    one('INSERT INTO reviews(book_id,user_id,rating,comment) VALUES(?,?,?,?)')
      .run(Number(req.params.id), req.user.id, rating, String(req.body.comment || '').trim().slice(0, 1000) || null);
    return res.status(201).json({ ok: true });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'alreadyReviewed' });
    throw error;
  }
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
  if (!String(title || '').trim() || !String(author || '').trim() || !Array.isArray(pages) || pages.length < 1 || pages.length > 300) {
    return res.status(400).json({ error: 'invalidBook' });
  }
  const addBook = db.transaction(() => {
    const result = one(`INSERT INTO books(title,author,description,cover_color,cover_url,language)
      VALUES(?,?,?,?,?,?)`).run(String(title).trim(), String(author).trim(), String(description || '').trim(),
      /^#[0-9a-f]{6}$/i.test(cover_color) ? cover_color : '#347c69', String(cover_url || '').trim() || null,
      String(language || 'lo').slice(0, 10));
    const bookId = result.lastInsertRowid;
    if (validId(category_id)) one('INSERT OR IGNORE INTO book_categories(book_id,category_id) VALUES(?,?)').run(bookId, Number(category_id));
    const insertPage = one('INSERT INTO pages(book_id,page_number,title,content) VALUES(?,?,?,?)');
    pages.forEach((page, index) => insertPage.run(bookId, index + 1, String(page.title || '').slice(0, 150), String(page.content || '')));
    return bookId;
  });
  return res.status(201).json({ id: addBook() });
});

module.exports = router;
