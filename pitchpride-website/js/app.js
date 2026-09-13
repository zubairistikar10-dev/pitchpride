/* ============================================
   PITCH PRIDE OFFICIAL — app.js
   Firebase Firestore (data) + Cloudinary (photos)
   No paid database, no subscription to lapse.
   ============================================ */

/* ============ 1. PASTE YOUR OWN CONFIG HERE ============ */
// Firebase config — from Firebase Console > Project settings > Your apps
const firebaseConfig = {
    apiKey: "AIzaSyDjSHqeXT9mcAQPHJid_Lo2AiRSzcygqvI",
    authDomain: "pitchpride-7a6a9.firebaseapp.com",
    projectId: "pitchpride-7a6a9",
    storageBucket: "pitchpride-7a6a9.firebasestorage.app",
    messagingSenderId: "284559737116",
    appId: "1:284559737116:web:380206d4bcf2ff0ca3bad9"
};

// Cloudinary config — from cloudinary.com dashboard + your unsigned upload preset
const CLOUDINARY_CLOUD_NAME = "dpxyztc7";
const CLOUDINARY_UPLOAD_PRESET = "pitchpride_uploads";
/* ========================================================= */

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

const ADMIN_USER = 'naashithussain';
const ADMIN_PASS = 'pitchpride679';

const CATEGORIES = [
    'La Liga', 'Premier League', 'Serie A',
    'Bundesliga', 'Ligue 1', 'International',
    'Retro', 'F1 Tees', 'Hoodies',
    'Tracksuits', 'Rugby', 'Kids Set', 'Other'
];

/* ============ HELPERS ============ */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function initials(name) { return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(); }

function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
}

// Turns a Firestore query snapshot into a plain array of {id, ...fields}
function snapToList(snap) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ============ IMAGE UPLOAD (Cloudinary) ============ */
async function uploadImage(file, folder) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `pitchpride/${folder}`);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!data.secure_url) { toast('Image upload failed.'); return null; }
        return data.secure_url;
    } catch (e) {
        toast('Image upload failed.');
        return null;
    }
}

function setupUploadPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input) return;
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:4px;margin-top:8px;border:1px solid var(--line);">`;
        };
        reader.readAsDataURL(file);
    });
}

/* ============ PAGE NAV ============ */
function goTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.querySelectorAll('nav.main-nav button').forEach(b => {
        b.classList.toggle('active', b.dataset.go === page);
    });
    document.querySelector('nav.main-nav').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (page === 'shop') renderShop();
    if (page === 'gallery') renderGallery();
    if (page === 'admin') checkAdminSession();
}

document.body.addEventListener('click', e => {
    const el = e.target.closest('[data-go]');
    if (el) goTo(el.dataset.go);
});

document.querySelector('.nav-toggle').addEventListener('click', () => {
    document.querySelector('nav.main-nav').classList.toggle('open');
});

/* ============ CARD HTML ============ */
function cardHTML(p) {
    const img = p.image_url
        ? `<img src="${p.image_url}" alt="${p.name}">`
        : `<div class="placeholder">${initials(p.name)}</div>`;
    const fanPrice = p.price_fan ? `<div class="card-price-row"><span class="card-price-label">Fan</span> <span class="card-price-val">$${Number(p.price_fan).toFixed(0)}</span> <span class="card-price-cur">FJD</span></div>` : '';
    const matchPrice = p.price_match ? `<div class="card-price-row"><span class="card-price-label">Match</span> <span class="card-price-val">$${Number(p.price_match).toFixed(0)}</span> <span class="card-price-cur">FJD</span></div>` : '';
    return `
    <div class="card">
        <div class="card-img">${img}</div>
        <div class="card-body">
            <div class="card-cat">${p.category}</div>
            <div class="card-name">${p.name}</div>
            <div class="card-prices">${fanPrice}${matchPrice}</div>
            <div class="card-foot" style="margin-top:12px;">
                <button class="btn btn-outline btn-sm" data-go="contact">Enquire</button>
            </div>
        </div>
    </div>`;
}

/* ============ HOME ============ */
async function loadHome() {
    const snap = await db.collection('products').orderBy('created_at').limit(4).get();
    const products = snapToList(snap);
    document.getElementById('featured-grid').innerHTML = products.map(cardHTML).join('');

    document.getElementById('home-cat-strip').innerHTML =
        CATEGORIES.map(c => `<button class="cat-pill" data-cat-home="${c}">${c}</button>`).join('');
    document.querySelectorAll('[data-cat-home]').forEach(btn => {
        btn.addEventListener('click', () => { shopActiveCat = btn.dataset.catHome; goTo('shop'); });
    });
}

