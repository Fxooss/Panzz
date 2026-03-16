// === AUTH CHECK ===
async function attemptLogin() {
    const pass = document.getElementById('adminPassInput').value;
    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
    });

    if (res.ok) {
        document.getElementById('adminLoginOverlay').style.display = 'none';
        initApp();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

// Check if already logged in this session (simple flag)
// Jika refresh halaman, minta password lagi demi keamanan, atau biarin aja gpp.

function initApp() {
    loadProducts();
    loadSettings();
    addLinkInput(); // Init 1 input link
}

// === VARS ===
let currentProdFile = null;
let linkCount = 0;

// File Drop
const fileDrop = document.getElementById('fileDrop');
const fileInput = document.getElementById('inpFile');
fileDrop.onclick = () => fileInput.click();
fileDrop.ondragover = (e) => { e.preventDefault(); fileDrop.style.borderColor = 'var(--accent)'; };
fileDrop.ondragleave = () => { fileDrop.style.borderColor = 'rgba(255,255,255,0.1)'; };
fileDrop.ondrop = (e) => {
    e.preventDefault();
    fileDrop.style.borderColor = 'rgba(255,255,255,0.1)';
    if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
};
fileInput.onchange = (e) => { if(e.target.files[0]) handleFile(e.target.files[0]); };

function handleFile(f) {
    currentProdFile = f;
    fileDrop.innerHTML = `✅ ${f.name}`;
    fileDrop.style.color = 'var(--accent)';
}

// Multi Link
function addLinkInput(val = '') {
    if (linkCount >= 10) return alert('Maksimal 10 link!');
    linkCount++;
    const c = document.getElementById('teleLinksContainer');
    const d = document.createElement('div');
    d.style.cssText = 'display:flex; gap:8px; margin-bottom:8px';
    d.id = `link-row-${linkCount}`;
    d.innerHTML = `
        <input type="text" placeholder="Link ${linkCount}" value="${val}" class="tele-inp" style="flex:1; padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:var(--bg-card); color:var(--text-primary)">
        <button type="button" onclick="removeLinkInput(${linkCount})" style="background:#ff4757; border:none; color:#fff; border-radius:8px; width:30px; cursor:pointer; font-weight:bold">X</button>
    `;
    c.appendChild(d);
}
function removeLinkInput(id) { const row = document.getElementById(`link-row-${id}`); if (row) row.remove(); }

// Add Product
async function addProduct() {
    const fd = new FormData();
    fd.append('name', document.getElementById('inpName').value);
    fd.append('price', document.getElementById('inpPrice').value);
    fd.append('desc', document.getElementById('inpDesc').value);
    fd.append('img', document.getElementById('inpImg').value);
    
    const links = Array.from(document.querySelectorAll('.tele-inp')).map(i => i.value.trim()).filter(v => v);
    fd.append('telegramLinks', JSON.stringify(links));

    if(currentProdFile) fd.append('file', currentProdFile);

    if (await (await fetch('/api/admin/products', { method: 'POST', body: fd })).ok) {
        alert('Saved!');
        loadProducts();
        // Reset Form
        document.getElementById('inpName').value = ''; 
        document.getElementById('inpPrice').value = '';
        document.getElementById('inpDesc').value = ''; 
        document.getElementById('inpImg').value = '';
        document.getElementById('inpFile').value = '';
        currentProdFile = null;
        fileDrop.innerHTML = '📂 Upload File'; fileDrop.style.color = 'var(--text-secondary)';
        document.getElementById('teleLinksContainer').innerHTML = ''; linkCount = 0;
        addLinkInput();
    }
}

async function loadProducts() {
    const prods = await (await fetch('/api/products')).json();
    const list = document.getElementById('adminProdList');
    list.innerHTML = prods.map(p => `
        <div class="product-item-admin" style="background:var(--bg-secondary); padding:12px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
            <div><strong>${p.name}</strong> <br><small style="color:var(--text-secondary)">${p.price}</small></div>
            <button onclick="deleteProd('${p.id}')" style="background:transparent; border:none; color:#ff4757; cursor:pointer">Hapus</button>
        </div>
    `).join('');
}

async function deleteProd(id) {
    if(confirm('Hapus?')) {
        await fetch('/api/admin/products/' + id, { method: 'DELETE' });
        loadProducts();
    }
}

// Orders
async function loadOrders() {
    const orders = await (await fetch('/api/admin/orders')).json();
    const list = document.getElementById('ordersList');
    list.innerHTML = orders.reverse().map(o => {
        if (o.status !== 'pending') return '';
        const imgHtml = (o.proof && o.proof !== 'FREE_TASK') 
            ? `<img src="${o.proof}" style="max-width:100%; border-radius:8px; margin:10px 0">` 
            : '<div style="padding:20px; background:var(--bg-card); border-radius:8px; margin:10px 0; text-align:center">✅ FREE TASK CLAIM</div>';
        return `
        <div style="background:var(--bg-card); padding:16px; border-radius:12px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.05)">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px"><strong style="color:var(--accent)">${o.productName}</strong></div>
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:5px">Buyer: ${o.buyerName}</p>
            ${imgHtml}
            <div style="display:flex; gap:10px; margin-top:10px">
                <button class="btn" style="flex:1; background:var(--accent); color:#000" onclick="verify('${o.id}', 'valid')">✅ Valid</button>
                <button class="btn" style="flex:1; background:#ff4757; color:#fff" onclick="verify('${o.id}', 'rejected')">❌ Palsu</button>
            </div>
        </div>`;
    }).join('');
}

async function verify(id, status) {
    await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: id, status }) });
    alert('Updated!'); loadOrders();
}

// Settings
async function loadSettings() {
    const s = await (await fetch('/api/settings')).json();
    document.getElementById('setRek').value = s.rek || '';
    document.getElementById('setQris').value = s.qris || '';
}
async function saveSettings() {
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rek: document.getElementById('setRek').value, qris: document.getElementById('setQris').value, password: document.getElementById('setPass').value }) });
    alert('Saved!');
}

// Nav
function showSection(id) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + id).classList.add('active');
    if(id === 'orders') loadOrders();
    if(id === 'products') loadProducts();
    if(id === 'settings') loadSettings();
}
function logout() { window.location.href = 'index.html'; }
