import * as THREE from 'three';
import { gsap } from 'gsap';

let strings = {};
let currentLang = localStorage.getItem('ebook-lang') || 'lo';
let books = [];
let categories = [];
let selectedBook = null;
let heroStageBook = null;
let activeTypeFilter = '';
let wishlistIds = new Set(JSON.parse(localStorage.getItem('ebook-wishlist') || '[]'));
let pageFlip = null;
let currentPage = 1;
let readerScale = Number(localStorage.getItem('ebook-reader-scale') || 1);
let registering = false;
let authToken = localStorage.getItem('ebook-token') || '';
let currentUser = JSON.parse(localStorage.getItem('ebook-user') || 'null');
let cart = JSON.parse(localStorage.getItem('ebook-cart') || '[]');
let toastTimer;

// React Three Fiber (R3F) Declarative Scene Controller State
let r3fStage = null;

function t(key) {
  return key.split('.').reduce((value, part) => value?.[part], strings) || strings.common?.error || key;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  document.title = t('app.name');
  const langBtn = document.querySelector('#lang-toggle');
  if (langBtn) langBtn.textContent = currentLang === 'lo' ? 'LA' : 'TH';
}

async function switchLanguage(nextLang) {
  currentLang = nextLang;
  localStorage.setItem('ebook-lang', currentLang);
  const file = currentLang === 'th' ? '/th.json' : '/lo.json';
  strings = await fetch(file).then((r) => r.json()).catch(() => strings);
  applyTranslations();
  updateAccount();
  renderBooks(false);
  loadContinueReading();
}

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`/api${url}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && authToken) signOut();
    const error = new Error(t(`auth.${body.error}`) || t(`shop.${body.error}`) || t(`common.${body.error}`) || t('common.error'));
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
  button.onclick = () => (currentUser ? signOut() : openAuth(false));
  document.querySelector('#bookmarks-open').hidden = !currentUser;
  document.querySelector('#orders-open').hidden = !currentUser;
  if (currentUser?.role === 'admin') {
    const adminButton = document.createElement('button');
    adminButton.className = 'quiet-button';
    adminButton.type = 'button';
    adminButton.textContent = t('nav.admin');
    adminButton.onclick = () => document.querySelector('#admin-dialog').showModal();
    document.querySelector('#account-admin')?.remove();
    adminButton.id = 'account-admin';
    document.querySelector('.account').prepend(adminButton);

    const dashboardButton = document.createElement('button');
    dashboardButton.className = 'quiet-button';
    dashboardButton.type = 'button';
    dashboardButton.textContent = t('nav.dashboard');
    dashboardButton.id = 'account-dashboard';
    dashboardButton.onclick = openDashboard;
    document.querySelector('#account-dashboard')?.remove();
    document.querySelector('.account').prepend(dashboardButton);
  } else {
    document.querySelector('#account-admin')?.remove();
    document.querySelector('#account-dashboard')?.remove();
  }
  renderCartCount();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function typeBadgeMarkup(productType) {
  if (productType === 'manga') return `<span class="type-badge manga">${escapeHtml(t('shop.manga'))}</span>`;
  if (productType === 'novel') return `<span class="type-badge novel">${escapeHtml(t('shop.novel'))}</span>`;
  return `<span class="type-badge">${escapeHtml(t('shop.ebook'))}</span>`;
}

function coverMarkup(book) {
  const color = /^#[\da-f]{6}$/i.test(book.cover_color || '') ? book.cover_color : '#266653';
  const art = book.cover_url
    ? `<img class="book-cover-image" src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}" loading="lazy">`
    : `<div class="book-front" style="background:${color}"><span class="book-top">${escapeHtml(t('app.name'))}</span><span class="book-title">${escapeHtml(book.title)}</span><span class="book-author">${escapeHtml(book.author)}</span></div>`;
  return `<div class="book-art" data-detail="${book.id}">
    <div class="book-object">
      <div class="book-spine" style="background:linear-gradient(90deg,#0f241d,${color})"></div>
      <div class="book-pages-edge"></div>
      ${art}
      <div class="book-glare"></div>
    </div>
  </div>`;
}

function getDisplayedBooks() {
  if (activeTypeFilter === 'wishlist') {
    return books.filter((b) => wishlistIds.has(b.id));
  }
  return books;
}

function renderHeroDock() {
  const dock = document.querySelector('#hero-dock');
  if (!dock) return;
  const featured = books.slice(0, 8);
  if (!heroStageBook && featured.length) heroStageBook = featured[0];
  dock.innerHTML = featured.map((book) => `
    <button type="button" class="dock-item ${heroStageBook?.id === book.id ? 'active' : ''}" data-dock-book="${book.id}" title="${escapeHtml(book.title)}">
      ${book.cover_url ? `<img src="${escapeHtml(book.cover_url)}" alt="${escapeHtml(book.title)}">` : `<span style="display:block;width:100%;height:100%;background:${escapeHtml(book.cover_color)}"></span>`}
    </button>
  `).join('');

  dock.querySelectorAll('[data-dock-book]').forEach((btn) => {
    btn.onclick = () => {
      const target = books.find((b) => b.id === Number(btn.dataset.dockBook));
      if (target) setHeroStageBook(target);
    };
  });
}