/* ============ SHOP ============ */
let shopActiveCat = 'All';

async function renderShop() {
    const pills = ['All', ...CATEGORIES];
    document.getElementById('shop-cat-strip').innerHTML = pills.map(c =>
        `<button class="cat-pill ${c === shopActiveCat ? 'active' : ''}" data-shopcat="${c}">${c}</button>`
    ).join('');
    document.querySelectorAll('[data-shopcat]').forEach(btn => {
        btn.addEventListener('click', () => { shopActiveCat = btn.dataset.shopcat; renderShop(); });
    });

    const snap = await db.collection('products').orderBy('created_at').get();
    let list = snapToList(snap);
    if (shopActiveCat !== 'All') list = list.filter(p => p.category === shopActiveCat);
    const q = (document.getElementById('shop-search')?.value || '').toLowerCase().trim();
    if (q) list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    document.getElementById('shop-grid').innerHTML = list.map(cardHTML).join('');
    document.getElementById('shop-empty').style.display = list.length ? 'none' : 'block';
}

document.addEventListener('input', e => { if (e.target.id === 'shop-search') renderShop(); });

/* ============ GALLERY ============ */
async function renderGallery() {
    await renderCustomerReviews();
    await renderProgress();
}

function customerReviewCardHTML(r) {
    return `
    <div class="gallery-card">
        <div class="gallery-card-img"><img src="${r.img}" alt="Customer review"></div>
        ${r.caption ? `<div class="gallery-card-caption">${r.caption}</div>` : ''}
    </div>`;
}

async function renderCustomerReviews() {
    const snap = await db.collection('customer_reviews').orderBy('created_at', 'desc').get();
    const list = snapToList(snap);
    const grid = document.getElementById('customer-reviews-grid');
    const empty = document.getElementById('customer-reviews-empty');
    grid.innerHTML = list.map(customerReviewCardHTML).join('');
    empty.style.display = list.length ? 'none' : 'block';
}

function progressCardHTML(pg) {
    const img = pg.img
        ? `<img src="${pg.img}" alt="${pg.title}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div style="width:100%;height:180px;background:var(--paper);display:flex;align-items:center;justify-content:center;color:var(--ink-dim);font-family:'Oswald',sans-serif;font-size:.8rem;letter-spacing:1px;">NO IMAGE YET</div>`;
    return `
    <div class="progress-card">
        <div class="progress-card-img">${img}</div>
        <div class="progress-card-body">
            <div class="progress-stage">${pg.stage}</div>
            <div class="progress-card-title">${pg.title}</div>
            ${pg.caption ? `<p class="progress-caption">${pg.caption}</p>` : ''}
            <div class="progress-date">${pg.date}</div>
        </div>
    </div>`;
}

async function renderProgress() {
    const snap = await db.collection('progress').orderBy('created_at', 'desc').get();
    const list = snapToList(snap);
    const grid = document.getElementById('progress-grid');
    const empty = document.getElementById('progress-empty');
    grid.innerHTML = list.map(progressCardHTML).join('');
    empty.style.display = list.length ? 'none' : 'block';
}

/* ============ CONTACT FORM ============ */
document.getElementById('enquiry-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await db.collection('enquiries').add({
            customer_name: document.getElementById('c-name').value.trim(),
            item_interest: document.getElementById('c-jersey').value.trim(),
            message: document.getElementById('c-msg').value.trim(),
            created_at: FieldValue.serverTimestamp(),
        });
        toast('Message sent — we will reply by Viber or Facebook.');
        e.target.reset();
    } catch (err) {
        toast('Something went wrong. Please try again.');
    }
});

/* ============ ADMIN AUTH ============ */
const lockScreen = document.getElementById('lock-screen');
const adminArea = document.getElementById('admin-area');

function checkAdminSession() {
    if (sessionStorage.getItem('pp_admin') === '1') showAdmin();
    else { lockScreen.style.display = 'block'; adminArea.style.display = 'none'; }
}

