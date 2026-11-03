import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import { handleStaticApi } from './static-api.js';

let strings = {};
let staticMode = false;
let currentLang = localStorage.getItem('ebook-lang') || 'lo';
let books = [];
let allCatalogBooks = [];
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
let guestOrderIds = JSON.parse(localStorage.getItem('ebook-guest-orders') || '[]');
let toastTimer;

// "The Complete Shelf" & R3F Declarative Scene Controller State
let r3fStage = null;
let shelfManifest = null;
let activeSlotIndex = 0;
let inspectionMode = false;
let scrollObserver = null;

function lookupTranslation(key) {
  return key.split('.').reduce((value, part) => value?.[part], strings);
}

function t(key) {
  return lookupTranslation(key) || strings.common?.error || key;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  document.title = t('app.name');
  const langBtn = document.querySelector('#lang-toggle');
  if (langBtn) langBtn.textContent = currentLang === 'lo' ? 'LA' : 'TH';
  renderShelfMarkers();
  updateShelfEditorialUI();
}

async function switchLanguage(nextLang) {
  currentLang = nextLang;
  localStorage.setItem('ebook-lang', currentLang);
  const file = currentLang === 'th' ? './th.json' : './lo.json';
  strings = await fetch(file).then((r) => r.json()).catch(() => strings);
  applyTranslations();
  r3fStage?.refreshTextures?.();
  updateAccount();
  renderBooks(false);
  loadContinueReading();
}

async function api(url, options = {}) {
  if (staticMode) return handleStaticApi(url, options);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let response;
  try {
    response = await fetch(`./api${url}`, { ...options, headers });
  } catch {
    staticMode = true;
    return handleStaticApi(url, options);
  }
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 404 && !contentType.includes('application/json')) {
    staticMode = true;
    return handleStaticApi(url, options);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && authToken) signOut();
    const msg = lookupTranslation(`shop.${body.error}`)
      || lookupTranslation(`auth.${body.error}`)
      || lookupTranslation(`common.${body.error}`)
      || t('common.error');
    const error = new Error(msg);
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
  document.querySelector('#orders-open').hidden = !currentUser && !guestOrderIds.length;
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

function getShelfItems() {
  return shelfManifest?.items || [];
}

function getActiveShelfItem() {
  const items = getShelfItems();
  return items[activeSlotIndex] || items[0] || null;
}

function getLinkedCatalogBook(shelfItem) {
  const pool = allCatalogBooks.length ? allCatalogBooks : books;
  if (!shelfItem) return pool[0] || null;
  return pool.find((b) => b.id === Number(shelfItem.linkedBookId)) || pool[0] || null;
}

function renderShelfMarkers() {
  const markersEl = document.querySelector('#shelf-markers');
  if (!markersEl) return;
  const items = getShelfItems();
  if (!items.length) return;

  markersEl.innerHTML = items.map((item, idx) => {
    const title = currentLang === 'th' ? item.title_th : item.title_lo;
    const num = String(item.slot).padStart(2, '0');
    return `<button type="button" class="shelf-marker ${idx === activeSlotIndex ? 'active' : ''}" role="tab" aria-selected="${idx === activeSlotIndex}" data-shelf-slot="${idx}" title="${num} · ${escapeHtml(title)}">
      <span class="shelf-marker-bar"></span>
      <span class="shelf-marker-num">${num}</span>
    </button>`;
  }).join('');

  markersEl.querySelectorAll('[data-shelf-slot]').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.shelfSlot);
      selectShelfSlot(idx, false);
    };
  });
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

function updateShelfEditorialUI() {
  const item = getActiveShelfItem();
  const book = getLinkedCatalogBook(item) || heroStageBook;
  if (!item && !book) return;

  const total = getShelfItems().length || 19;
  const slotNum = String((item?.slot || activeSlotIndex + 1)).padStart(2, '0');
  const totalNum = String(total).padStart(2, '0');
  const titleText = item
    ? (currentLang === 'th' ? item.title_th : item.title_lo)
    : (book?.title || '');
  const noteText = item
    ? (currentLang === 'th' ? item.note_th : item.note_lo)
    : (book?.description || '');
  const quoteText = item
    ? (currentLang === 'th' ? (item.quote_th || item.note_th) : (item.quote_lo || item.note_lo))
    : (book?.description || '');

  const experienceEl = document.querySelector('#shelf-experience');
  if (experienceEl) {
    experienceEl.classList.toggle('is-inspecting', inspectionMode);
  }

  const drawerEl = document.querySelector('#inspection-drawer');
  if (drawerEl) {
    drawerEl.setAttribute('aria-hidden', String(!inspectionMode));
  }

  const slotPill = document.querySelector('#shelf-slot-pill');
  if (slotPill) {
    slotPill.textContent = currentLang === 'th'
      ? `เล่มที่ ${slotNum} / ${totalNum}`
      : `ເຫຼັ້ມທີ ${slotNum} / ${totalNum}`;
  }

  const readout = document.querySelector('#shelf-scroll-readout');
  if (readout) readout.textContent = `${slotNum} / ${totalNum}`;

  const titleEl = document.querySelector('#shelf-active-title');
  if (titleEl) titleEl.textContent = titleText;

  const metaEl = document.querySelector('#shelf-active-meta');
  if (metaEl) {
    metaEl.textContent = item
      ? `${item.author} · ${item.edition}`
      : (book?.author || '');
  }

  const noteEl = document.querySelector('#shelf-active-note');
  if (noteEl) noteEl.textContent = noteText;

  const priceLabel = book
    ? (book.product_type === 'ebook' ? t('book.freeEbook') : formatMoney(book.price))
    : '';

  const badge = document.querySelector('#hero-book-badge');
  if (badge) badge.textContent = priceLabel;

  const heroAction = document.querySelector('#hero-open-detail');
  if (heroAction && book) {
    heroAction.textContent = t('book.startReading');
    heroAction.onclick = async () => {
      selectedBook = book;
      await openReader(book);
    };
  }

  // Slide-in Inspection Drawer Fields
  const inspectCounter = document.querySelector('#inspect-counter');
  if (inspectCounter) inspectCounter.textContent = `${slotNum} / ${totalNum}`;

  const inspectEdition = document.querySelector('#inspect-edition');
  if (inspectEdition) inspectEdition.textContent = item?.edition || 'First Clothbound Edition';

  const inspectTitle = document.querySelector('#inspect-title');
  if (inspectTitle) inspectTitle.textContent = titleText;

  const inspectAuthor = document.querySelector('#inspect-author');
  if (inspectAuthor) inspectAuthor.textContent = item?.author || book?.author || '';

  const inspectDesc = document.querySelector('#inspect-description');
  if (inspectDesc) inspectDesc.textContent = noteText;

  const inspectQuote = document.querySelector('#inspect-quote');
  if (inspectQuote) inspectQuote.textContent = `“${quoteText}”`;

  const inspectFormat = document.querySelector('#inspect-format');
  if (inspectFormat) {
    inspectFormat.textContent = currentLang === 'th'
      ? 'ปกผ้าแข็ง · อีบุ๊กอ่านได้ทันที'
      : 'ປົກຜ້າແຂງ · ອີບຸ໊ກອ່ານໄດ້ທັນທີ';
  }

  const inspectAvail = document.querySelector('#inspect-availability');
  if (inspectAvail) inspectAvail.textContent = priceLabel;

  const inspectReadBtn = document.querySelector('#inspect-read-btn');
  if (inspectReadBtn && book) {
    inspectReadBtn.onclick = async () => {
      selectedBook = book;
      await openReader(book);
    };
  }

  const inspectDetailBtn = document.querySelector('#inspect-detail-btn');
  if (inspectDetailBtn && book) {
    inspectDetailBtn.onclick = () => showDetails(book.id);
  }

  const inspectBtn = document.querySelector('#shelf-inspect-toggle');
  if (inspectBtn) {
    inspectBtn.textContent = inspectionMode ? t('home.returnToShelf') : t('home.inspectBook');
  }

  const caption = document.querySelector('#stage-caption');
  if (caption) {
    caption.textContent = inspectionMode ? t('home.inspectHint') : t('home.shelfHint');
  }

  document.querySelectorAll('.shelf-marker').forEach((el) => {
    const active = Number(el.dataset.shelfSlot) === activeSlotIndex;
    el.classList.toggle('active', active);
    el.setAttribute('aria-selected', String(active));
  });

  if (book) {
    heroStageBook = book;
    document.querySelectorAll('.dock-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.dockBook) === book.id);
    });
  }
}