function setHeroStageBook(book) {
  if (!book) return;
  heroStageBook = book;
  document.querySelectorAll('.dock-item').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.dockBook) === book.id);
  });
  const badge = document.querySelector('#hero-book-badge');
  if (badge) {
    const label = book.product_type === 'ebook' ? t('book.freeEbook') : formatMoney(book.price);
    badge.textContent = `${book.title} · ${label}`;
  }
  const heroAction = document.querySelector('#hero-open-detail');
  if (heroAction) {
    heroAction.textContent = `${t('book.startReading')} — ${book.title}`;
    heroAction.onclick = () => showDetails(book.id);
  }
  initOrUpdateR3FStage(book);
}

function attachCard3DTilt(grid) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;
  grid.querySelectorAll('.book-item').forEach((card) => {
    const obj = card.querySelector('.book-object');
    if (!obj) return;
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      const ry = -16 + nx * 28;
      const rx = 2 - ny * 18;
      obj.style.setProperty('--ry', `${ry.toFixed(1)}deg`);
      obj.style.setProperty('--rx', `${rx.toFixed(1)}deg`);
      card.style.setProperty('--gx', `${((nx + 0.5) * 100).toFixed(0)}%`);
      card.style.setProperty('--gy', `${((ny + 0.5) * 100).toFixed(0)}%`);
    });
    card.addEventListener('pointerleave', () => {
      obj.style.setProperty('--ry', '-22deg');
      obj.style.setProperty('--rx', '3deg');
    });
  });
}

