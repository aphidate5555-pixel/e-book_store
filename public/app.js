import * as THREE from 'three';

let strings = {};
let books = [];
let categories = [];
let selectedBook = null;
let pageFlip = null;
let currentPage = 1;
let registering = false;
let authToken = localStorage.getItem('ebook-token') || '';
let currentUser = JSON.parse(localStorage.getItem('ebook-user') || 'null');
let toastTimer;

// ຄົ້ນຫາຄຳແປຈາກ lo.json; ບໍ່ສ້າງຂໍ້ຄວາມ UI ທົດແທນແບບ hard-code.
function t(key) {
  return key.split('.').reduce((value, part) => value?.[part], strings) || strings.common?.error || '';
}
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  document.title = t('app.name');
}
async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`/api${url}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && authToken) signOut();
    const error = new Error(t(`auth.${body.error}`) || t(`common.${body.error}`) || t('common.error'));
    error.key = body.error;
    error.status = response.status;
    throw error;
  }
  return body;
}
function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
function signOut() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('ebook-token');
  localStorage.removeItem('ebook-user');
  updateAccount();
}
function updateAccount() {
  const button = document.querySelector('#auth-open');
  button.textContent = currentUser ? `${t('nav.logout')} · ${currentUser.username}` : t('nav.login');
  button.onclick = () => currentUser ? signOut() : openAuth(false);
  document.querySelector('#bookmarks-open').hidden = !currentUser;
  if (currentUser?.role === 'admin') {
    const adminButton = document.createElement('button');
    adminButton.className = 'quiet-button';
    adminButton.textContent = t('nav.admin');
    adminButton.onclick = () => document.querySelector('#admin-dialog').showModal();
    document.querySelector('#account-admin')?.remove();
    adminButton.id = 'account-admin';
    document.querySelector('.account').prepend(adminButton);
  } else document.querySelector('#account-admin')?.remove();
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function coverMarkup(book) {
  const color = /^#[\da-f]{6}$/i.test(book.cover_color || '') ? book.cover_color : '#347c69';
  return `<div class="book-art" data-detail="${book.id}"><div class="book-object"><div class="book-spine"></div><div class="book-front" style="background:${color}"><span class="book-top">${escapeHtml(t('app.name'))}</span><span class="book-title">${escapeHtml(book.title)}</span><span class="book-author">${escapeHtml(book.author)}</span></div></div></div>`;
}
function renderBooks() {
  const grid = document.querySelector('#book-grid');
  grid.innerHTML = books.map((book) => `<article class="book-item">${coverMarkup(book)}<div class="book-meta" data-detail="${book.id}"><h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.author)}</p><div class="rating">★ ${Number(book.avg_rating || 0).toFixed(1)} <span class="muted">(${book.review_count})</span></div></div></article>`).join('');
  grid.querySelectorAll('[data-detail]').forEach((el) => el.addEventListener('click', () => showDetails(Number(el.dataset.detail))));
  document.querySelector('#book-count').textContent = new Intl.NumberFormat('lo-LA').format(books.length);
  document.querySelector('#empty-state').hidden = books.length > 0;
  renderHeroBook(books[0]);
}
function renderCategories() {
  const markup = categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
  document.querySelector('#category').insertAdjacentHTML('beforeend', markup);
  document.querySelector('#admin-category').innerHTML = `<option value="">${escapeHtml(t('home.allCategories'))}</option>${markup}`;
}
async function loadBooks() {
  books = await api(`/books?q=${encodeURIComponent(document.querySelector('#search').value)}&category=${encodeURIComponent(document.querySelector('#category').value)}`);
  renderBooks();
}
function renderHeroBook(book) {
  const canvas = document.querySelector('#hero-book');
  if (!book || !canvas.clientWidth || canvas.dataset.ready) return;
  canvas.dataset.ready = 'true';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const light = new THREE.DirectionalLight(0xffe6bd, 3);
  light.position.set(-3, 5, 6); scene.add(light);
  const group = new THREE.Group(); scene.add(group);
  const color = /^#[\da-f]{6}$/i.test(book.cover_color || '') ? book.cover_color : '#347c69';
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.35, .12), new THREE.MeshStandardMaterial({ color, roughness: .58 }));
  group.add(cover);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(1.58, 2.27, .1), new THREE.MeshStandardMaterial({ color: '#eee6d5', roughness: 1 }));
  pages.position.z = -.09; group.add(pages);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.35, .18), new THREE.MeshStandardMaterial({ color: '#193f34' }));
  spine.position.x = -.81; group.add(spine);
  const resize = () => { const { width, height } = canvas.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
  resize(); window.addEventListener('resize', resize);
  let dragging = false; let lastX = 0;
  canvas.addEventListener('pointerdown', (event) => { dragging = true; lastX = event.clientX; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', (event) => { if (dragging) { group.rotation.y += (event.clientX - lastX) * .012; lastX = event.clientX; } });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  const animate = () => { if (!dragging) group.rotation.y += .003; group.rotation.x = .06 + Math.sin(Date.now() * .0007) * .035; renderer.render(scene, camera); requestAnimationFrame(animate); };
  animate();
}
function refreshThreeBook(book) {
  // ໂມເດວປົກຫຼັກເລືອກຕາມປຶ້ມທຳອິດ; ໂຫຼດໃໝ່ເມື່ອລາຍການປ່ຽນ.
  const canvas = document.querySelector('#hero-book');
  if (canvas.dataset.ready) { canvas.dataset.ready = ''; canvas.replaceWith(canvas.cloneNode()); }
  if (book) renderHeroBook(book);
}
async function showDetails(id) {
  try {
    selectedBook = books.find((book) => book.id === id) || await api(`/books/${id}`);
    const book = selectedBook;
    document.querySelector('#detail-cover').style.background = book.cover_color;
    document.querySelector('#detail-cover').textContent = book.title;
    document.querySelector('#detail-category').textContent = book.categories || t('home.allCategories');
    document.querySelector('#detail-title').textContent = book.title;
    document.querySelector('#detail-author').textContent = `${t('book.author')}: ${book.author}`;
    document.querySelector('#detail-description').textContent = book.description || '';
    document.querySelector('#detail-stats').textContent = `${t('book.pages')}: ${new Intl.NumberFormat('lo-LA').format(book.total_pages)} · ★ ${Number(book.avg_rating).toFixed(1)} (${book.review_count})`;
    document.querySelector('#review-list').innerHTML = '';
    const reviews = await api(`/books/${id}/reviews`);
    document.querySelector('#review-list').innerHTML = reviews.map((review) => `<div class="review"><b>${escapeHtml(review.username)} · ${'★'.repeat(review.rating)}</b><p>${escapeHtml(review.comment || '')}</p><small>${new Intl.DateTimeFormat('lo-LA', { dateStyle: 'medium' }).format(new Date(`${review.created_at.replace(' ', 'T')}Z`))}</small></div>`).join('');
    document.querySelector('#detail-dialog').showModal();
  } catch (error) { notify(error.message); }
}
async function openReader(book = selectedBook, targetPage = null) {
  if (!book) return;
  try {
    const pages = await api(`/books/${book.id}/pages`);
    if (!pages.length) return notify(t('home.noResults'));
    document.querySelector('#detail-dialog').close();
    document.querySelector('#reader-title').textContent = book.title;
    const host = document.querySelector('#flipbook');
    host.innerHTML = pages.map((page) => `<div class="page"><h3>${escapeHtml(page.title || '')}</h3><p>${escapeHtml(page.content)}</p></div>`).join('');
    currentPage = 1;
    if (authToken) {
      const progress = await api(`/books/${book.id}/progress`);
      currentPage = Math.min(Number(targetPage || progress.last_page) || 1, pages.length);
    }
    document.querySelector('#reader-dialog').showModal();
    if (window.St?.PageFlip) {
      pageFlip = new window.St.PageFlip(host, { width: 420, height: 540, size: 'stretch', minWidth: 280, maxWidth: 920, minHeight: 360, maxHeight: 680, showCover: false, mobileScrollSupport: true, flippingTime: 650, usePortrait: true, drawShadow: true });
      pageFlip.loadFromHTML(host.querySelectorAll('.page'));
      pageFlip.on('flip', (event) => { currentPage = event.data + 1; updatePageLabel(pages.length); saveProgress(); });
      if (currentPage > 1) pageFlip.turnToPage(currentPage - 1);
    }
    updatePageLabel(pages.length);
    if (authToken) saveProgress();
    document.querySelector('#page-prev').onclick = () => pageFlip?.flipPrev('top');
    document.querySelector('#page-next').onclick = () => pageFlip?.flipNext('top');
    document.querySelector('#bookmark-toggle').onclick = addBookmark;
  } catch (error) { notify(error.message); }
}
function updatePageLabel(total) {
  document.querySelector('#page-label').textContent = `${t('reader.page')} ${new Intl.NumberFormat('lo-LA').format(currentPage)} ${t('reader.of')} ${new Intl.NumberFormat('lo-LA').format(total)}`;
}
async function saveProgress() {
  if (!authToken || !selectedBook) return;
  const saved = JSON.parse(localStorage.getItem('ebook-progress') || '{}');
  saved[selectedBook.id] = currentPage;
  localStorage.setItem('ebook-progress', JSON.stringify(saved));
  loadContinueReading();
  try { await api(`/books/${selectedBook.id}/progress`, { method: 'PUT', body: JSON.stringify({ page: currentPage }) }); } catch (error) { notify(error.message); }
}
async function addBookmark() {
  if (!authToken) return openAuth(false);
  try { await api(`/books/${selectedBook.id}/bookmarks`, { method: 'POST', body: JSON.stringify({ page: currentPage }) }); notify(t('reader.bookmarkSaved')); }
  catch (error) { notify(error.message); }
}
function openAuth(register) {
  registering = register;
  document.querySelector('#auth-title').textContent = t(register ? 'auth.registerTitle' : 'auth.loginTitle');
  document.querySelector('#register-fields').hidden = !register;
  document.querySelector('#identity').closest('.form-field').hidden = register;
  document.querySelector('#identity').required = !register;
  document.querySelector('#new-username').required = register;
  document.querySelector('#new-email').required = register;
  document.querySelector('#auth-form button[type=submit]').textContent = t(register ? 'nav.register' : 'nav.login');
  document.querySelector('#auth-switch').textContent = t(register ? 'auth.haveAccount' : 'auth.needAccount');
  document.querySelector('#auth-error').textContent = '';
  document.querySelector('#auth-dialog').showModal();
}
async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const endpoint = registering ? '/auth/register' : '/auth/login';
    const payload = registering ? { username: form.get('username'), email: form.get('email'), password: form.get('password') }
      : { identity: form.get('identity'), password: form.get('password') };
    const result = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    authToken = result.token;
    const tokenPayload = authToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    currentUser = result.user || JSON.parse(decodeURIComponent(escape(atob(tokenPayload))));
    localStorage.setItem('ebook-token', authToken);
    localStorage.setItem('ebook-user', JSON.stringify(currentUser));
    updateAccount();
    document.querySelector('#auth-dialog').close();
    notify(t(registering ? 'auth.registerSuccess' : 'auth.loginSuccess'));
    loadContinueReading();
  } catch (error) { document.querySelector('#auth-error').textContent = error.message; }
}
async function loadContinueReading() {
  const section = document.querySelector('#continue-section');
  if (!authToken) { section.hidden = true; return; }
  const saved = JSON.parse(localStorage.getItem('ebook-progress') || '{}');
  section.hidden = !Object.keys(saved).length;
  document.querySelector('#continue-list').innerHTML = Object.entries(saved).map(([id, page]) => {
    const book = books.find((item) => item.id === Number(id));
    return book ? `<button class="continue-chip" data-continue="${book.id}">${escapeHtml(book.title)} · ${t('reader.page')} ${new Intl.NumberFormat('lo-LA').format(page)}</button>` : '';
  }).join('');
  document.querySelectorAll('[data-continue]').forEach((button) => button.onclick = () => showDetails(Number(button.dataset.continue)).then(() => openReader()));
}
async function openBookmarks() {
  try {
    const items = await api('/bookmarks');
    const list = document.querySelector('#bookmark-list');
    list.innerHTML = items.length ? items.map((item) => `<div class="bookmark-row"><button data-open-bookmark="${item.book_id}" data-page="${item.page_number}">${escapeHtml(item.title)} · ${t('reader.page')} ${item.page_number}</button><button data-remove-bookmark="${item.id}" aria-label="${escapeHtml(t('common.delete'))}">${escapeHtml(t('common.delete'))}</button></div>`).join('') : `<p class="muted">${t('reader.emptyBookmarks')}</p>`;
    list.querySelectorAll('[data-open-bookmark]').forEach((button) => button.onclick = async () => { document.querySelector('#bookmarks-dialog').close(); await showDetails(Number(button.dataset.openBookmark)); await openReader(selectedBook, Number(button.dataset.page)); });
    list.querySelectorAll('[data-remove-bookmark]').forEach((button) => button.onclick = async () => { try { await api(`/bookmarks/${button.dataset.removeBookmark}`, { method: 'DELETE' }); openBookmarks(); notify(t('reader.bookmarkRemoved')); } catch (error) { notify(error.message); } });
    document.querySelector('#bookmarks-dialog').showModal();
  } catch (error) { notify(error.message); }
}
async function createBook(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const pages = String(data.get('pages_text')).split(/^\s*---\s*$/m).map((part) => {
    const lines = part.trim().split('\n');
    return { title: lines.shift() || '', content: lines.join('\n').trim() };
  }).filter((page) => page.content);
  try {
    await api('/admin/books', { method: 'POST', body: JSON.stringify({ title: data.get('title'), author: data.get('author'), description: data.get('description'), cover_color: data.get('cover_color'), category_id: data.get('category_id'), language: 'lo', pages }) });
    document.querySelector('#admin-dialog').close();
    event.currentTarget.reset();
    await loadBooks(); notify(t('admin.bookSaved'));
  } catch (error) { document.querySelector('#admin-error').textContent = error.message; }
}
async function submitReview(event) {
  event.preventDefault();
  if (!authToken) return openAuth(false);
  try {
    await api(`/books/${selectedBook.id}/reviews`, { method: 'POST', body: JSON.stringify({ rating: Number(document.querySelector('#rating').value), comment: document.querySelector('#review-comment').value }) });
    document.querySelector('#review-comment').value = '';
    await showDetails(selectedBook.id); notify(t('common.success'));
  } catch (error) { notify(error.message); }
}
function bindEvents() {
  let searchTimer;
  document.querySelector('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadBooks().catch((error) => notify(error.message)), 220); });
  document.querySelector('#category').addEventListener('change', () => loadBooks().catch((error) => notify(error.message)));
  document.querySelector('#auth-open').onclick = () => currentUser ? signOut() : openAuth(false);
  document.querySelector('#auth-form').addEventListener('submit', handleAuth);
  document.querySelector('#auth-switch').onclick = () => openAuth(!registering);
  document.querySelector('#read-start').onclick = () => openReader();
  document.querySelector('#review-form').addEventListener('submit', submitReview);
  document.querySelector('#admin-form').addEventListener('submit', createBook);
  document.querySelector('#bookmarks-open').onclick = () => openBookmarks();
  document.querySelector('#theme-toggle').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('ebook-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close()));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
}
async function init() {
  try {
    strings = await fetch('/lo.json').then((response) => response.json());
    applyTranslations(); updateAccount(); bindEvents();
    if (localStorage.getItem('ebook-theme') === 'dark') document.body.classList.add('dark');
    [categories] = await Promise.all([api('/categories')]);
    renderCategories(); await loadBooks(); await loadContinueReading();
  } catch (error) { notify(error.message || t('common.error')); }
}
init();