function selectShelfSlot(slotIndex, enterInspection = false) {
  const items = getShelfItems();
  const maxIdx = Math.max(0, (items.length || 19) - 1);
  activeSlotIndex = Math.max(0, Math.min(maxIdx, Math.round(slotIndex)));
  if (enterInspection) {
    inspectionMode = true;
  }
  const item = getActiveShelfItem();
  const linked = getLinkedCatalogBook(item);
  if (linked) heroStageBook = linked;
  updateShelfEditorialUI();
  if (r3fStage) {
    r3fStage.focusSlot(activeSlotIndex, inspectionMode);
  } else {
    initOrUpdateR3FStage(heroStageBook || books[0]);
  }
}

function setInspectionMode(enabled) {
  inspectionMode = Boolean(enabled);
  updateShelfEditorialUI();
  if (r3fStage) {
    r3fStage.setInspection(inspectionMode);
  }
}

function setHeroStageBook(book) {
  if (!book) return;
  heroStageBook = book;
  const items = getShelfItems();
  const matchingIdx = items.findIndex((it) => Number(it.linkedBookId) === Number(book.id));
  if (matchingIdx >= 0) {
    activeSlotIndex = matchingIdx;
  }
  updateShelfEditorialUI();
  initOrUpdateR3FStage(book);
  if (r3fStage) {
    r3fStage.focusSlot(activeSlotIndex, inspectionMode);
  }
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

function setupScrollMotionGraphics() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = document.querySelectorAll('.book-item');
  if (scrollObserver) scrollObserver.disconnect();

  scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('scroll-enter');
          entry.target.classList.add('scroll-visible');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  cards.forEach((card) => {
    card.classList.add('scroll-enter');
    scrollObserver.observe(card);
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
      setInspectionMode(true);
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
  setupScrollMotionGraphics();

  document.querySelector('#book-count').textContent = new Intl.NumberFormat(locale).format(displayed.length);
  document.querySelector('#empty-state').hidden = displayed.length > 0;

  renderShelfMarkers();
  renderHeroDock();
  if (!heroStageBook) {
    const initialBook = getLinkedCatalogBook(getActiveShelfItem()) || books[0];
    if (initialBook) {
      heroStageBook = initialBook;
      updateShelfEditorialUI();
      initOrUpdateR3FStage(initialBook);
    }
  } else {
    updateShelfEditorialUI();
    initOrUpdateR3FStage(heroStageBook);
  }

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
  const qRaw = document.querySelector('#search').value.trim();
  const categoryRaw = document.querySelector('#category').value;
  const q = encodeURIComponent(qRaw);
  const category = encodeURIComponent(categoryRaw);
  const sort = encodeURIComponent(document.querySelector('#sort-select')?.value || 'popular');
  const typeParam = ['ebook', 'novel', 'manga'].includes(activeTypeFilter) ? `&type=${activeTypeFilter}` : '';
  books = await api(`/books?q=${q}&category=${category}&sort=${sort}${typeParam}`);
  if (!qRaw && !categoryRaw && !typeParam) {
    allCatalogBooks = [...books];
  } else if (!allCatalogBooks.length) {
    allCatalogBooks = await api('/books?sort=popular').catch(() => [...books]);
  }
  renderBooks(true);
}

// ============================================================================
// "The Complete Shelf" — Three.js 19-Piece Clothbound Hardcover Library Engine
// Exact Spine-to-Spine Flush Packing + 7-Part RoundedBoxGeometry Hardcovers +
// 6-Stage Extraction Choreography + Left-Offset Inspection View
// ============================================================================
function drawEditorialCoverMotif(ctx, motif, w, h, accentColor, inkColor) {
  ctx.save();
  const cx = w * 0.5;
  const cy = h * 0.53;
  const r = w * 0.25;
  ctx.strokeStyle = accentColor;
  ctx.fillStyle = accentColor;
  ctx.lineWidth = 4.5;

  switch (motif) {
    case 'corrosion':
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.85 - i * 0.11;
        ctx.beginPath();
        ctx.arc(cx + (i % 2 === 0 ? 18 : -18), cy + (i - 2.5) * 26, r * (0.95 - i * 0.11), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'windows':
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const wx = cx - r * 0.76 + col * (r * 0.84);
          const wy = cy - r * 0.95 + row * (r * 0.68);
          ctx.strokeRect(wx, wy, r * 0.68, r * 0.54);
          if ((row + col) % 2 === 0) {
            ctx.fillRect(wx + 12, wy + 12, r * 0.68 - 24, r * 0.54 - 24);
          }
        }
      }
      break;
    case 'network': {
      const pts = [];
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const rad = i % 2 === 0 ? r * 0.92 : r * 0.48;
        pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
      }
      ctx.beginPath();
      pts.forEach(([x1, y1], i) => {
        pts.slice(i + 1).forEach(([x2, y2], j) => {
          if ((i + j) % 2 === 0) {
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
        });
      });
      ctx.stroke();
      pts.forEach(([px, py], idx) => {
        ctx.fillStyle = idx % 3 === 0 ? inkColor : accentColor;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'wave':
      for (let row = -4; row <= 4; row++) {
        ctx.beginPath();
        for (let x = -r; x <= r; x += 8) {
          const y = cy + row * 28 + Math.sin((x / r) * Math.PI * 2 + row * 0.5) * 18;
          if (x === -r) ctx.moveTo(cx + x, y);
          else ctx.lineTo(cx + x, y);
        }
        ctx.stroke();
      }
      break;
    case 'lattice':
      for (let s = 0.28; s <= 1.05; s += 0.24) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * s);
        ctx.lineTo(cx + r * s * 0.82, cy);
        ctx.lineTo(cx, cy + r * s);
        ctx.lineTo(cx - r * s * 0.82, cy);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    case 'steps':
      for (let st = 0; st < 6; st++) {
        const sw = r * (1.55 - st * 0.22);
        ctx.strokeRect(cx - sw * 0.5, cy + r * 0.78 - st * 38, sw, 30);
      }
      break;
    case 'efficiency':
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 26, cy - r * 0.95);
        ctx.lineTo(cx + i * 26, cy + r * 0.95);
        ctx.stroke();
      }
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'organization':
      ctx.strokeRect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.85, cy);
      ctx.lineTo(cx + r * 0.85, cy);
      ctx.moveTo(cx, cy - r * 0.85);
      ctx.lineTo(cx, cy + r * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - r * 0.42, cy - r * 0.42, r * 0.24, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.42, cy + r * 0.42, r * 0.24, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'fracture':
      ctx.beginPath();
      ctx.arc(cx - 10, cy, r * 0.78, Math.PI * 0.3, Math.PI * 1.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 14, cy - 12, r * 0.78, -Math.PI * 0.7, Math.PI * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
      ctx.lineTo(cx + r * 0.7, cy - r * 0.7);
      ctx.stroke();
      break;
    case 'circuit':
      for (let ring = 1; ring <= 3; ring++) {
        const rr = (r * ring) / 3.2;
        ctx.strokeRect(cx - rr, cy - rr, rr * 2, rr * 2);
      }
      [-1, 1].forEach((dx) => {
        [-1, 1].forEach((dy) => {
          ctx.beginPath();
          ctx.arc(cx + dx * r * 0.62, cy + dy * r * 0.62, 10, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      break;
    case 'maze':
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * i) / 5, (i * Math.PI) / 3, (i * Math.PI) / 3 + Math.PI * 1.55);
        ctx.stroke();
      }
      break;
    case 'boom':
      for (let a = 0; a < 16; a++) {
        const ang = (a * Math.PI) / 8;
        const inner = a % 2 === 0 ? r * 0.2 : r * 0.42;
        const outer = a % 2 === 0 ? r * 1.05 : r * 0.78;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
        ctx.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
        ctx.stroke();
      }
      break;
    case 'runner':
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.75, cy + k * 34 + 36);
        ctx.lineTo(cx + r * 0.15, cy + k * 34 - 28);
        ctx.lineTo(cx + r * 0.8, cy + k * 34 - 28);
        ctx.stroke();
      }
      break;
    case 'flight':
      for (let wing = 0; wing < 5; wing++) {
        const wy = cy - r * 0.65 + wing * 42;
        const span = r * (0.95 - wing * 0.12);
        ctx.beginPath();
        ctx.moveTo(cx - span, wy + 24);
        ctx.quadraticCurveTo(cx, wy - 28, cx + span, wy + 24);
        ctx.stroke();
      }
      break;
    case 'schematic':
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(cx - r * 0.58, cy - r * 0.58, r * 1.16, r * 1.16);
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.stroke();
      break;
    case 'branches':
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.95);
      ctx.lineTo(cx, cy - r * 0.95);
      ctx.stroke();
      for (let b = -3; b <= 3; b++) {
        const by = cy + b * 32;
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.quadraticCurveTo(cx + 52, by - 26, cx + 96, by - 12);
        ctx.moveTo(cx, by);
        ctx.quadraticCurveTo(cx - 52, by - 26, cx - 96, by - 12);
        ctx.stroke();
      }
      break;
    case 'gather':
      [-0.45, 0.45].forEach((ox) => {
        [-0.45, 0.45].forEach((oy) => {
          ctx.beginPath();
          ctx.arc(cx + ox * r * 0.72, cy + oy * r * 0.72, r * 0.52, 0, Math.PI * 2);
          ctx.stroke();
        });
      });
      break;
    case 'orbit':
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      for (let o = 0; o < 3; o++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 0.96, r * 0.36, (o * Math.PI) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    default:
      // continuum
      for (let tAng = 0; tAng < Math.PI * 2; tAng += Math.PI / 6) {
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(tAng) * r * 0.36,
          cy + Math.sin(tAng) * r * 0.36,
          r * 0.52,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

function wrapCanvasLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    // Handle Lao/Thai continuous script by character chunks if needed
    const str = String(text || '');
    const lines = [];
    let cur = '';
    for (const ch of str) {
      if (ctx.measureText(cur + ch).width > maxWidth && cur.length > 0) {
        lines.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function createClothHardcoverTextures(item, maxAnisotropy = 4) {
  const coverColor = item.cover || item.cloth?.color || '#243a4d';
  const accentColor = item.accent || item.foil?.color || '#e0aa53';
  const inkColor = item.ink || '#f3e9d2';
  const motif = item.motif || item.foil?.motif || 'corrosion';
  const title = currentLang === 'th' ? item.title_th : item.title_lo;
  const note = currentLang === 'th' ? item.note_th : item.note_lo;
  const quote = currentLang === 'th' ? (item.quote_th || note) : (item.quote_lo || note);

  // 1. Front Cover Artwork Canvas (1024x1536)
  const fc = document.createElement('canvas');
  fc.width = 1024;
  fc.height = 1536;
  const fctx = fc.getContext('2d');

  fctx.fillStyle = coverColor;
  fctx.fillRect(0, 0, fc.width, fc.height);

  // Subtle woven linen cloth grain
  fctx.strokeStyle = 'rgba(255, 248, 234, 0.045)';
  fctx.lineWidth = 1;
  for (let x = 0; x < fc.width; x += 6) {
    fctx.beginPath();
    fctx.moveTo(x, 0);
    fctx.lineTo(x, fc.height);
    fctx.stroke();
  }
  for (let y = 0; y < fc.height; y += 6) {
    fctx.beginPath();
    fctx.moveTo(0, y);
    fctx.lineTo(fc.width, y);
    fctx.stroke();
  }

  // Left bookbinding hinge crease shadow
  const hingeGrad = fctx.createLinearGradient(0, 0, 68, 0);
  hingeGrad.addColorStop(0, 'rgba(0,0,0,0.34)');
  hingeGrad.addColorStop(0.65, 'rgba(0,0,0,0.08)');
  hingeGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
  fctx.fillStyle = hingeGrad;
  fctx.fillRect(0, 0, 68, fc.height);

  // Editorial double border
  fctx.strokeStyle = accentColor;
  fctx.lineWidth = 4;
  fctx.strokeRect(64, 64, fc.width - 128, fc.height - 128);
  fctx.globalAlpha = 0.45;
  fctx.lineWidth = 1.6;
  fctx.strokeRect(82, 82, fc.width - 164, fc.height - 164);
  fctx.globalAlpha = 1;

  // Top Author Header
  fctx.fillStyle = accentColor;
  fctx.font = '600 28px "Noto Sans Lao", "Noto Sans Thai", sans-serif';
  fctx.textAlign = 'left';
  fctx.fillText(String(item.author || 'E-BOOKSHOP PRESS').toUpperCase(), 118, 158);

  // Title Block at Upper Left
  fctx.fillStyle = inkColor;
  fctx.font = '600 64px "Cormorant Garamond", "Noto Serif Lao", "Noto Serif Thai", serif';
  const titleLines = wrapCanvasLines(fctx, title, fc.width - 236);
  titleLines.forEach((line, i) => {
    fctx.fillText(line, 118, 252 + i * 76);
  });

  // Procedural Editorial Motif in Lower-Middle Field
  drawEditorialCoverMotif(fctx, motif, fc.width, fc.height, accentColor, inkColor);

  // Bottom Edition & Press Footer
  fctx.fillStyle = accentColor;
  fctx.font = '500 24px "Cormorant Garamond", "Noto Serif Lao", "Noto Serif Thai", serif';
  fctx.textAlign = 'left';
  fctx.fillText('E-BOOKSHOP EDITIONS', 118, fc.height - 118);
  fctx.textAlign = 'right';
  fctx.fillText(`NO. ${String(item.slot).padStart(2, '0')}`, fc.width - 118, fc.height - 118);

  const frontMap = new THREE.CanvasTexture(fc);
  frontMap.colorSpace = THREE.SRGBColorSpace;
  frontMap.anisotropy = maxAnisotropy;

  // 2. Back Cover Artwork Canvas (512x768)
  const bc = document.createElement('canvas');
  bc.width = 512;
  bc.height = 768;
  const bctx = bc.getContext('2d');
  bctx.fillStyle = coverColor;
  bctx.fillRect(0, 0, bc.width, bc.height);

  bctx.strokeStyle = accentColor;
  bctx.globalAlpha = 0.55;
  bctx.lineWidth = 2;
  bctx.strokeRect(42, 42, bc.width - 84, bc.height - 84);
  bctx.globalAlpha = 1;

  bctx.fillStyle = inkColor;
  bctx.font = 'italic 22px "Cormorant Garamond", "Noto Serif Lao", "Noto Serif Thai", serif';
  bctx.textAlign = 'center';
  const quoteLines = wrapCanvasLines(bctx, `“${quote}”`, bc.width - 140);
  quoteLines.forEach((l, idx) => {
    bctx.fillText(l, bc.width * 0.5, 290 + idx * 36);
  });

  bctx.fillStyle = accentColor;
  bctx.font = '600 16px "Noto Sans Lao", "Noto Sans Thai", sans-serif';
  bctx.fillText('E-BOOKSHOP · DIGITAL CLOTHBOUND LIBRARY', bc.width * 0.5, bc.height - 78);

  const backMap = new THREE.CanvasTexture(bc);
  backMap.colorSpace = THREE.SRGBColorSpace;
  backMap.anisotropy = maxAnisotropy;

  // 3. Spine Artwork Canvas (256x2048) — Crisp Vertical Typography & Accent Band
  const sc = document.createElement('canvas');
  sc.width = 256;
  sc.height = 2048;
  const sctx = sc.getContext('2d');

  sctx.fillStyle = coverColor;
  sctx.fillRect(0, 0, sc.width, sc.height);

  // Top Accent Band & Fine Rules
  sctx.fillStyle = accentColor;
  sctx.fillRect(28, 72, sc.width - 56, 22);
  sctx.fillRect(28, 108, sc.width - 56, 5);
  sctx.fillRect(28, sc.height - 230, sc.width - 56, 6);

  // Vertical Title & Author down the spine
  sctx.save();
  sctx.translate(sc.width * 0.5, sc.height * 0.48);
  sctx.rotate(-Math.PI / 2);
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';

  sctx.fillStyle = inkColor;
  sctx.font = '600 54px "Cormorant Garamond", "Noto Serif Lao", "Noto Serif Thai", serif';
  sctx.fillText(String(title).slice(0, 28), -110, -18);

  sctx.fillStyle = accentColor;
  sctx.font = '500 32px "Noto Sans Lao", "Noto Sans Thai", sans-serif';
  sctx.fillText(String(item.author || '').toUpperCase(), 380, 22);
  sctx.restore();

  // Bottom Press Monogram ("EB") + Volume Number
  sctx.fillStyle = inkColor;
  sctx.font = '700 44px "Cormorant Garamond", Georgia, serif';
  sctx.textAlign = 'center';
  sctx.fillText('EB', sc.width * 0.5, sc.height - 148);

  sctx.fillStyle = accentColor;
  sctx.font = '600 30px "Cormorant Garamond", Georgia, serif';
  sctx.fillText(String(item.slot).padStart(2, '0'), sc.width * 0.5, sc.height - 96);

  const spineMap = new THREE.CanvasTexture(sc);
  spineMap.colorSpace = THREE.SRGBColorSpace;
  spineMap.anisotropy = maxAnisotropy;

  return { frontMap, backMap, spineMap };
}

function createLivingShimmerTexture(accentHex) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(256, 384, 24, 256, 384, 260);
  grad.addColorStop(0, accentHex || '#ffd685');
  grad.addColorStop(0.5, 'rgba(255, 220, 150, 0.22)');
  grad.addColorStop(1, 'rgba(255, 220, 150, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWalnutWoodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, '#5a3925');
  grad.addColorStop(0.5, '#6a442d');
  grad.addColorStop(1, '#513220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = 'rgba(30, 16, 8, 0.28)';
  ctx.lineWidth = 2;
  for (let y = 0; y < c.height; y += 5) {
    ctx.beginPath();
    for (let x = 0; x <= c.width; x += 18) {
      const wy = y + Math.sin(x * 0.025 + y * 0.08) * 3;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function createMultiPartBook(item, index, maxAnisotropy, pickMeshes) {
  const root = new THREE.Group();
  const width = 1.31 + ((index % 5) - 2) * 0.018;
  const height = Number(item.height || item.dimensions?.height || 2.08);
  const thickness = Number(item.thickness || item.dimensions?.thickness || 0.24);

  const { frontMap, backMap, spineMap } = createClothHardcoverTextures(item, maxAnisotropy);

  const clothMaterial = new THREE.MeshPhysicalMaterial({
    color: item.cover || item.cloth?.color || '#243a4d',
    roughness: 0.78,
    metalness: 0.02,
    sheen: 0.36,
    sheenColor: new THREE.Color(item.ink || '#f3e9d2'),
    sheenRoughness: 0.82,
    clearcoat: 0.03,
    clearcoatRoughness: 0.85,
  });

  const paperMaterial = new THREE.MeshStandardMaterial({
    color: '#e9dfca',
    roughness: 0.88,
  });

  // 1. Cream Page Block (recessed inside the cloth boards)
  const pageBlock = new THREE.Mesh(
    new RoundedBoxGeometry(
      width - 0.075,
      height - 0.105,
      Math.max(0.08, thickness - 0.052),
      3,
      0.018
    ),
    paperMaterial
  );
  pageBlock.position.x = 0.018;
  pageBlock.castShadow = true;
  pageBlock.receiveShadow = true;
  pageBlock.userData.slotIndex = index;

  // 2 & 3. Beveled Front & Back Clothbound Boards
  const boardGeometry = new RoundedBoxGeometry(width, height, 0.034, 4, 0.025);
  const frontBoard = new THREE.Mesh(boardGeometry, clothMaterial);
  frontBoard.position.z = thickness * 0.5;
  frontBoard.castShadow = true;
  frontBoard.receiveShadow = true;
  frontBoard.userData.slotIndex = index;

  const backBoard = new THREE.Mesh(boardGeometry, clothMaterial);
  backBoard.position.z = -thickness * 0.5;
  backBoard.castShadow = true;
  backBoard.receiveShadow = true;
  backBoard.userData.slotIndex = index;

  // 4. Rounded Cloth Spine Casing
  const spine = new THREE.Mesh(
    new RoundedBoxGeometry(0.055, height - 0.01, thickness + 0.012, 3, 0.018),
    clothMaterial
  );
  spine.position.x = -width * 0.5 + 0.022;
  spine.castShadow = true;
  spine.receiveShadow = true;
  spine.userData.slotIndex = index;

  // 5 & 6. Woven Headband & Tailband
  const bandGeometry = new THREE.CylinderGeometry(0.017, 0.017, width - 0.1, 10);
  const bandMaterial = new THREE.MeshStandardMaterial({
    color: item.accent || item.foil?.color || '#e0aa53',
    roughness: 0.65,
  });
  const headband = new THREE.Mesh(bandGeometry, bandMaterial);
  headband.rotation.z = Math.PI * 0.5;
  headband.position.set(0.01, height * 0.5 - 0.045, 0);

  const tailband = headband.clone();
  tailband.position.y = -height * 0.5 + 0.045;

  // 7. Crisp Artwork Planes (Front Cover, Back Cover, Spine)
  const frontArtwork = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.065, height - 0.065),
    new THREE.MeshPhysicalMaterial({
      map: frontMap,
      roughness: 0.72,
      metalness: 0.02,
      sheen: 0.25,
      sheenColor: new THREE.Color(item.ink || '#f3e9d2'),
      clearcoat: 0.04,
      clearcoatRoughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  frontArtwork.position.z = thickness * 0.5 + 0.019;
  frontArtwork.userData.slotIndex = index;

  let livingGlow = null;
  if (item.living) {
    livingGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.11, height - 0.11),
      new THREE.MeshBasicMaterial({
        map: createLivingShimmerTexture(item.accent),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    livingGlow.position.z = thickness * 0.5 + 0.0205;
    root.add(livingGlow);
  }

  const backArtwork = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.08, height - 0.08),
    new THREE.MeshStandardMaterial({
      map: backMap,
      roughness: 0.78,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  backArtwork.position.z = -thickness * 0.5 - 0.019;
  backArtwork.rotation.y = Math.PI;
  backArtwork.userData.slotIndex = index;

  const spineArtwork = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(0.08, thickness - 0.02), height - 0.04),
    new THREE.MeshStandardMaterial({
      map: spineMap,
      roughness: 0.75,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  spineArtwork.position.x = -width * 0.5 - 0.019;
  spineArtwork.rotation.y = -Math.PI * 0.5;
  spineArtwork.userData.slotIndex = index;

  root.add(
    pageBlock,
    frontBoard,
    backBoard,
    spine,
    headband,
    tailband,
    frontArtwork,
    backArtwork,
    spineArtwork
  );

  pickMeshes.push(pageBlock, frontBoard, backBoard, spine, frontArtwork, backArtwork, spineArtwork);

  return {
    root,
    width,
    height,
    thickness,
    livingGlow,
    frontArtwork,
    backArtwork,
    spineArtwork,
  };
}

function initOrUpdateR3FStage() {
  const canvas = document.querySelector('#hero-book');
  if (!canvas) return;

  if (!r3fStage) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eee8db');
    scene.fog = new THREE.Fog('#eee8db', 11, 24);

    const camera = new THREE.PerspectiveCamera(27, 1, 0.08, 80);
    camera.position.set(0, 1.42, 6.65);

    // Warm Editorial Studio Lighting (matching play.mint.gg/complete-shelf)
    const hemiLight = new THREE.HemisphereLight('#fff8ea', '#6e5848', 2.4);
    hemiLight.position.set(0, 7, 2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff6e7', 4.6);
    keyLight.position.set(-4.2, 7.4, 5.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.8;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#c8d5e5', 2.1);
    fillLight.position.set(5, 3, -4);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight('#d79b72', 1.2, 12);
    rimLight.position.set(-3, 0.4, 3.2);
    scene.add(rimLight);

    // Studio Wall & Floor Shadow Receivers
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 20),
      new THREE.MeshStandardMaterial({ color: '#eee8db', roughness: 0.96 })
    );
    wall.position.set(0, 4.2, -2.55);
    wall.receiveShadow = true;
    scene.add(wall);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 18),
      new THREE.MeshStandardMaterial({ color: '#e6dfd1', roughness: 0.96 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    floor.position.set(0, -1.35, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    const shelfRig = new THREE.Group();
    scene.add(shelfRig);

    const shelfGroup = new THREE.Group();
    shelfRig.add(shelfGroup);

    const booksGroup = new THREE.Group();
    shelfRig.add(booksGroup);

    const items = getShelfItems();
    const totalCount = items.length || 19;
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 4);
    const pickMeshes = [];
    const bookRecords = [];

    // Flush Spine-to-Spine Packing (cursorX advances by book thickness + 0.045)
    let cursorX = 0;
    items.forEach((item, index) => {
      const thickness = Number(item.thickness || item.dimensions?.thickness || 0.24);
      cursorX += thickness * 0.5;

      const bookMesh = createMultiPartBook(item, index, maxAnisotropy, pickMeshes);
      const slotGroup = new THREE.Group();
      const baseY = 0.34 + bookMesh.height * 0.5;
      slotGroup.position.set(cursorX, baseY, 0.04);
      slotGroup.add(bookMesh.root);
      booksGroup.add(slotGroup);

      const isInitialActive = index === activeSlotIndex;
      const initialZ = isInitialActive ? 0.40 : -0.64;
      const initialYaw = isInitialActive ? 0 : Math.PI * 0.5;
      const initialScale = isInitialActive ? 1.035 : 1.0;

      bookMesh.root.position.z = initialZ;
      bookMesh.root.rotation.y = initialYaw;
      bookMesh.root.scale.setScalar(initialScale);

      bookRecords.push({
        index,
        item,
        slotGroup,
        bookRoot: bookMesh.root,
        livingGlow: bookMesh.livingGlow,
        frontArtwork: bookMesh.frontArtwork,
        backArtwork: bookMesh.backArtwork,
        spineArtwork: bookMesh.spineArtwork,
        width: bookMesh.width,
        height: bookMesh.height,
        thickness: bookMesh.thickness,
        x: cursorX,
        baseY,
        hover: 0,
        pose: {
          x: 0,
          y: 0,
          z: initialZ,
          yaw: initialYaw,
          pitch: 0,
          roll: 0,
          scale: initialScale,
        },
      });

      cursorX += thickness * 0.5 + 0.045;
    });

    // Center the packed book row around X = 0
    const centerOffset = cursorX * 0.5;
    bookRecords.forEach((rec) => {
      rec.x -= centerOffset;
      rec.slotGroup.position.x = rec.x;
    });

    // Build the Continuous Walnut Shelf Plank & Front Lip Molding sized to the packed row
    const shelfSpan = Math.max(9.6, cursorX + 3.4);
    const walnutTex = createWalnutWoodTexture();
    const walnutMat = new THREE.MeshStandardMaterial({
      map: walnutTex,
      roughness: 0.62,
      metalness: 0.05,
    });
    const darkWalnutMat = new THREE.MeshStandardMaterial({
      color: '#462c1c',
      roughness: 0.68,
      metalness: 0.06,
    });

    const mainPlank = new THREE.Mesh(
      new RoundedBoxGeometry(shelfSpan, 0.24, 2.35, 4, 0.03),
      walnutMat
    );
    mainPlank.position.set(0, 0.22, -0.18);
    mainPlank.castShadow = true;
    mainPlank.receiveShadow = true;
    shelfGroup.add(mainPlank);

    const frontLip = new THREE.Mesh(
      new RoundedBoxGeometry(shelfSpan + 0.06, 0.09, 0.14, 3, 0.02),
      darkWalnutMat
    );
    frontLip.position.set(0, 0.275, 0.98);
    frontLip.castShadow = true;
    frontLip.receiveShadow = true;
    shelfGroup.add(frontLip);

    const underShadowBar = new THREE.Mesh(
      new THREE.BoxGeometry(shelfSpan - 0.3, 0.16, 1.8),
      darkWalnutMat
    );
    underShadowBar.position.set(0, 0.04, -0.28);
    underShadowBar.receiveShadow = true;
    shelfGroup.add(underShadowBar);

    // 6-Stage Extraction & Shelving Choreography State
    let presentedSlot = activeSlotIndex;
    let queuedSlot = activeSlotIndex;
    let choreoStage = 'idle';
    let shelfScrollX = -bookRecords[activeSlotIndex]?.x || 0;
    let shelfTargetX = shelfScrollX;
    let hoveredSlot = -1;
    let focusProgress = inspectionMode ? 1 : 0;

    // Inspection View Orbit, Pan & Zoom State
    let inspectYaw = -0.32;
    let inspectPitch = 0.06;
    let inspectPanX = 0;
    let inspectPanY = 0;
    let inspectDistance = 4.35;

    let viewWidth = 1;
    let viewHeight = 1;
    let currentOffsetX = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      viewWidth = rect.width;
      viewHeight = rect.height;
      renderer.setSize(viewWidth, viewHeight, false);
      camera.aspect = viewWidth / Math.max(viewHeight, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // Pointer & Wheel Controls
    let pointerDown = false;
    let pointerButton = 0;
    let dragMoved = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let dragAccumSlots = 0;

    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();

    const getHitSlot = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(pickMeshes, false);
      for (const hit of hits) {
        const idx = hit.object.userData.slotIndex;
        if (typeof idx === 'number' && bookRecords[idx]?.slotGroup.visible) {
          return idx;
        }
      }
      return -1;
    };

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('pointerdown', (e) => {
      pointerDown = true;
      pointerButton = e.button;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragAccumSlots = activeSlotIndex;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (!pointerDown) {
        hoveredSlot = getHitSlot(e.clientX, e.clientY);
        canvas.style.cursor = hoveredSlot >= 0 ? 'pointer' : 'grab';
        return;
      }

      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) {
        dragMoved = true;
      }

      if (inspectionMode) {
        if (pointerButton === 2 || e.shiftKey) {
          inspectPanX = THREE.MathUtils.clamp(inspectPanX + dx * 0.0038, -0.95, 0.95);
          inspectPanY = THREE.MathUtils.clamp(inspectPanY - dy * 0.0038, -0.75, 0.75);
        } else {
          inspectYaw += dx * 0.011;
          inspectPitch = THREE.MathUtils.clamp(inspectPitch + dy * 0.009, -0.78, 0.78);
        }
      } else {
        dragAccumSlots = THREE.MathUtils.clamp(dragAccumSlots - dx * 0.028, 0, totalCount - 1);
        const nextIdx = Math.round(dragAccumSlots);
        if (nextIdx !== activeSlotIndex) {
          selectShelfSlot(nextIdx, false);
        }
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      pointerDown = false;
      if (!dragMoved) {
        const hitSlot = getHitSlot(e.clientX, e.clientY);
        if (hitSlot >= 0) {
          if (hitSlot === activeSlotIndex) {
            setInspectionMode(!inspectionMode);
          } else {
            selectShelfSlot(hitSlot, false);
          }
        } else if (inspectionMode) {
          setInspectionMode(false);
        }
      }
    });

    let wheelLockUntil = 0;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (inspectionMode) {
        inspectDistance = THREE.MathUtils.clamp(inspectDistance + e.deltaY * 0.0028, 2.85, 6.2);
      } else {
        const now = performance.now();
        if (now < wheelLockUntil) return;
        const primaryDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(primaryDelta) < 6) return;
        wheelLockUntil = now + 115;
        const step = primaryDelta > 0 ? 1 : -1;
        selectShelfSlot(activeSlotIndex + step, false);
      }
    }, { passive: false });

    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;
      const tSec = now * 0.001;

      // Smoothly transition focusProgress (0 = Browse Shelf, 1 = Inspect Book)
      focusProgress = THREE.MathUtils.damp(focusProgress, inspectionMode ? 1 : 0, 7.5, dt);

      // Update 6-Stage Collision-Free Book Extraction & Shelving State Machine
      if (choreoStage === 'idle' && queuedSlot !== presentedSlot) {
        choreoStage = 'retreat-current';
      }

      const currentRec = bookRecords[presentedSlot];
      const nextRec = bookRecords[queuedSlot];

      if (choreoStage === 'retreat-current' && currentRec) {
        currentRec.pose.z = THREE.MathUtils.damp(currentRec.pose.z, 0.56, 16, dt);
        currentRec.pose.scale = THREE.MathUtils.damp(currentRec.pose.scale, 1.0, 14, dt);
        if (Math.abs(currentRec.pose.z - 0.56) < 0.025) {
          choreoStage = 'turn-current';
        }
      } else if (choreoStage === 'turn-current' && currentRec) {
        currentRec.pose.yaw = THREE.MathUtils.damp(currentRec.pose.yaw, Math.PI * 0.5, 16, dt);
        if (Math.abs(currentRec.pose.yaw - Math.PI * 0.5) < 0.04) {
          choreoStage = 'shelve-current';
        }
      } else if (choreoStage === 'shelve-current' && currentRec) {
        currentRec.pose.z = THREE.MathUtils.damp(currentRec.pose.z, -0.64, 16, dt);
        if (Math.abs(currentRec.pose.z - (-0.64)) < 0.03) {
          currentRec.pose.z = -0.64;
          currentRec.pose.yaw = Math.PI * 0.5;
          presentedSlot = queuedSlot;
          choreoStage = 'extract-next';
        }
      } else if (choreoStage === 'extract-next' && currentRec) {
        if (queuedSlot !== presentedSlot) {
          choreoStage = 'shelve-current';
        } else {
          currentRec.pose.z = THREE.MathUtils.damp(currentRec.pose.z, 0.58, 15, dt);
          if (Math.abs(currentRec.pose.z - 0.58) < 0.03) {
            choreoStage = 'turn-next';
          }
        }
      } else if (choreoStage === 'turn-next' && currentRec) {
        if (queuedSlot !== presentedSlot) {
          choreoStage = 'retreat-current';
        } else {
          currentRec.pose.yaw = THREE.MathUtils.damp(currentRec.pose.yaw, 0, 14, dt);
          if (Math.abs(currentRec.pose.yaw) < 0.035) {
            choreoStage = 'settle-next';
          }
        }
      } else if (choreoStage === 'settle-next' && currentRec) {
        if (queuedSlot !== presentedSlot) {
          choreoStage = 'retreat-current';
        } else {
          currentRec.pose.z = THREE.MathUtils.damp(currentRec.pose.z, 0.40, 13, dt);
          currentRec.pose.scale = THREE.MathUtils.damp(currentRec.pose.scale, 1.035, 13, dt);
          if (Math.abs(currentRec.pose.z - 0.40) < 0.015) {
            currentRec.pose.z = 0.40;
            currentRec.pose.yaw = 0;
            currentRec.pose.scale = 1.035;
            choreoStage = 'idle';
          }
        }
      }

      // Pan the shelf horizontally so the active book is centered
      const focusRec = bookRecords[queuedSlot] || bookRecords[presentedSlot];
      shelfTargetX = focusRec ? -focusRec.x : 0;
      shelfScrollX = THREE.MathUtils.damp(shelfScrollX, shelfTargetX, 7.5, dt);
      booksGroup.position.x = shelfScrollX;
      shelfGroup.position.x = shelfScrollX * 0.35;

      // Hide shelf & neighbor books once deep in inspection mode (matching Complete Shelf)
      const hideShelfInInspect = focusProgress > 0.72;
      shelfGroup.visible = !hideShelfInInspect;

      bookRecords.forEach((rec) => {
        const isCurrentPresented = rec.index === presentedSlot;
        const isHovered = rec.index === hoveredSlot && !inspectionMode && !isCurrentPresented;
        rec.hover = THREE.MathUtils.damp(rec.hover, isHovered ? 1 : 0, 10, dt);

        rec.slotGroup.visible = !hideShelfInInspect || rec.index === activeSlotIndex || isCurrentPresented;

        if (!isCurrentPresented) {
          rec.pose.x = THREE.MathUtils.damp(rec.pose.x, 0, 10, dt);
          rec.pose.y = THREE.MathUtils.damp(rec.pose.y, rec.hover * 0.055, 10, dt);
          rec.pose.z = THREE.MathUtils.damp(rec.pose.z, -0.64 + rec.hover * 0.14, 10, dt);
          rec.pose.yaw = THREE.MathUtils.damp(rec.pose.yaw, Math.PI * 0.5, 10, dt);
          rec.pose.pitch = THREE.MathUtils.damp(rec.pose.pitch, 0, 10, dt);
          rec.pose.roll = THREE.MathUtils.damp(rec.pose.roll, 0, 10, dt);
          rec.pose.scale = THREE.MathUtils.damp(rec.pose.scale, 1.0, 10, dt);
        } else if (inspectionMode || focusProgress > 0.01) {
          const targetZ = THREE.MathUtils.lerp(0.40, 1.15, focusProgress);
          const targetYaw = THREE.MathUtils.lerp(0, inspectYaw, focusProgress);
          const targetPitch = THREE.MathUtils.lerp(0, inspectPitch, focusProgress);
          const targetScale = THREE.MathUtils.lerp(1.035, 1.12, focusProgress);
          rec.pose.x = THREE.MathUtils.damp(rec.pose.x, inspectPanX * focusProgress, 11, dt);
          rec.pose.y = THREE.MathUtils.damp(rec.pose.y, inspectPanY * focusProgress, 11, dt);
          rec.pose.z = THREE.MathUtils.damp(rec.pose.z, targetZ, 11, dt);
          rec.pose.yaw = THREE.MathUtils.damp(rec.pose.yaw, targetYaw, 11, dt);
          rec.pose.pitch = THREE.MathUtils.damp(rec.pose.pitch, targetPitch, 11, dt);
          rec.pose.scale = THREE.MathUtils.damp(rec.pose.scale, targetScale, 11, dt);
        } else if (choreoStage === 'idle') {
          rec.pose.x = THREE.MathUtils.damp(rec.pose.x, 0, 10, dt);
          rec.pose.y = THREE.MathUtils.damp(rec.pose.y, 0, 10, dt);
          rec.pose.z = THREE.MathUtils.damp(rec.pose.z, 0.40, 10, dt);
          rec.pose.yaw = THREE.MathUtils.damp(rec.pose.yaw, 0, 10, dt);
          rec.pose.pitch = THREE.MathUtils.damp(rec.pose.pitch, 0, 10, dt);
          rec.pose.scale = THREE.MathUtils.damp(rec.pose.scale, 1.035, 10, dt);
        }

        rec.bookRoot.position.set(rec.pose.x, rec.pose.y, rec.pose.z);
        rec.bookRoot.rotation.set(rec.pose.pitch, rec.pose.yaw, rec.pose.roll);
        rec.bookRoot.scale.setScalar(rec.pose.scale);

        if (rec.livingGlow) {
          rec.livingGlow.material.opacity = 0.09 + Math.sin(tSec * 2.1 + rec.index) * 0.045;
        }
      });

      // Camera Position & Left-Half Frustum Offset during Inspection Mode
      const targetCamZ = THREE.MathUtils.lerp(6.65, inspectDistance, focusProgress);
      const targetCamY = THREE.MathUtils.lerp(1.42, 1.38, focusProgress);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 8, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 8, dt);
      camera.lookAt(0, 1.28, 0.15);

      const desktopOffset = viewWidth > 860 ? viewWidth * 0.175 * focusProgress : 0;
      currentOffsetX = THREE.MathUtils.damp(currentOffsetX, desktopOffset, 8, dt);
      if (Math.abs(currentOffsetX) > 0.5) {
        camera.setViewOffset(viewWidth, viewHeight, currentOffsetX, 0, viewWidth, viewHeight);
      } else {
        camera.clearViewOffset();
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    r3fStage = {
      focusSlot(slotIdx, inspect = false) {
        queuedSlot = THREE.MathUtils.clamp(slotIdx, 0, totalCount - 1);
        if (inspect) {
          inspectYaw = -0.32;
          inspectPitch = 0.06;
          inspectPanX = 0;
          inspectPanY = 0;
        }
      },
      setInspection(enabled) {
        if (enabled) {
          inspectYaw = -0.32;
          inspectPitch = 0.06;
          inspectPanX = 0;
          inspectPanY = 0;
          inspectDistance = 4.35;
        }
      },
      zoomBy(delta) {
        inspectDistance = THREE.MathUtils.clamp(inspectDistance + delta, 2.85, 6.2);
      },
      resetInspectView() {
        inspectYaw = -0.32;
        inspectPitch = 0.06;
        inspectPanX = 0;
        inspectPanY = 0;
        inspectDistance = 4.35;
      },
      refreshTextures() {
        bookRecords.forEach((rec) => {
          const textures = createClothHardcoverTextures(rec.item, maxAnisotropy);
          if (rec.frontArtwork?.material) {
            rec.frontArtwork.material.map?.dispose?.();
            rec.frontArtwork.material.map = textures.frontMap;
            rec.frontArtwork.material.needsUpdate = true;
          }
          if (rec.backArtwork?.material) {
            rec.backArtwork.material.map?.dispose?.();
            rec.backArtwork.material.map = textures.backMap;
            rec.backArtwork.material.needsUpdate = true;
          }
          if (rec.spineArtwork?.material) {
            rec.spineArtwork.material.map?.dispose?.();
            rec.spineArtwork.material.map = textures.spineMap;
            rec.spineArtwork.material.needsUpdate = true;
          }
        });
      },
    };
  }
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
    selectedBook = books.find((book) => book.id === id) || allCatalogBooks.find((book) => book.id === id) || await api(`/books/${id}`);
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
    if (pageFlip) {
      try { pageFlip.destroy(); } catch { /* ignore */ }
      pageFlip = null;
    }
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
    const book = books.find((item) => item.id === Number(id)) || allCatalogBooks.find((item) => item.id === Number(id));
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
  if (!authToken && !guestOrderIds.length) return openAuth(false);
  try {
    const query = guestOrderIds.length ? `?ids=${guestOrderIds.join(',')}` : '';
    const orders = await api(`/orders${query}`);
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
  const formEl = event.currentTarget;
  const data = new FormData(formEl);
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
    formEl?.reset();
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
  clone.src = coverUrl || './covers/mekong-moon.svg';
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
  document.querySelector('#checkout-error').textContent = '';
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
  const formEl = event.currentTarget;
  const data = new FormData(formEl);
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
    formEl?.reset();
    document.querySelector('#product-dialog').close();
    await loadBooks();
    notify(t('common.success'));
  } catch (error) {
    document.querySelector('#product-error').textContent = lookupTranslation(`auth.${error.key}`) || error.message;
  }
}

async function submitOrder(event) {
  event.preventDefault();
  const formEl = event.currentTarget || document.querySelector('#checkout-form');
  const submitBtn = document.querySelector('#checkout-submit');
  document.querySelector('#checkout-error').textContent = '';
  if (!cart.length) {
    document.querySelector('#checkout-error').textContent = t('shop.emptyCart');
    return;
  }
  const data = new FormData(formEl);
  if (submitBtn) submitBtn.disabled = true;
  try {
    const result = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: data.get('customer_name'),
        phone: data.get('phone'),
        address: data.get('address'),
        items: cart.map((item) => ({ book_id: item.id, quantity: item.quantity })),
      }),
    });
    if (result?.id && !guestOrderIds.includes(Number(result.id))) {
      guestOrderIds.unshift(Number(result.id));
      localStorage.setItem('ebook-guest-orders', JSON.stringify(guestOrderIds.slice(0, 50)));
    }
    cart = [];
    saveCart();
    renderCart();
    updateAccount();
    formEl?.reset();
    document.querySelector('#cart-dialog').close();
    notify(t('shop.orderSuccess'));
    await loadBooks();
  } catch (error) {
    if (submitBtn) submitBtn.disabled = !cart.length;
    document.querySelector('#checkout-error').textContent = lookupTranslation(`shop.${error.key}`)
      || lookupTranslation(`auth.${error.key}`)
      || error.message;
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

  // "The Complete Shelf" Controls: Prev/Next, Pull-Forward Inspection, Zoom, Reset & Keyboard
  document.querySelector('#shelf-prev')?.addEventListener('click', () => {
    selectShelfSlot(activeSlotIndex - 1, inspectionMode);
  });
  document.querySelector('#shelf-next')?.addEventListener('click', () => {
    selectShelfSlot(activeSlotIndex + 1, inspectionMode);
  });
  document.querySelector('#shelf-inspect-toggle')?.addEventListener('click', () => {
    setInspectionMode(!inspectionMode);
  });
  document.querySelector('#inspect-zoom-in')?.addEventListener('click', () => {
    r3fStage?.zoomBy(-0.55);
  });
  document.querySelector('#inspect-zoom-out')?.addEventListener('click', () => {
    r3fStage?.zoomBy(0.55);
  });
  document.querySelector('#inspect-reset')?.addEventListener('click', () => {
    r3fStage?.resetInspectView();
  });
  document.querySelector('#inspect-return')?.addEventListener('click', () => {
    setInspectionMode(false);
  });

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectShelfSlot(activeSlotIndex - 1, inspectionMode);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectShelfSlot(activeSlotIndex + 1, inspectionMode);
    } else if (e.key === 'Enter' && document.activeElement?.id === 'hero-book') {
      e.preventDefault();
      setInspectionMode(!inspectionMode);
    } else if (e.key === 'Escape' && inspectionMode) {
      e.preventDefault();
      setInspectionMode(false);
    }
  });

  window.addEventListener('scroll', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sy = window.scrollY || 0;
    const headingOffset = Math.max(-18, Math.min(18, (sy - 320) * -0.04));
    document.documentElement.style.setProperty('--scroll-heading-y', `${headingOffset.toFixed(1)}px`);
  }, { passive: true });

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
    const langFile = currentLang === 'th' ? './th.json' : './lo.json';
    const [loadedStrings, loadedManifest] = await Promise.all([
      fetch(langFile).then((response) => response.json()),
      fetch('./shelf-manifest.json').then((response) => response.json()).catch(() => ({ items: [] })),
    ]);
    strings = loadedStrings;
    shelfManifest = loadedManifest;
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