function renderBooks(animateEntrance = true) {
  const grid = document.querySelector('#book-grid');
  const displayed = getDisplayedBooks();
  const locale = currentLang === 'th' ? 'th-TH' : 'lo-LA';

  grid.innerHTML = displayed.map((book) => {
    const wished = wishlistIds.has(book.id);
    const isPhysical = ['novel', 'manga'].includes(book.product_type) && Number(book.price) > 0;
    const priceLabel = isPhysical
      ? `${formatMoney(book.price)} · ${Number(book.stock_qty) > 0 ? t('shop.inStock') : t('shop.outOfStock')}`
      : t('book.freeEbook');

    return `<article class="book-item" data-book-card="${book.id}">
      <div class="card-top-bar">
        ${typeBadgeMarkup(book.product_type)}
        <button type="button" class="wishlist-btn ${wished ? 'active' : ''}" data-wishlist="${book.id}" aria-label="Wishlist">${wished ? '♥' : '♡'}</button>
      </div>
      ${coverMarkup(book)}
      <div class="book-meta" data-detail="${book.id}">
        <h3>${escapeHtml(book.title)}</h3>
        <p>${escapeHtml(book.author)}</p>
        <div class="meta-row">
          <span class="rating">★ ${Number(book.avg_rating || 0).toFixed(1)} <span class="muted">(${book.review_count})</span></span>
          <span class="product-price">${escapeHtml(priceLabel)}</span>
        </div>
      </div>
      <div class="card-quick-actions">
        <button type="button" class="quiet-button" data-stage-pick="${book.id}">3D</button>
        ${isPhysical && Number(book.stock_qty) > 0
          ? `<button type="button" class="primary-button" data-quick-cart="${book.id}">${escapeHtml(t('shop.addToCart'))}</button>`
          : `<button type="button" class="primary-button" data-quick-read="${book.id}">${escapeHtml(t('book.startReading'))}</button>`}
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-detail]').forEach((el) => el.addEventListener('click', () => showDetails(Number(el.dataset.detail))));
  grid.querySelectorAll('[data-wishlist]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWishlist(Number(btn.dataset.wishlist));
  }));
  grid.querySelectorAll('[data-stage-pick]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const book = books.find((b) => b.id === Number(btn.dataset.stagePick));
    if (book) {
      setHeroStageBook(book);
      document.querySelector('#home')?.scrollIntoView({ behavior: 'smooth' });
    }
  }));
  grid.querySelectorAll('[data-quick-read]').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const book = books.find((b) => b.id === Number(btn.dataset.quickRead));
    if (book) {
      selectedBook = book;
      await openReader(book);
    }
  }));
  grid.querySelectorAll('[data-quick-cart]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const book = books.find((b) => b.id === Number(btn.dataset.quickCart));
    const cardImg = btn.closest('.book-item')?.querySelector('.book-cover-image');
    if (book) addToCart(book, cardImg || btn);
  }));

  attachCard3DTilt(grid);

  document.querySelector('#book-count').textContent = new Intl.NumberFormat(locale).format(displayed.length);
  document.querySelector('#empty-state').hidden = displayed.length > 0;

  renderHeroDock();
  if (!heroStageBook && books[0]) setHeroStageBook(books[0]);
  else if (heroStageBook) setHeroStageBook(books.find((b) => b.id === heroStageBook.id) || books[0]);

  if (animateEntrance && displayed.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo(
      grid.querySelectorAll('.book-item'),
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.48, stagger: 0.045, ease: 'power3.out', clearProps: 'transform,opacity' }
    );
  }
}

function renderCategories() {
  const markup = categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
  const categoryEl = document.querySelector('#category');
  categoryEl.innerHTML = `<option value="" data-i18n="home.allCategories">${escapeHtml(t('home.allCategories'))}</option>${markup}`;
  const categorySelect = `<option value="">${escapeHtml(t('home.allCategories'))}</option>${markup}`;
  document.querySelector('#admin-category').innerHTML = categorySelect;
  document.querySelector('#product-category').innerHTML = categorySelect;
}

async function loadBooks() {
  const q = encodeURIComponent(document.querySelector('#search').value);
  const category = encodeURIComponent(document.querySelector('#category').value);
  const sort = encodeURIComponent(document.querySelector('#sort-select')?.value || 'popular');
  const typeParam = ['ebook', 'novel', 'manga'].includes(activeTypeFilter) ? `&type=${activeTypeFilter}` : '';
  books = await api(`/books?q=${q}&category=${category}&sort=${sort}${typeParam}`);
  renderBooks(true);
}

// ============================================================================
// React Three Fiber (R3F) & Drei Inspired 3D Stage Engine
// Declarative Multi-Material Book Mesh + PBR Texture + Float + Dust Particles
// ============================================================================
function createFallbackCoverTexture(book) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 720;
  const ctx = c.getContext('2d');
  const color = /^#[\da-f]{6}$/i.test(book.cover_color || '') ? book.cover_color : '#266653';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.75)';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Noto Sans Lao", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(book.title || '').slice(0, 18), c.width / 2, 280);
  ctx.fillStyle = '#fde68a';
  ctx.font = '24px "Noto Sans Lao", sans-serif';
  ctx.fillText(String(book.author || ''), c.width / 2, 580);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initOrUpdateR3FStage(book) {
  const canvas = document.querySelector('#hero-book');
  if (!book || !canvas) return;

  if (!r3fStage) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.1, 5.8);

    // Studio & Reading-Room Lighting (<Environment> + <DirectionalLight> pattern)
    scene.add(new THREE.AmbientLight(0xfff8eb, 1.85));
    const keyLight = new THREE.DirectionalLight(0xffe4b5, 2.9);
    keyLight.position.set(-3.5, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x99f6e4, 1.35);
    rimLight.position.set(4, -2, -4);
    scene.add(rimLight);

    // Declarative <Float> & <PresentationControls> Root Group
    const floatGroup = new THREE.Group();
    scene.add(floatGroup);

    const bookGroup = new THREE.Group();
    bookGroup.rotation.y = -0.38;
    floatGroup.add(bookGroup);

    // Multi-Material 3D Book Geometry
    const loader = new THREE.TextureLoader();
    const frontMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.06 });
    const spineMat = new THREE.MeshStandardMaterial({ color: book.cover_color || '#266653', roughness: 0.58, metalness: 0.12 });
    const paperMat = new THREE.MeshStandardMaterial({ color: '#f3ecdc', roughness: 0.92 });

    // [right(pages), left(spine), top(pages), bottom(pages), front(cover), back(cover)]
    const bookMaterials = [paperMat, spineMat, paperMat, paperMat, frontMat, spineMat];
    const bookMesh = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.48, 0.22), bookMaterials);
    bookGroup.add(bookMesh);

    // Spine Ridge Accent
    const spineCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 2.5, 0.25),
      new THREE.MeshStandardMaterial({ color: '#142820', roughness: 0.5, metalness: 0.2 })
    );
    spineCap.position.x = -0.88;
    bookGroup.add(spineCap);

    // Floating Reading-Room Firefly / Gold Dust Particles (<Sparkles> pattern)
    const particleCount = 42;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfde68a,
      size: 0.055,
      transparent: true,
      opacity: 0.65,
    });
    const sparkles = new THREE.Points(particleGeo, particleMat);
    scene.add(sparkles);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let targetRotY = -0.38;
    let targetRotX = 0.06;

    canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      targetRotY += (e.clientX - lastX) * 0.014;
      targetRotX = Math.max(-0.45, Math.min(0.45, targetRotX + (e.clientY - lastY) * 0.008));
      lastX = e.clientX;
      lastY = e.clientY;
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });

    const animate = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const tNow = performance.now() * 0.001;
      if (!dragging && !reduced) {
        targetRotY += 0.0035;
        floatGroup.position.y = Math.sin(tNow * 1.6) * 0.09;
        sparkles.rotation.y = tNow * 0.08;
      }
      // Smooth Damped Interpolation (R3F useFrame damp pattern)
      bookGroup.rotation.y = THREE.MathUtils.lerp(bookGroup.rotation.y, targetRotY, 0.1);
      bookGroup.rotation.x = THREE.MathUtils.lerp(bookGroup.rotation.x, targetRotX + Math.sin(tNow * 0.9) * 0.03, 0.1);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    r3fStage = {
      loader,
      frontMat,
      spineMat,
      bookGroup,
      spinTransition() {
        targetRotY += Math.PI * 2;
      },
    };
  }

  // Update Book Cover Texture & Spine Color with 360° Showcase Spin
  const color = /^#[\da-f]{6}$/i.test(book.cover_color || '') ? book.cover_color : '#266653';
  r3fStage.spineMat.color.set(color);

  if (book.cover_url) {
    r3fStage.loader.load(
      book.cover_url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        r3fStage.frontMat.map = tex;
        r3fStage.frontMat.color.set(0xffffff);
        r3fStage.frontMat.needsUpdate = true;
      },
      undefined,
      () => {
        r3fStage.frontMat.map = createFallbackCoverTexture(book);
        r3fStage.frontMat.needsUpdate = true;
      }
    );
  } else {
    r3fStage.frontMat.map = createFallbackCoverTexture(book);
    r3fStage.frontMat.needsUpdate = true;
  }

  r3fStage.spinTransition();
}

async function toggleWishlist(bookId) {
  if (wishlistIds.has(bookId)) {
    wishlistIds.delete(bookId);
    notify(t('shop.wishlistRemoved'));
  } else {
    wishlistIds.add(bookId);
    notify(t('shop.wishlistAdded'));
  }
  localStorage.setItem('ebook-wishlist', JSON.stringify([...wishlistIds]));
  if (authToken) {
    api(`/wishlist/${bookId}`, { method: 'POST' }).catch(() => {});
  }
  renderBooks(false);
  if (selectedBook?.id === bookId) {
    const detailWishBtn = document.querySelector('#detail-wishlist-btn');
    if (detailWishBtn) {
      const active = wishlistIds.has(bookId);
      detailWishBtn.classList.toggle('active', active);
      detailWishBtn.textContent = active ? '♥' : '♡';
    }
  }
}

async function showDetails(id) {
  try {
    selectedBook = books.find((book) => book.id === id) || await api(`/books/${id}`);
    const book = selectedBook;
    const detailCover = document.querySelector('#detail-cover');
    detailCover.style.background = book.cover_color || '#266653';
    detailCover.replaceChildren();
    if (book.cover_url) {
      const image = document.createElement('img');
      image.src = book.cover_url;
      image.alt = book.title;
      detailCover.append(image);
    } else {
      detailCover.textContent = book.title;
    }

    const gallery = document.querySelector('#detail-gallery');
    let galleryImages = [];
    try { galleryImages = JSON.parse(book.gallery_json || '[]'); } catch { galleryImages = []; }
    if (book.cover_url && !galleryImages.includes(book.cover_url)) galleryImages.unshift(book.cover_url);
    gallery.innerHTML = galleryImages.map((url, index) => `
      <button type="button" class="gallery-thumb ${index === 0 ? 'selected' : ''}" data-gallery-image="${index}" aria-label="${escapeHtml(book.title)} ${index + 1}">
        <img src="${escapeHtml(url)}" alt="">
      </button>
    `).join('');
    gallery.querySelectorAll('[data-gallery-image]').forEach((button) => {
      button.onclick = () => {
        const image = document.createElement('img');
        image.src = galleryImages[Number(button.dataset.galleryImage)];
        image.alt = book.title;
        detailCover.replaceChildren(image);
        gallery.querySelectorAll('.gallery-thumb').forEach((thumb) => thumb.classList.toggle('selected', thumb === button));
      };
    });

    const typeBadge = document.querySelector('#detail-type-badge');
    if (typeBadge) {
      typeBadge.className = `type-badge ${book.product_type === 'novel' ? 'novel' : book.product_type === 'manga' ? 'manga' : ''}`;
      typeBadge.textContent = t(`shop.${book.product_type || 'ebook'}`);
    }
    document.querySelector('#detail-category').textContent = book.categories || t('home.allCategories');
    document.querySelector('#detail-title').textContent = book.title;
    document.querySelector('#detail-author').textContent = `${t('book.author')}: ${book.author}`;
    document.querySelector('#detail-description').textContent = book.description || '';
    const locale = currentLang === 'th' ? 'th-TH' : 'lo-LA';
    document.querySelector('#detail-stats').textContent = `${Number(book.total_pages) > 0 ? `${t('book.pages')}: ${new Intl.NumberFormat(locale).format(book.total_pages)} · ` : ''}★ ${Number(book.avg_rating).toFixed(1)} (${book.review_count})`;

    const physical = ['novel', 'manga'].includes(book.product_type) && Number(book.price) > 0;
    const readBtn = document.querySelector('#read-start');
    // Allow reading sample pages even for physical novels/manga if pages exist!
    readBtn.hidden = Number(book.total_pages) < 1 && physical;
    readBtn.textContent = physical ? t('book.sampleReading') : t('book.startReading');

    document.querySelector('#add-to-cart').hidden = !physical || Number(book.stock_qty) < 1;
    document.querySelector('#detail-price').textContent = physical
      ? `${formatMoney(book.price)} · ${Number(book.stock_qty) > 0 ? `${t('shop.inStock')}: ${book.stock_qty}` : t('shop.outOfStock')}`
      : t('book.freeEbook');

    const detailWishBtn = document.querySelector('#detail-wishlist-btn');
    if (detailWishBtn) {
      const wished = wishlistIds.has(book.id);
      detailWishBtn.classList.toggle('active', wished);
      detailWishBtn.textContent = wished ? '♥' : '♡';
      detailWishBtn.onclick = () => toggleWishlist(book.id);
    }

    const stageBtn = document.querySelector('#detail-stage-btn');
    if (stageBtn) {
      stageBtn.onclick = () => {
        document.querySelector('#detail-dialog').close();
        setHeroStageBook(book);
        document.querySelector('#home')?.scrollIntoView({ behavior: 'smooth' });
      };
    }

    document.querySelector('#review-list').innerHTML = '';
    const reviews = await api(`/books/${id}/reviews`);
    document.querySelector('#review-list').innerHTML = reviews.map((review) => `
      <div class="review">
        <b>${escapeHtml(review.username)} · ${'★'.repeat(review.rating)}</b>
        <p>${escapeHtml(review.comment || '')}</p>
        <small>${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${review.created_at.replace(' ', 'T')}Z`))}</small>
      </div>
    `).join('');
    document.querySelector('#detail-dialog').showModal();
  } catch (error) {
    notify(error.message);
  }
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
      pageFlip = new window.St.PageFlip(host, {
        width: 430,
        height: 550,
        size: 'stretch',
        minWidth: 280,
        maxWidth: 920,
        minHeight: 360,
        maxHeight: 680,
        showCover: false,
        mobileScrollSupport: true,
        flippingTime: 650,
        usePortrait: true,
        drawShadow: true,
      });
      pageFlip.loadFromHTML(host.querySelectorAll('.page'));
      pageFlip.on('flip', (event) => {
        currentPage = event.data + 1;
        updatePageLabel(pages.length);
        saveProgress();
      });
      if (currentPage > 1) pageFlip.turnToPage(currentPage - 1);
    }
    updatePageLabel(pages.length);
    if (authToken) saveProgress();
    document.querySelector('#page-prev').onclick = () => pageFlip?.flipPrev('top');
    document.querySelector('#page-next').onclick = () => pageFlip?.flipNext('top');
    document.querySelector('#bookmark-toggle').onclick = addBookmark;
  } catch (error) {
    notify(error.message);
  }
}

