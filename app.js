// =========================================================================
// NEXTECH GADGETS - STANDALONE FRONTEND + SIMULATED CRYPTOGRAPHIC BACKEND
// =========================================================================

const PRODUCTS_DATA = [
  { id: 1, name: 'AeroBuds Pro ANC', category: 'Audio', price: 149.99, rating: 4.8, stock: 25, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600', desc: 'Adaptive Hybrid Active Noise Cancellation with 36-hour battery life and spatial audio.' },
  { id: 2, name: 'ChronoPulse Ultra Watch', category: 'Wearables', price: 299.00, rating: 4.9, stock: 14, image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600', desc: 'Titanium AMOLED smartwatch with dual-frequency GPS, ECG sensor, and 14-day endurance.' },
  { id: 3, name: 'KeyForge 75% Mechanical', category: 'Peripherals', price: 129.50, rating: 4.7, stock: 19, image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600', desc: 'Hot-swappable gasket-mounted wireless mechanical keyboard with south-facing RGB.' },
  { id: 4, name: 'VoltCore 140W GaN Charger', category: 'Power', price: 79.99, rating: 4.6, stock: 40, image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600', desc: '4-port Gallium Nitride fast charger capable of powering two laptops simultaneously.' },
  { id: 5, name: 'VisionGlass AR Lite', category: 'Smart Home', price: 449.00, rating: 4.5, stock: 8, image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=600', desc: 'Lightweight 120Hz Micro-OLED wearable display for portable cinema and productivity.' },
  { id: 6, name: 'SonicBoom Mini 360', category: 'Audio', price: 89.00, rating: 4.7, stock: 32, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', desc: 'IP67 waterproof portable Bluetooth 5.4 speaker with dual passive bass radiators.' }
];

const DB_USERS_KEY = 'nextech_users_db_v1';
const SESSION_KEY = 'nextech_session_v1';
const CART_KEY = 'nextech_cart_v1';

let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let currentUser = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
let promoDiscount = 0;
let lockoutTimer = null;
let generatedOtp = null;

// --- SHA-256 CRYPTOGRAPHIC HELPER ---
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode('NEXTECH_SALT_2026_' + text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- SEED DEMO USER ---
async function initDB() {
  let users = JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
  if (!users.find(u => u.email === 'demo@nextech.io')) {
    users.push({
      id: 'usr_demo_01',
      name: 'Alex Mercer',
      email: 'demo@nextech.io',
      passwordHash: await sha256('Demo@1234'),
      securityQuestion: 'What was the name of your first gadget?',
      securityAnswerHash: await sha256('gameboy'),
      failedAttempts: 0,
      lockUntil: null
    });
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
  }
}

const getUsers = () => JSON.parse(localStorage.getItem(DB_USERS_KEY) || '[]');
const saveUsers = (users) => localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  updateAuthNav();
  updateCartBadge();
  renderHomeFeatured();
  renderProducts();
  navigate('home');
});

// --- NAVIGATION ---
function navigate(viewName) {
  if (viewName === 'checkout' && !currentUser) {
    showToast('Please log in to proceed to checkout.');
    viewName = 'login';
  }
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove('hidden');

  if (viewName === 'cart') renderCart();
  if (viewName === 'checkout') renderCheckoutSummary();
  window.scrollTo(0, 0);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function showAlert(elementId, msg, type = 'error') {
  const el = document.getElementById(elementId);
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
}

// --- PRODUCTS RENDERING ---
function createProductCard(p) {
  return `
    <div class="product-card">
      <img src="${p.image}" alt="${p.name}" onclick="viewProduct(${p.id})" />
      <div class="product-body">
        <div>
          <span class="product-cat">${p.category} • ★ ${p.rating}</span>
          <h3 class="product-title" onclick="viewProduct(${p.id})">${p.name}</h3>
        </div>
        <div>
          <div class="product-price">$${p.price.toFixed(2)}</div>
          <button class="btn btn-primary full-width" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
}

function renderHomeFeatured() {
  document.getElementById('home-featured-grid').innerHTML = PRODUCTS_DATA.slice(0, 3).map(createProductCard).join('');
}

function renderProducts() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  const cat = document.getElementById('category-filter')?.value || 'All';
  const sort = document.getElementById('sort-filter')?.value || 'default';

  let filtered = PRODUCTS_DATA.filter(p => {
    const matchesCat = cat === 'All' || p.category === cat;
    const matchesQuery = p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  document.getElementById('products-grid').innerHTML = filtered.length
    ? filtered.map(createProductCard).join('')
    : '<p class="muted">No gadgets match your search criteria.</p>';
}

function viewProduct(id) {
  const p = PRODUCTS_DATA.find(item => item.id === id);
  if (!p) return;
  document.getElementById('product-detail-container').innerHTML = `
    <img src="${p.image}" alt="${p.name}" />
    <div>
      <span class="badge">${p.category}</span>
      <h2 style="margin: 12px 0;">${p.name}</h2>
      <p class="muted">Rating: ★ ${p.rating} / 5.0 • In Stock (${p.stock} units)</p>
      <h3 style="color: var(--accent); font-size: 1.8rem; margin: 14px 0;">$${p.price.toFixed(2)}</h3>
      <p style="margin-bottom: 24px;">${p.desc}</p>
      <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Shopping Cart</button>
    </div>
  `;
  navigate('product-detail');
}

// --- CART & CHECKOUT ---
function addToCart(productId) {
  const existing = cart.find(item => item.id === productId);
  if (existing) existing.qty += 1;
  else cart.push({ id: productId, qty: 1 });
  saveCart();
  showToast('Added to cart!');
}

function updateQty(productId, delta) {
  const idx = cart.findIndex(item => item.id === productId);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cart-count').textContent = totalItems;
}

function getCartTotals() {
  let subtotal = 0;
  const detailedItems = cart.map(item => {
    const prod = PRODUCTS_DATA.find(p => p.id === item.id);
    if (!prod) return null;
    subtotal += prod.price * item.qty;
    return { ...prod, qty: item.qty };
  }).filter(Boolean);

  const discount = subtotal * promoDiscount;
  const total = Math.max(0, subtotal - discount);
  return { detailedItems, subtotal, discount, total };
}

function renderCart() {
  const { detailedItems, subtotal, discount, total } = getCartTotals();
  const container = document.getElementById('cart-container');

  if (!detailedItems.length) {
    container.innerHTML = `<div class="card"><p>Your cart is empty.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="navigate('products')">Browse Gadgets</button></div>`;
    return;
  }

  const itemsHtml = detailedItems.map(item => `
    <div class="cart-item">
      <div>
        <h4>${item.name}</h4>
        <span class="muted">$${item.price.toFixed(2)} each</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <button class="btn btn-sm btn-outline" onclick="updateQty(${item.id}, -1)">-</button>
        <span>${item.qty}</span>
        <button class="btn btn-sm btn-outline" onclick="updateQty(${item.id}, 1)">+</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div>${itemsHtml}</div>
    <div class="card">
      <h3>Order Summary</h3>
      <p class="muted" style="margin-top:10px;">Subtotal: $${subtotal.toFixed(2)}</p>
      <p class="muted">Discount: -$${discount.toFixed(2)}</p>
      <h3 style="margin: 12px 0;">Total: $${total.toFixed(2)}</h3>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input type="text" id="promo-code" placeholder="Promo (GADGET10)" style="margin:0;" />
        <button class="btn btn-outline" onclick="applyPromo()">Apply</button>
      </div>
      <button class="btn btn-primary full-width" onclick="navigate('checkout')">Proceed to Checkout</button>
    </div>
  `;
}

function applyPromo() {
  const code = document.getElementById('promo-code').value.trim().toUpperCase();
  if (code === 'GADGET10') {
    promoDiscount = 0.10;
    showToast('10% discount applied!');
    renderCart();
  } else {
    showToast('Invalid promo code. Try GADGET10.');
  }
}

function renderCheckoutSummary() {
  const { detailedItems, subtotal, discount, total } = getCartTotals();
  if (currentUser) document.getElementById('ship-name').value = currentUser.name;
  document.getElementById('checkout-summary').innerHTML = `
    <h3>Summary (${detailedItems.length} items)</h3>
    <hr style="border-color: var(--border); margin: 12px 0;" />
    ${detailedItems.map(i => `<p class="muted">${i.qty}x ${i.name} — $${(i.price * i.qty).toFixed(2)}</p>`).join('')}
    <hr style="border-color: var(--border); margin: 12px 0;" />
    <p>Subtotal: $${subtotal.toFixed(2)}</p>
    <p>Discount: -$${discount.toFixed(2)}</p>
    <h3 style="color: var(--accent); margin-top: 8px;">Total Payable: $${total.toFixed(2)}</h3>
  `;
}

function handleCheckout(e) {
  e.preventDefault();
  const orderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  cart = [];
  promoDiscount = 0;
  saveCart();
  showToast(`Order ${orderId} Confirmed! Thank you for shopping.`);
  navigate('home');
}

// --- AUTHENTICATION & PASSWORD SECURITY ---
function updateAuthNav() {
  const nav = document.getElementById('auth-nav');
  if (currentUser) {
    nav.innerHTML = `<span style="font-size:0.9rem;">Hi, <strong>${currentUser.name.split(' ')[0]}</strong></span> <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>`;
  } else {
    nav.innerHTML = `<button class="btn btn-sm btn-primary" onclick="navigate('login')">Log In</button>`;
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
  updateAuthNav();
  showToast('Logged out.');
  navigate('home');
}

function fillDemo() {
  document.getElementById('login-email').value = 'demo@nextech.io';
  document.getElementById('login-password').value = 'Demo@1234';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  const users = getUsers();
  const idx = users.findIndex(u => u.email === email);

  if (idx === -1) {
    showAlert('login-alert', 'Invalid email or password.', 'error');
    return;
  }

  const user = users[idx];
  const now = Date.now();

  if (user.lockUntil && user.lockUntil > now) {
    const secs = Math.ceil((user.lockUntil - now) / 1000);
    showAlert('login-alert', `Account locked. Try again in ${secs}s.`, 'error');
    startLockoutCountdown(secs);
    return;
  }

  const enteredHash = await sha256(password);
  if (enteredHash !== user.passwordHash) {
    user.failedAttempts = (user.failedAttempts || 0) + 1;
    if (user.failedAttempts >= 3) {
      user.lockUntil = now + 30000;
      user.failedAttempts = 0;
      saveUsers(users);
      showAlert('login-alert', 'Incorrect password 3 times. Account locked for 30s.', 'error');
      startLockoutCountdown(30);
      return;
    }
    saveUsers(users);
    const rem = 3 - user.failedAttempts;
    showAlert('login-alert', `Incorrect password. ${rem} attempt${rem > 1 ? 's' : ''} remaining.`, 'error');
    return;
  }

  user.failedAttempts = 0;
  user.lockUntil = null;
  saveUsers(users);

  currentUser = { id: user.id, name: user.name, email: user.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  document.getElementById('login-alert').classList.add('hidden');
  updateAuthNav();
  showToast(`Welcome back, ${currentUser.name}!`);
  navigate('home');
}

function startLockoutCountdown(seconds) {
  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true;
  clearInterval(lockoutTimer);
  let remaining = seconds;
  lockoutTimer = setInterval(() => {
    remaining -= 1;
    btn.textContent = `Locked (${remaining}s)`;
    if (remaining <= 0) {
      clearInterval(lockoutTimer);
      btn.disabled = false;
      btn.textContent = 'Log In';
      document.getElementById('login-alert').classList.add('hidden');
    }
  }, 1000);
}

function checkPasswordStrength(pwd) {
  const bar = document.getElementById('strength-bar');
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const widths = ['0%', '25%', '50%', '75%', '100%'];
  const colors = ['transparent', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  bar.style.width = widths[score];
  bar.style.background = colors[score];
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const securityQuestion = document.getElementById('signup-question').value;
  const securityAnswer = document.getElementById('signup-answer').value.trim().toLowerCase();

  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!strongRegex.test(password)) {
    showAlert('signup-alert', 'Password needs 8+ chars with uppercase, lowercase, number, and symbol.', 'error');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showAlert('signup-alert', 'An account with this email already exists.', 'error');
    return;
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    name,
    email,
    passwordHash: await sha256(password),
    securityQuestion,
    securityAnswerHash: await sha256(securityAnswer),
    failedAttempts: 0,
    lockUntil: null
  };

  users.push(newUser);
  saveUsers(users);

  currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  updateAuthNav();
  showToast('Account created & logged in!');
  navigate('home');
}

// --- FORGOT PASSWORD FLOW ---
function handleForgotStep1(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  const user = getUsers().find(u => u.email === email);

  if (!user) {
    showAlert('forgot-alert', 'No account found with that email address.', 'error');
    return;
  }

  generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById('forgot-step-1').classList.add('hidden');
  document.getElementById('forgot-step-2').classList.remove('hidden');
  document.getElementById('security-question-display').textContent = `Question: ${user.securityQuestion}`;
  showAlert('forgot-alert', `Simulated Email OTP: ${generatedOtp}`, 'success');
}

function toggleRecoveryLabel() {
  const method = document.getElementById('recovery-method').value;
  const qDisplay = document.getElementById('security-question-display');
  const label = document.getElementById('recovery-input-label');
  if (method === 'security') {
    qDisplay.classList.remove('hidden');
    label.textContent = 'Your Security Answer';
  } else {
    qDisplay.classList.add('hidden');
    label.textContent = 'Enter 6-Digit OTP';
  }
}

async function handleForgotStep2(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  const method = document.getElementById('recovery-method').value;
  const val = document.getElementById('recovery-value').value.trim();
  const newPassword = document.getElementById('reset-new-password').value;

  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (!user) return;

  if (method === 'otp') {
    if (val !== generatedOtp) {
      showAlert('forgot-alert', 'Invalid 6-digit OTP code.', 'error');
      return;
    }
  } else {
    const ansHash = await sha256(val.toLowerCase());
    if (ansHash !== user.securityAnswerHash) {
      showAlert('forgot-alert', 'Incorrect security question answer.', 'error');
      return;
    }
  }

  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!strongRegex.test(newPassword)) {
    showAlert('forgot-alert', 'New password does not meet security requirements.', 'error');
    return;
  }

  user.passwordHash = await sha256(newPassword);
  user.failedAttempts = 0;
  user.lockUntil = null;
  saveUsers(users);
  generatedOtp = null;

  showToast('Password updated! You can now log in.');
  document.getElementById('forgot-step-1').classList.remove('hidden');
  document.getElementById('forgot-step-2').classList.add('hidden');
  document.getElementById('forgot-alert').classList.add('hidden');
  navigate('login');
}