function showAdmin() {
    lockScreen.style.display = 'none';
    adminArea.style.display = 'block';
    document.getElementById('f-cat').innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
    setupUploadPreview('f-img-file', 'f-img-preview');
    setupUploadPreview('o-img-file', 'o-img-preview');
    setupUploadPreview('prog-img-file', 'prog-img-preview');
    setupUploadPreview('cr-img-file', 'cr-img-preview');
    renderCatalogTable();
    renderOrderTable();
    renderProgressTable();
    renderCReviewTable();
    renderMessageTable();
}

function attemptLogin() {
    const u = document.getElementById('user-input').value.trim();
    const p = document.getElementById('pass-input').value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem('pp_admin', '1');
        document.getElementById('login-error').textContent = '';
        showAdmin();
    } else {
        document.getElementById('login-error').textContent = 'Incorrect username or password.';
    }
}

document.getElementById('unlock-btn').addEventListener('click', attemptLogin);
document.getElementById('pass-input').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
document.getElementById('user-input').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

document.getElementById('lock-btn').addEventListener('click', () => {
    sessionStorage.removeItem('pp_admin');
    document.getElementById('user-input').value = '';
    document.getElementById('pass-input').value = '';
    lockScreen.style.display = 'block';
    adminArea.style.display = 'none';
});

document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