function updatePageLabel(total) {
  const locale = currentLang === 'th' ? 'th-TH' : 'lo-LA';
  document.querySelector('#page-label').textContent = `${t('reader.page')} ${new Intl.NumberFormat(locale).format(currentPage)} ${t('reader.of')} ${new Intl.NumberFormat(locale).format(total)}`;
  const bar = document.querySelector('#reader-progress-bar');
  if (bar && total > 0) {
    bar.style.width = `${Math.min(100, Math.round((currentPage / total) * 100))}%`;
  }
}

async function saveProgress() {
  if (!authToken || !selectedBook) return;
  const saved = JSON.parse(localStorage.getItem('ebook-progress') || '{}');
  saved[selectedBook.id] = currentPage;
  localStorage.setItem('ebook-progress', JSON.stringify(saved));
  loadContinueReading();
  try {
    await api(`/books/${selectedBook.id}/progress`, { method: 'PUT', body: JSON.stringify({ page: currentPage }) });
  } catch (error) {
    notify(error.message);
  }
}

async function addBookmark() {
  if (!authToken) return openAuth(false);
  try {
    await api(`/books/${selectedBook.id}/bookmarks`, { method: 'POST', body: JSON.stringify({ page: currentPage }) });
    notify(t('reader.bookmarkSaved'));
  } catch (error) {
    notify(error.message);
  }
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
    const payload = registering
      ? { username: form.get('username'), email: form.get('email'), password: form.get('password') }
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
    syncWishlistFromServer();
  } catch (error) {
    document.querySelector('#auth-error').textContent = error.message;
  }
}

