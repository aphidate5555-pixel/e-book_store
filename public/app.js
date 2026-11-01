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
let cart = JSON.parse(localStorage.getItem('ebook-cart') || '[]');
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
    const dashboardButton = document.createElement('button');
    dashboardButton.className = 'quiet-button';
    dashboardButton.textContent = t('nav.dashboard');
    dashboardButton.id = 'account-dashboard';
    dashboardButton.onclick = openDashboard;
    document.querySelector('#account-dashboard')?.remove();
    document.querySelector('.account').prepend(dashboardButton);
  } else { document.querySelector('#account-admin')?.remove(); document.querySelector('#account-dashboard')?.remove(); }
  renderCartCount();
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function coverMarkup(book) {
  const color = /^#[\da-f]{6}$/i.test(book.cover_color || '') ? book.cover_color : '#347c69';
  const art = book.cover_url
    ? `<img class="book-cover-image" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" loading="lazy">`
    : `<div class="book-front" style="background:${color}"><span class="book-top">${escapeHtml(t('app.name'))}</span><span class="book-title">${escapeHtml(book.title)}</span><span class="book-author">${escapeHtml(book.author)}</span></div>`;
  return `<div class="book-art" data-detail="${book.id}"><div class="book-object"><div class="book-spine"></div>${art}</div></div>`;
}
function renderBooks() {
  const grid = document.querySelector('#book-grid');
  grid.innerHTML = books.map((book) => `<article class="book-item">${coverMarkup(book)}<div class="book-meta" data-detail="${book.id}"><h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.author)}</p><div class="rating">★ ${Number(book.avg_rating || 0).toFixed(1)} <span class="muted">(${book.review_count})</span></div>${Number(book.price) > 0 ? `<p class="product-price">${formatMoney(book.price)} · ${Number(book.stock_qty) > 0 ? t('shop.inStock') : t('shop.outOfStock')}</p>` : ''}</div></article>`).join('');
  grid.querySelectorAll('[data-detail]').forEach((el) => el.addEventListener('click', () => showDetails(Number(el.dataset.detail))));
  document.querySelector('#book-count').textContent = new Intl.NumberFormat('lo-LA').format(books.length);
  document.querySelector('#empty-state').hidden = books.length > 0;
  renderHeroBook(books[0]);
}
function renderCategories() {
  const markup = categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
  document.querySelector('#category').insertAdjacentHTML('beforeend', markup);
  const categorySelect = `<option value="">${escapeHtml(t('home.allCategories'))}</option>${markup}`;
  document.querySelector('#admin-category').innerHTML = categorySelect;
  document.querySelector('#product-category').innerHTML = categorySelect;
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
    const detailCover = document.querySelector('#detail-cover');
    detailCover.style.background = book.cover_color;
    detailCover.replaceChildren();
    if (book.cover_url) {
      const image = document.createElement('img');
      image.src = book.cover_url;
      image.alt = book.title;
      detailCover.append(image);
    } else detailCover.textContent = book.title;
    const gallery = document.querySelector('#detail-gallery');
    let galleryImages = [];
    try { galleryImages = JSON.parse(book.gallery_json || '[]'); } catch { galleryImages = []; }
    if (book.cover_url && !galleryImages.includes(book.cover_url)) galleryImages.unshift(book.cover_url);
    gallery.innerHTML = galleryImages.map((url, index) => `<button type="button" class="gallery-thumb ${index === 0 ? 'selected' : ''}" data-gallery-image="${index}" aria-label="${escapeHtml(book.title)} ${index + 1}"><img src="${escapeHtml(url)}" alt=""></button>`).join('');
    gallery.querySelectorAll('[data-gallery-image]').forEach((button) => button.onclick = () => {
      const image = document.createElement('img'); image.src = galleryImages[Number(button.dataset.galleryImage)]; image.alt = book.title;
      detailCover.replaceChildren(image); gallery.querySelectorAll('.gallery-thumb').forEach((thumb) => thumb.classList.toggle('selected', thumb === button));
    });
    document.querySelector('#detail-category').textContent = book.categories || t('home.allCategories');
    document.querySelector('#detail-title').textContent = book.title;
    document.querySelector('#detail-author').textContent = `${t('book.author')}: ${book.author}`;
    document.querySelector('#detail-description').textContent = book.description || '';
    document.querySelector('#detail-stats').textContent = `${Number(book.total_pages) > 0 ? `${t('book.pages')}: ${new Intl.NumberFormat('lo-LA').format(book.total_pages)} · ` : ''}★ ${Number(book.avg_rating).toFixed(1)} (${book.review_count})`;
    const physical = ['novel', 'manga'].includes(book.product_type);
    document.querySelector('#read-start').hidden = physical;
    document.querySelector('#add-to-cart').hidden = !physical || Number(book.stock_qty) < 1 || Number(book.price) < 1;
    document.querySelector('#detail-price').textContent = physical ? `${formatMoney(book.price)} · ${Number(book.stock_qty) > 0 ? t('shop.inStock') + ': ' + book.stock_qty : t('shop.outOfStock')}` : '';
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
    await api('/admin/books', { method: 'POST', body: JSON.stringify({ title: data.get('title'), author: data.get('author'), description: data.get('description'), cover_url: data.get('cover_url'), cover_color: data.get('cover_color'), category_id: data.get('category_id'), language: 'lo', pages }) });
    document.querySelector('#admin-dialog').close();
    event.currentTarget.reset();
    await loadBooks(); notify(t('admin.bookSaved'));
  } catch (error) { document.querySelector('#admin-error').textContent = error.message; }
}
function formatMoney(value) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function saveCart() { localStorage.setItem('ebook-cart', JSON.stringify(cart)); renderCartCount(); }
function renderCartCount() {
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const badge = document.querySelector('#cart-count');
  if (badge) badge.textContent = new Intl.NumberFormat('lo-LA').format(count);
}
function addToCart(book) {
  const existing = cart.find((item) => item.id === book.id);
  if (existing) {
    if (existing.quantity >= Number(book.stock_qty)) return notify(t('shop.insufficientStock'));
    existing.quantity += 1;
  } else cart.push({ id: book.id, title: book.title, price: Number(book.price), stock_qty: Number(book.stock_qty), cover_url: book.cover_url, quantity: 1 });
  saveCart();
  notify(t('common.success'));
}
function renderCart() {
  const lines = document.querySelector('#cart-lines');
  if (!cart.length) lines.innerHTML = `<p class="muted">${t('shop.emptyCart')}</p>`;
  else lines.innerHTML = cart.map((item) => `<div class="cart-line"><div>${item.cover_url ? `<img src="${escapeHtml(item.cover_url)}" alt="">` : ''}<span><b>${escapeHtml(item.title)}</b><small>${formatMoney(item.price)}</small></span></div><label><span class="sr-only">${escapeHtml(item.title)}</span><input type="number" min="1" max="${Math.max(1, item.stock_qty)}" value="${item.quantity}" data-cart-qty="${item.id}"></label><button class="text-button" type="button" data-cart-remove="${item.id}">${t('shop.remove')}</button></div>`).join('');
  const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  document.querySelector('#cart-total').textContent = `${t('shop.price').split(' ')[0]}: ${formatMoney(total)}`;
  lines.querySelectorAll('[data-cart-qty]').forEach((input) => input.onchange = () => { const item = cart.find((line) => line.id === Number(input.dataset.cartQty)); if (!item) return; item.quantity = Math.max(1, Math.min(item.stock_qty, Number(input.value) || 1)); saveCart(); renderCart(); });
  lines.querySelectorAll('[data-cart-remove]').forEach((button) => button.onclick = () => { cart = cart.filter((item) => item.id !== Number(button.dataset.cartRemove)); saveCart(); renderCart(); });
  document.querySelector('#checkout-submit').disabled = !cart.length;
}
async function openCart() {
  if (cart.length) {
    try {
      const latest = await api('/shop/products');
      const byId = new Map(latest.map((item) => [item.id, item]));
      const previousCount = cart.length;
      cart = cart.filter((item) => byId.has(item.id) && byId.get(item.id).stock_qty > 0)
        .map((item) => ({ ...item, ...byId.get(item.id), quantity: Math.min(item.quantity, byId.get(item.id).stock_qty) }));
      saveCart();
      if (cart.length < previousCount) notify(t('shop.productUnavailable'));
    } catch (error) { notify(error.message); }
  }
  renderCart();
  document.querySelector('#cart-dialog').showModal();
}
async function openDashboard() {
  try {
    const data = await api('/admin/dashboard');
    document.querySelector('#dashboard-metrics').innerHTML = [
      [t('shop.products'), data.product_count], [t('shop.units'), data.units_in_stock],
      [t('shop.lowStock'), data.low_stock], [t('shop.orders'), data.order_count], [t('shop.revenue'), formatMoney(data.revenue)]
    ].map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('');
    const inventory = document.querySelector('#inventory-list');
    inventory.innerHTML = data.products.length ? data.products.map((product) => `<div class="inventory-row"><span><b>${escapeHtml(product.title)}</b><small>${t(product.product_type === 'manga' ? 'shop.manga' : 'shop.novel')}</small></span><label>${t('shop.price')}<input type="number" min="0" value="${product.price}" data-price="${product.id}"></label><label>${t('shop.stock')}<input type="number" min="0" value="${product.stock_qty}" data-stock="${product.id}"></label><button class="quiet-button" data-save-stock="${product.id}">${t('shop.saveStock')}</button></div>`).join('') : `<p class="muted">${t('shop.noProducts')}</p>`;
    inventory.querySelectorAll('[data-save-stock]').forEach((button) => button.onclick = async () => {
      const id = button.dataset.saveStock;
      try { await api(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify({ price: Number(inventory.querySelector(`[data-price="${id}"]`).value), stock_qty: Number(inventory.querySelector(`[data-stock="${id}"]`).value) }) }); notify(t('common.success')); openDashboard(); loadBooks(); }
      catch (error) { notify(error.message); }
    });
    const orderList = document.querySelector('#orders-list');
    orderList.innerHTML = data.orders.length ? data.orders.map((order) => `<article class="order-row"><div><b>#${order.id} · ${escapeHtml(order.customer_name)}</b><p>${escapeHtml(order.items || '')}</p><small>${escapeHtml(order.phone)} · ${escapeHtml(order.address)}</small><strong>${formatMoney(order.total_amount)}</strong></div><label>${t('shop.orderStatus')}<select data-order-status="${order.id}" ${['shipped','cancelled'].includes(order.status) ? 'disabled' : ''}><option value="placed" ${order.status === 'placed' ? 'selected' : ''}>${t('shop.placed')}</option><option value="processing" ${order.status === 'processing' ? 'selected' : ''}>${t('shop.processing')}</option><option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>${t('shop.shipped')}</option><option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>${t('shop.cancelled')}</option></select></label></article>`).join('') : `<p class="muted">${t('shop.noOrders')}</p>`;
    orderList.querySelectorAll('[data-order-status]').forEach((select) => select.onchange = async () => { try { await api(`/admin/orders/${select.dataset.orderStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); notify(t('common.success')); openDashboard(); } catch (error) { notify(error.message); } });
    document.querySelector('#dashboard-dialog').showModal();
  } catch (error) { notify(error.message); }
}
async function createProduct(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await api('/admin/products', { method: 'POST', body: JSON.stringify({ title: data.get('title'), author: data.get('author'), description: data.get('description'), product_type: data.get('product_type'), price: Number(data.get('price')), stock_qty: Number(data.get('stock_qty')), cover_url: data.get('cover_url'), image_urls: String(data.get('image_urls') || '').split(/\r?\n/).map((url) => url.trim()).filter(Boolean), category_id: data.get('category_id'), language: 'lo' }) });
    event.currentTarget.reset(); document.querySelector('#product-dialog').close(); await loadBooks(); notify(t('common.success'));
  } catch (error) { document.querySelector('#product-error').textContent = t(`auth.${error.key}`) || error.message; }
}
async function submitOrder(event) {
  event.preventDefault();
  if (!authToken) { document.querySelector('#cart-dialog').close(); return openAuth(false); }
  const data = new FormData(event.currentTarget);
  try {
    await api('/orders', { method: 'POST', body: JSON.stringify({ customer_name: data.get('customer_name'), phone: data.get('phone'), address: data.get('address'), items: cart.map((item) => ({ book_id: item.id, quantity: item.quantity })) }) });
    cart = []; saveCart(); event.currentTarget.reset(); document.querySelector('#cart-dialog').close(); await loadBooks(); notify(t('shop.orderSuccess'));
  } catch (error) { document.querySelector('#checkout-error').textContent = t(`shop.${error.key}`) || t(`auth.${error.key}`) || error.message; }
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
  document.querySelector('#product-form').addEventListener('submit', createProduct);
  document.querySelector('#dashboard-add-product').onclick = () => { document.querySelector('#dashboard-dialog').close(); document.querySelector('#product-dialog').showModal(); };
  document.querySelector('#add-to-cart').onclick = () => { addToCart(selectedBook); document.querySelector('#detail-dialog').close(); openCart(); };
  document.querySelector('#cart-open').onclick = openCart;
  document.querySelector('#checkout-form').addEventListener('submit', submitOrder);
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