/* ============ ADMIN — CATALOG ============ */
async function renderCatalogTable() {
    const snap = await db.collection('products').orderBy('created_at').get();
    const list = snapToList(snap);
    const tbody = document.getElementById('product-table');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-dim);padding:30px;">No jerseys yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(p => `
    <tr data-id="${p.id}">
        <td>${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name}">`
            : `<div style="width:44px;height:44px;background:var(--paper);display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--ink-dim);border-radius:3px;">${initials(p.name)}</div>`
        }</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${p.price_fan ? '$' + Number(p.price_fan).toFixed(0) : '—'}</td>
        <td>${p.price_match ? '$' + Number(p.price_match).toFixed(0) : '—'}</td>
        <td><div class="row-actions">
            <button class="icon-btn" data-action="edit">Edit</button>
            <button class="icon-btn danger" data-action="delete">Delete</button>
        </div></td>
    </tr>`).join('');

    tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            await db.collection('products').doc(id).delete();
            renderCatalogTable(); toast('Jersey removed.');
        });
    });
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            const doc = await db.collection('products').doc(id).get();
            if (!doc.exists) return;
            const data = doc.data();
            document.getElementById('edit-id').value = id;
            document.getElementById('f-name').value = data.name;
            document.getElementById('f-cat').value = data.category;
            document.getElementById('f-price-fan').value = data.price_fan || '';
            document.getElementById('f-price-match').value = data.price_match || '';
            document.getElementById('f-img').value = data.image_url || '';
            if (data.image_url) document.getElementById('f-img-preview').innerHTML = `<img src="${data.image_url}" style="max-width:100%;max-height:120px;border-radius:4px;margin-top:8px;border:1px solid var(--line);">`;
            document.getElementById('form-title').textContent = 'Edit jersey';
            document.getElementById('submit-btn').textContent = 'Save changes';
            document.getElementById('cancel-edit').style.display = 'block';
        });
    });
}

document.getElementById('cancel-edit').addEventListener('click', resetCatalogForm);
function resetCatalogForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('f-img').value = '';
    document.getElementById('f-img-preview').innerHTML = '';
    document.getElementById('form-title').textContent = 'Add a new jersey';
    document.getElementById('submit-btn').textContent = 'Add jersey';
    document.getElementById('cancel-edit').style.display = 'none';
}

document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.textContent = 'Uploading...'; btn.disabled = true;

    let imageUrl = document.getElementById('f-img').value;
    const file = document.getElementById('f-img-file').files[0];
    if (file) imageUrl = await uploadImage(file, 'jerseys') || imageUrl;

    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('f-name').value.trim(),
        category: document.getElementById('f-cat').value,
        price_fan: document.getElementById('f-price-fan').value ? Number(document.getElementById('f-price-fan').value) : null,
        price_match: document.getElementById('f-price-match').value ? Number(document.getElementById('f-price-match').value) : null,
        image_url: imageUrl,
    };
    if (id) {
        await db.collection('products').doc(id).update(data);
        toast('Jersey updated.');
    } else {
        data.created_at = FieldValue.serverTimestamp();
        await db.collection('products').add(data);
        toast('Jersey added.');
    }

    btn.disabled = false;
    resetCatalogForm();
    renderCatalogTable();
});

document.getElementById('reset-btn').addEventListener('click', async () => {
    if (confirm('Reset catalog back to default jerseys?')) {
        const snap = await db.collection('products').get();
        const batchDelete = db.batch();
        snap.docs.forEach(d => batchDelete.delete(d.ref));
        await batchDelete.commit();

        const defaults = [
            { name: 'Madrid Home Kit', category: 'La Liga', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Barca Away Kit', category: 'La Liga', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Manchester Sky Kit', category: 'Premier League', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Liverpool Home Kit', category: 'Premier League', price_fan: 65, price_match: 98, image_url: '' },
            { name: 'Juventus Home Kit', category: 'Serie A', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'AC Milan Away Kit', category: 'Serie A', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Bayern Home Kit', category: 'Bundesliga', price_fan: 65, price_match: 96, image_url: '' },
            { name: 'Dortmund Home Kit', category: 'Bundesliga', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'PSG Home Kit', category: 'Ligue 1', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Marseille Home Kit', category: 'Ligue 1', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Argentina National', category: 'International', price_fan: 65, price_match: 95, image_url: '' },
            { name: 'Portugal Home', category: 'International', price_fan: 65, price_match: 98, image_url: '' },
            { name: 'Madrid 2002 Retro', category: 'Retro', price_fan: 75, price_match: null, image_url: '' },
            { name: 'Brazil 1998 Retro', category: 'Retro', price_fan: 75, price_match: null, image_url: '' },
            { name: 'Scuderia Team Tee', category: 'F1 Tees', price_fan: 45, price_match: null, image_url: '' },
            { name: 'Ferrari Polo', category: 'F1 Tees', price_fan: 50, price_match: null, image_url: '' },
            { name: 'Crest Pullover Hoodie', category: 'Hoodies', price_fan: 85, price_match: null, image_url: '' },
            { name: 'Training Tracksuit Set', category: 'Tracksuits', price_fan: 110, price_match: null, image_url: '' },
            { name: 'Pacific Rugby Jersey', category: 'Rugby', price_fan: 75, price_match: 90, image_url: '' },
            { name: 'Junior Home Kit Set', category: 'Kids Set', price_fan: 55, price_match: null, image_url: '' },
        ];
        const batchAdd = db.batch();
        defaults.forEach(item => {
            const ref = db.collection('products').doc();
            batchAdd.set(ref, { ...item, created_at: FieldValue.serverTimestamp() });
        });
        await batchAdd.commit();

        renderCatalogTable(); toast('Catalog reset.');
    }
});

/* ============ ADMIN — ORDER UPDATES ============ */
async function renderOrderTable() {
    const snap = await db.collection('orders').orderBy('updated_at', 'desc').get();
    const list = snapToList(snap);
    const tbody = document.getElementById('order-table');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--ink-dim);padding:30px;">No order updates yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(o => `
    <tr data-id="${o.id}">
        <td>${o.img ? `<img src="${o.img}" alt="order">` : '—'}</td>
        <td>${o.customer_ref}</td><td>${o.status}</td>
        <td>${o.note || '—'}</td>
        <td>${o.updated_at && o.updated_at.toDate ? o.updated_at.toDate().toISOString().slice(0, 10) : ''}</td>
        <td><div class="row-actions">
            <button class="icon-btn" data-oaction="edit">Edit</button>
            <button class="icon-btn danger" data-oaction="delete">Delete</button>
        </div></td>
    </tr>`).join('');

    tbody.querySelectorAll('[data-oaction="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            await db.collection('orders').doc(id).delete();
            renderOrderTable(); toast('Order update removed.');
        });
    });
    tbody.querySelectorAll('[data-oaction="edit"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            const doc = await db.collection('orders').doc(id).get();
            if (!doc.exists) return;
            const o = doc.data();
            document.getElementById('order-edit-id').value = id;
            document.getElementById('o-name').value = o.customer_ref;
            document.getElementById('o-status').value = o.status;
            document.getElementById('o-note').value = o.note || '';
            document.getElementById('o-img').value = o.img || '';
            if (o.img) document.getElementById('o-img-preview').innerHTML = `<img src="${o.img}" style="max-width:100%;max-height:120px;border-radius:4px;margin-top:8px;border:1px solid var(--line);">`;
            document.getElementById('order-form-title').textContent = 'Edit order update';
            document.getElementById('order-submit-btn').textContent = 'Save changes';
            document.getElementById('order-cancel-edit').style.display = 'block';
        });
    });
}

document.getElementById('order-cancel-edit').addEventListener('click', resetOrderForm);
function resetOrderForm() {
    document.getElementById('order-form').reset();
    document.getElementById('order-edit-id').value = '';
    document.getElementById('o-img').value = '';
    document.getElementById('o-img-preview').innerHTML = '';
    document.getElementById('order-form-title').textContent = 'Post an order update';
    document.getElementById('order-submit-btn').textContent = 'Post update';
    document.getElementById('order-cancel-edit').style.display = 'none';
}

document.getElementById('order-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('order-submit-btn');
    btn.textContent = 'Uploading...'; btn.disabled = true;
    let imgUrl = document.getElementById('o-img').value;
    const file = document.getElementById('o-img-file').files[0];
    if (file) imgUrl = await uploadImage(file, 'orders') || imgUrl;
    const id = document.getElementById('order-edit-id').value;
    const data = {
        customer_ref: document.getElementById('o-name').value.trim(),
        status: document.getElementById('o-status').value,
        note: document.getElementById('o-note').value.trim(),
        img: imgUrl,
        updated_at: FieldValue.serverTimestamp(),
    };
    if (id) { await db.collection('orders').doc(id).update(data); toast('Order update saved.'); }
    else { await db.collection('orders').add(data); toast('Order update posted.'); }
    btn.disabled = false;
    resetOrderForm();
    renderOrderTable();
});

/* ============ ADMIN — PACKAGE PROGRESS ============ */
async function renderProgressTable() {
    const snap = await db.collection('progress').orderBy('created_at', 'desc').get();
    const list = snapToList(snap);
    const tbody = document.getElementById('progress-table');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:30px;">No progress updates yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(pg => `
    <tr data-id="${pg.id}">
        <td>${pg.img ? `<img src="${pg.img}" alt="${pg.title}">` : '—'}</td>
        <td>${pg.title}</td><td>${pg.stage}</td><td>${pg.date}</td>
        <td><div class="row-actions">
            <button class="icon-btn" data-pgaction="edit">Edit</button>
            <button class="icon-btn danger" data-pgaction="delete">Delete</button>
        </div></td>
    </tr>`).join('');

    tbody.querySelectorAll('[data-pgaction="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            await db.collection('progress').doc(id).delete();
            renderProgressTable(); toast('Progress update removed.');
        });
    });
    tbody.querySelectorAll('[data-pgaction="edit"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            const doc = await db.collection('progress').doc(id).get();
            if (!doc.exists) return;
            const pg = doc.data();
            document.getElementById('prog-edit-id').value = id;
            document.getElementById('prog-title').value = pg.title;
            document.getElementById('prog-caption').value = pg.caption || '';
            document.getElementById('prog-img').value = pg.img || '';
            document.getElementById('prog-stage').value = pg.stage;
            if (pg.img) document.getElementById('prog-img-preview').innerHTML = `<img src="${pg.img}" style="max-width:100%;max-height:120px;border-radius:4px;margin-top:8px;border:1px solid var(--line);">`;
            document.getElementById('prog-submit-btn').textContent = 'Save changes';
            document.getElementById('prog-cancel-edit').style.display = 'block';
        });
    });
}

document.getElementById('prog-cancel-edit').addEventListener('click', resetProgressForm);
function resetProgressForm() {
    document.getElementById('progress-form').reset();
    document.getElementById('prog-edit-id').value = '';
    document.getElementById('prog-img').value = '';
    document.getElementById('prog-img-preview').innerHTML = '';
    document.getElementById('prog-submit-btn').textContent = 'Post update';
    document.getElementById('prog-cancel-edit').style.display = 'none';
}

document.getElementById('progress-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('prog-submit-btn');
    btn.textContent = 'Uploading...'; btn.disabled = true;
    let imgUrl = document.getElementById('prog-img').value;
    const file = document.getElementById('prog-img-file').files[0];
    if (file) imgUrl = await uploadImage(file, 'progress') || imgUrl;
    const id = document.getElementById('prog-edit-id').value;
    const data = {
        title: document.getElementById('prog-title').value.trim(),
        caption: document.getElementById('prog-caption').value.trim(),
        img: imgUrl,
        stage: document.getElementById('prog-stage').value,
        date: todayStr(),
    };
    if (id) {
        await db.collection('progress').doc(id).update(data);
        toast('Progress update saved.');
    } else {
        data.created_at = FieldValue.serverTimestamp();
        await db.collection('progress').add(data);
        toast('Progress update posted.');
    }
    btn.disabled = false;
    resetProgressForm();
    renderProgressTable();
});

/* ============ ADMIN — CUSTOMER REVIEWS ============ */
async function renderCReviewTable() {
    const snap = await db.collection('customer_reviews').orderBy('created_at', 'desc').get();
    const list = snapToList(snap);
    const tbody = document.getElementById('creview-table');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--ink-dim);padding:30px;">No customer reviews posted yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(r => `
    <tr data-id="${r.id}">
        <td>${r.img ? `<img src="${r.img}" alt="review">` : '—'}</td>
        <td>${r.caption || '—'}</td>
        <td>${r.created_at && r.created_at.toDate ? r.created_at.toDate().toISOString().slice(0, 10) : ''}</td>
        <td><div class="row-actions">
            <button class="icon-btn" data-craction="edit">Edit</button>
            <button class="icon-btn danger" data-craction="delete">Delete</button>
        </div></td>
    </tr>`).join('');

    tbody.querySelectorAll('[data-craction="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            await db.collection('customer_reviews').doc(id).delete();
            renderCReviewTable(); toast('Review removed.');
        });
    });
    tbody.querySelectorAll('[data-craction="edit"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            const doc = await db.collection('customer_reviews').doc(id).get();
            if (!doc.exists) return;
            const r = doc.data();
            document.getElementById('cr-edit-id').value = id;
            document.getElementById('cr-caption').value = r.caption || '';
            document.getElementById('cr-img').value = r.img || '';
            if (r.img) document.getElementById('cr-img-preview').innerHTML = `<img src="${r.img}" style="max-width:100%;max-height:120px;border-radius:4px;margin-top:8px;border:1px solid var(--line);">`;
            document.getElementById('cr-submit-btn').textContent = 'Save changes';
            document.getElementById('cr-cancel-edit').style.display = 'block';
        });
    });
}

document.getElementById('cr-cancel-edit').addEventListener('click', resetCReviewForm);
function resetCReviewForm() {
    document.getElementById('creview-form').reset();
    document.getElementById('cr-edit-id').value = '';
    document.getElementById('cr-img').value = '';
    document.getElementById('cr-img-preview').innerHTML = '';
    document.getElementById('cr-submit-btn').textContent = 'Post review';
    document.getElementById('cr-cancel-edit').style.display = 'none';
}

document.getElementById('creview-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('cr-submit-btn');
    btn.textContent = 'Uploading...'; btn.disabled = true;
    let imgUrl = document.getElementById('cr-img').value;
    const file = document.getElementById('cr-img-file').files[0];
    if (file) imgUrl = await uploadImage(file, 'reviews') || imgUrl;
    if (!imgUrl) { toast('Please select an image.'); btn.disabled = false; btn.textContent = 'Post review'; return; }
    const id = document.getElementById('cr-edit-id').value;
    const data = { caption: document.getElementById('cr-caption').value.trim(), img: imgUrl };
    if (id) {
        await db.collection('customer_reviews').doc(id).update(data);
        toast('Review updated.');
    } else {
        data.created_at = FieldValue.serverTimestamp();
        await db.collection('customer_reviews').add(data);
        toast('Review posted.');
    }
    btn.disabled = false;
    resetCReviewForm();
    renderCReviewTable();
});

/* ============ ADMIN — MESSAGES ============ */
async function renderMessageTable() {
    const snap = await db.collection('enquiries').orderBy('created_at', 'desc').get();
    const list = snapToList(snap);
    const tbody = document.getElementById('message-table');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-dim);padding:30px;">No messages yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map(m => `
    <tr data-id="${m.id}">
        <td>${m.customer_name || '—'}</td>
        <td>${m.item_interest || '—'}</td>
        <td>${m.message || '—'}</td>
        <td>${m.created_at && m.created_at.toDate ? m.created_at.toDate().toISOString().slice(0, 10) : ''}</td>
        <td><div class="row-actions">
            <button class="icon-btn danger" data-maction="delete">Delete</button>
        </div></td>
    </tr>`).join('');

    tbody.querySelectorAll('[data-maction="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('tr').dataset.id;
            await db.collection('enquiries').doc(id).delete();
            renderMessageTable(); toast('Message removed.');
        });
    });
}

/* ============ INIT ============ */
loadHome();
renderShop();
renderGallery();