async function syncWishlistFromServer() {
  if (!authToken) return;
  try {
    const data = await api('/wishlist');
    if (Array.isArray(data.ids)) {
      data.ids.forEach((id) => wishlistIds.add(Number(id)));
      localStorage.setItem('ebook-wishlist', JSON.stringify([...wishlistIds]));
      renderBooks(false);
    }
  } catch { /* ignore */ }
}

async function loadContinueReading() {
  const section = document.querySelector('#continue-section');
  if (!authToken) { section.hidden = true; return; }
  const saved = JSON.parse(localStorage.getItem('ebook-progress') || '{}');
  section.hidden = !Object.keys(saved).length;
  const locale = currentLang === 'th' ? 'th-TH' : 'lo-LA';
  document.querySelector('#continue-list').innerHTML = Object.entries(saved).map(([id, page]) => {
    const book = books.find((item) => item.id === Number(id));
    return book ? `<button type="button" class="continue-chip" data-continue="${book.id}">${escapeHtml(book.title)} · ${t('reader.page')} ${new Intl.NumberFormat(locale).format(page)}</button>` : '';
  }).join('');
  document.querySelectorAll('[data-continue]').forEach((button) => {
    button.onclick = () => showDetails(Number(button.dataset.continue)).then(() => openReader());
  });
}

async function openBookmarks() {
  try {
    const items = await api('/bookmarks');
    const list = document.querySelector('#bookmark-list');
    list.innerHTML = items.length
      ? items.map((item) => `
        <div class="bookmark-row">
          <button type="button" data-open-bookmark="${item.book_id}" data-page="${item.page_number}">${escapeHtml(item.title)} · ${t('reader.page')} ${item.page_number}</button>
          <button type="button" data-remove-bookmark="${item.id}" aria-label="${escapeHtml(t('common.delete'))}">${escapeHtml(t('common.delete'))}</button>
        </div>`).join('')
      : `<p class="muted">${t('reader.emptyBookmarks')}</p>`;
    list.querySelectorAll('[data-open-bookmark]').forEach((button) => {
      button.onclick = async () => {
        document.querySelector('#bookmarks-dialog').close();
        await showDetails(Number(button.dataset.openBookmark));
        await openReader(selectedBook, Number(button.dataset.page));
      };
    });
    list.querySelectorAll('[data-remove-bookmark]').forEach((button) => {
      button.onclick = async () => {
        try {
          await api(`/bookmarks/${button.dataset.removeBookmark}`, { method: 'DELETE' });
          openBookmarks();
          notify(t('reader.bookmarkRemoved'));
        } catch (error) { notify(error.message); }
      };
    });
    document.querySelector('#bookmarks-dialog').showModal();
  } catch (error) {
    notify(error.message);
  }
}

async function openCustomerOrders() {
  if (!authToken) return openAuth(false);
  try {
    const orders = await api('/orders');
    const list = document.querySelector('#customer-orders-list');
    const locale = currentLang === 'th' ? 'th-TH' : 'lo-LA';
    list.innerHTML = orders.length
      ? orders.map((order) => `
        <article class="order-row">
          <div>
            <b>#${order.id} · ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(`${order.created_at.replace(' ', 'T')}Z`))}</b>
            <p>${escapeHtml(order.items || '')}</p>
            <strong>${formatMoney(order.total_amount)}</strong>
          </div>
          <span class="status-pill ${escapeHtml(order.status)}">${escapeHtml(t(`shop.${order.status}`))}</span>
        </article>`).join('')
      : `<p class="muted">${t('shop.noOrders')}</p>`;
    document.querySelector('#my-orders-dialog').showModal();
  } catch (error) {
    notify(error.message);
  }
}

async function createBook(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const pages = String(data.get('pages_text')).split(/^\s*---\s*$/m).map((part) => {
    const lines = part.trim().split('\n');
    return { title: lines.shift() || '', content: lines.join('\n').trim() };
  }).filter((page) => page.content);
  try {
    await api('/admin/books', {
      method: 'POST',
      body: JSON.stringify({
        title: data.get('title'),
        author: data.get('author'),
        description: data.get('description'),
        cover_url: data.get('cover_url'),
        cover_color: data.get('cover_color'),
        category_id: data.get('category_id'),
        language: currentLang,
        pages,
      }),
    });
    document.querySelector('#admin-dialog').close();
    event.currentTarget.reset();
    await loadBooks();
    notify(t('admin.bookSaved'));
  } catch (error) {
    document.querySelector('#admin-error').textContent = error.message;
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function saveCart() {
  localStorage.setItem('ebook-cart', JSON.stringify(cart));
  renderCartCount();
}

function renderCartCount() {
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const badge = document.querySelector('#cart-count');
  const locale = currentLang === 'th' ? 'th-TH' : 'lo-LA';
  if (badge) badge.textContent = new Intl.NumberFormat(locale).format(count);
}

function animateFlyToCart(sourceEl, coverUrl) {
  const cartBtn = document.querySelector('#cart-open');
  if (!sourceEl || !cartBtn || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const start = sourceEl.getBoundingClientRect();
  const end = cartBtn.getBoundingClientRect();
  const clone = document.createElement('img');
  clone.className = 'fly-cover-clone';
  clone.src = coverUrl || '/covers/mekong-moon.svg';
  clone.style.left = `${start.left}px`;
  clone.style.top = `${start.top}px`;
  document.body.appendChild(clone);

  gsap.to(clone, {
    left: end.left + end.width / 2 - 16,
    top: end.top + end.height / 2 - 20,
    scale: 0.25,
    rotation: 14,
    opacity: 0.3,
    duration: 0.65,
    ease: 'power3.inOut',
    onComplete: () => {
      clone.remove();
      gsap.fromTo(cartBtn, { scale: 1.18 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
    },
  });
}

function addToCart(book, sourceEl = null) {
  const existing = cart.find((item) => item.id === book.id);
  if (existing) {
    if (existing.quantity >= Number(book.stock_qty)) return notify(t('shop.insufficientStock'));
    existing.quantity += 1;
  } else {
    cart.push({
      id: book.id,
      title: book.title,
      price: Number(book.price),
      stock_qty: Number(book.stock_qty),
      cover_url: book.cover_url,
      quantity: 1,
    });
  }
  saveCart();
  if (sourceEl) animateFlyToCart(sourceEl, book.cover_url);
  notify(t('common.success'));
}

function renderCart() {
  const lines = document.querySelector('#cart-lines');
  if (!cart.length) {
    lines.innerHTML = `<p class="muted">${t('shop.emptyCart')}</p>`;
  } else {
    lines.innerHTML = cart.map((item) => `
      <div class="cart-line">
        <div>
          ${item.cover_url ? `<img src="${escapeHtml(item.cover_url)}" alt="">` : ''}
          <span><b>${escapeHtml(item.title)}</b><small>${formatMoney(item.price)}</small></span>
        </div>
        <label>
          <span class="sr-only">${escapeHtml(item.title)}</span>
          <input type="number" min="1" max="${Math.max(1, item.stock_qty)}" value="${item.quantity}" data-cart-qty="${item.id}">
        </label>
        <button class="text-button" type="button" data-cart-remove="${item.id}">${t('shop.remove')}</button>
      </div>`).join('');
  }
  const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  document.querySelector('#cart-total').textContent = `${t('shop.price').split(' ')[0]}: ${formatMoney(total)}`;
  lines.querySelectorAll('[data-cart-qty]').forEach((input) => {
    input.onchange = () => {
      const item = cart.find((line) => line.id === Number(input.dataset.cartQty));
      if (!item) return;
      item.quantity = Math.max(1, Math.min(item.stock_qty, Number(input.value) || 1));
      saveCart();
      renderCart();
    };
  });
  lines.querySelectorAll('[data-cart-remove]').forEach((button) => {
    button.onclick = () => {
      cart = cart.filter((item) => item.id !== Number(button.dataset.cartRemove));
      saveCart();
      renderCart();
    };
  });
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
      [t('shop.products'), data.product_count],
      [t('shop.units'), data.units_in_stock],
      [t('shop.lowStock'), data.low_stock],
      [t('shop.orders'), data.order_count],
      [t('shop.revenue'), formatMoney(data.revenue)],
    ].map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('');

    const inventory = document.querySelector('#inventory-list');
    inventory.innerHTML = data.products.length
      ? data.products.map((product) => `
        <div class="inventory-row">
          <span><b>${escapeHtml(product.title)}</b><small>${t(product.product_type === 'manga' ? 'shop.manga' : 'shop.novel')}</small></span>
          <label>${t('shop.price')}<input type="number" min="0" value="${product.price}" data-price="${product.id}"></label>
          <label>${t('shop.stock')}<input type="number" min="0" value="${product.stock_qty}" data-stock="${product.id}"></label>
          <button type="button" class="quiet-button" data-save-stock="${product.id}">${t('shop.saveStock')}</button>
        </div>`).join('')
      : `<p class="muted">${t('shop.noProducts')}</p>`;

    inventory.querySelectorAll('[data-save-stock]').forEach((button) => {
      button.onclick = async () => {
        const id = button.dataset.saveStock;
        try {
          await api(`/admin/products/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              price: Number(inventory.querySelector(`[data-price="${id}"]`).value),
              stock_qty: Number(inventory.querySelector(`[data-stock="${id}"]`).value),
            }),
          });
          notify(t('common.success'));
          openDashboard();
          loadBooks();
        } catch (error) { notify(error.message); }
      };
    });

    const orderList = document.querySelector('#orders-list');
    orderList.innerHTML = data.orders.length
      ? data.orders.map((order) => `
        <article class="order-row">
          <div>
            <b>#${order.id} · ${escapeHtml(order.customer_name)}</b>
            <p>${escapeHtml(order.items || '')}</p>
            <small>${escapeHtml(order.phone)} · ${escapeHtml(order.address)}</small>
            <strong>${formatMoney(order.total_amount)}</strong>
          </div>
          <label>${t('shop.orderStatus')}
            <select data-order-status="${order.id}" ${['shipped', 'cancelled'].includes(order.status) ? 'disabled' : ''}>
              <option value="placed" ${order.status === 'placed' ? 'selected' : ''}>${t('shop.placed')}</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>${t('shop.processing')}</option>
              <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>${t('shop.shipped')}</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>${t('shop.cancelled')}</option>
            </select>
          </label>
        </article>`).join('')
      : `<p class="muted">${t('shop.noOrders')}</p>`;

    orderList.querySelectorAll('[data-order-status]').forEach((select) => {
      select.onchange = async () => {
        try {
          await api(`/admin/orders/${select.dataset.orderStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
          notify(t('common.success'));
          openDashboard();
        } catch (error) { notify(error.message); }
      };
    });
    document.querySelector('#dashboard-dialog').showModal();
  } catch (error) {
    notify(error.message);
  }
}

async function createProduct(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await api('/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        title: data.get('title'),
        author: data.get('author'),
        description: data.get('description'),
        product_type: data.get('product_type'),
        price: Number(data.get('price')),
        stock_qty: Number(data.get('stock_qty')),
        cover_url: data.get('cover_url'),
        image_urls: String(data.get('image_urls') || '').split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
        category_id: data.get('category_id'),
        language: currentLang,
      }),
    });
    event.currentTarget.reset();
    document.querySelector('#product-dialog').close();
    await loadBooks();
    notify(t('common.success'));
  } catch (error) {
    document.querySelector('#product-error').textContent = t(`auth.${error.key}`) || error.message;
  }
}

async function submitOrder(event) {
  event.preventDefault();
  if (!authToken) {
    document.querySelector('#cart-dialog').close();
    return openAuth(false);
  }
  const data = new FormData(event.currentTarget);
  try {
    await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: data.get('customer_name'),
        phone: data.get('phone'),
        address: data.get('address'),
        items: cart.map((item) => ({ book_id: item.id, quantity: item.quantity })),
      }),
    });
    cart = [];
    saveCart();
    event.currentTarget.reset();
    document.querySelector('#cart-dialog').close();
    await loadBooks();
    notify(t('shop.orderSuccess'));
  } catch (error) {
    document.querySelector('#checkout-error').textContent = t(`shop.${error.key}`) || t(`auth.${error.key}`) || error.message;
  }
}

async function submitReview(event) {
  event.preventDefault();
  if (!authToken) return openAuth(false);
  try {
    await api(`/books/${selectedBook.id}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        rating: Number(document.querySelector('#rating').value),
        comment: document.querySelector('#review-comment').value,
      }),
    });
    document.querySelector('#review-comment').value = '';
    await showDetails(selectedBook.id);
    await loadBooks();
    notify(t('common.success'));
  } catch (error) {
    notify(error.message);
  }
}

function bindEvents() {
  let searchTimer;
  document.querySelector('#search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadBooks().catch((error) => notify(error.message)), 220);
  });
  document.querySelector('#category').addEventListener('change', () => loadBooks().catch((error) => notify(error.message)));
  document.querySelector('#sort-select')?.addEventListener('change', () => loadBooks().catch((error) => notify(error.message)));

  document.querySelectorAll('[data-type-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-type-filter]').forEach((el) => el.classList.remove('active'));
      tab.classList.add('active');
      activeTypeFilter = tab.dataset.typeFilter || '';
      loadBooks().catch((error) => notify(error.message));
    });
  });

  document.querySelector('#lang-toggle')?.addEventListener('click', () => {
    switchLanguage(currentLang === 'lo' ? 'th' : 'lo');
  });

  // Paper Theme & Font Size Controls in 3D Reader
  document.querySelectorAll('[data-paper-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-paper-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector('.reader-shell')?.setAttribute('data-paper', btn.dataset.paperMode);
    });
  });
  document.documentElement.style.setProperty('--reader-scale', String(readerScale));
  document.querySelector('#font-dec')?.addEventListener('click', () => {
    readerScale = Math.max(0.85, Number((readerScale - 0.1).toFixed(2)));
    localStorage.setItem('ebook-reader-scale', String(readerScale));
    document.documentElement.style.setProperty('--reader-scale', String(readerScale));
  });
  document.querySelector('#font-inc')?.addEventListener('click', () => {
    readerScale = Math.min(1.4, Number((readerScale + 0.1).toFixed(2)));
    localStorage.setItem('ebook-reader-scale', String(readerScale));
    document.documentElement.style.setProperty('--reader-scale', String(readerScale));
  });

  document.querySelector('#auth-open').onclick = () => (currentUser ? signOut() : openAuth(false));
  document.querySelector('#auth-form').addEventListener('submit', handleAuth);
  document.querySelector('#auth-switch').onclick = () => openAuth(!registering);
  document.querySelector('#read-start').onclick = () => openReader();
  document.querySelector('#review-form').addEventListener('submit', submitReview);
  document.querySelector('#admin-form').addEventListener('submit', createBook);
  document.querySelector('#product-form').addEventListener('submit', createProduct);
  document.querySelector('#dashboard-add-product').onclick = () => {
    document.querySelector('#dashboard-dialog').close();
    document.querySelector('#product-dialog').showModal();
  };
  document.querySelector('#add-to-cart').onclick = () => {
    addToCart(selectedBook, document.querySelector('#detail-cover'));
    document.querySelector('#detail-dialog').close();
    openCart();
  };
  document.querySelector('#cart-open').onclick = openCart;
  document.querySelector('#orders-open').onclick = openCustomerOrders;
  document.querySelector('#checkout-form').addEventListener('submit', submitOrder);
  document.querySelector('#bookmarks-open').onclick = () => openBookmarks();
  document.querySelector('#theme-toggle').onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('ebook-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  };
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => document.querySelector(`#${button.dataset.close}`).close());
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  });
}

async function init() {
  try {
    const langFile = currentLang === 'th' ? '/th.json' : '/lo.json';
    strings = await fetch(langFile).then((response) => response.json());
    applyTranslations();
    updateAccount();
    bindEvents();
    if (localStorage.getItem('ebook-theme') === 'dark') document.body.classList.add('dark');
    [categories] = await Promise.all([api('/categories')]);
    renderCategories();
    await loadBooks();
    await loadContinueReading();
    await syncWishlistFromServer();
  } catch (error) {
    notify(error.message || t('common.error'));
  }
}

init();
