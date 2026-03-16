let currentProdFile = null;

// Init
const fileDrop = document.getElementById('fileDrop');
const fileInput = document.getElementById('inpFile');

fileDrop.onclick = () => fileInput.click();
fileDrop.ondragover = (e) => { e.preventDefault(); fileDrop.style.background = '#e0e0e0'; };
fileDrop.ondragleave = () => { fileDrop.style.background = '#f0f2f5'; };
fileDrop.ondrop = (e) => {
    e.preventDefault();
    fileDrop.style.background = '#f0f2f5';
    handleFile(e.dataTransfer.files[0]);
};
fileInput.onchange = (e) => handleFile(e.target.files[0]);

function handleFile(f) {
    currentProdFile = f;
    fileDrop.innerText = "✅ " + f.name;
}

async function addProduct() {
    const fd = new FormData();
    fd.append('name', document.getElementById('inpName').value);
    fd.append('price', document.getElementById('inpPrice').value);
    fd.append('desc', document.getElementById('inpDesc').value);
    fd.append('img', document.getElementById('inpImg').value);
    if(currentProdFile) fd.append('file', currentProdFile);

    const res = await fetch('/api/admin/products', { method: 'POST', body: fd });
    if(res.ok) {
        alert('Produk ditambahkan!');
        loadProducts();
    }
}

async function loadProducts() {
    const res = await fetch('/api/products');
    const prods = await res.json();
    document.getElementById('adminProdList').innerHTML = prods.map(p => `
        <div class="product-item-admin">
            <span>${p.name} - ${p.price}</span>
            <button onclick="deleteProd('${p.id}')">Hapus</button>
        </div>
    `).join('');
}

async function deleteProd(id) {
    await fetch('/api/admin/products/' + id, { method: 'DELETE' });
    loadProducts();
}

// Orders
async function loadOrders() {
    const res = await fetch('/api/admin/orders');
    const orders = await res.json();
    document.getElementById('ordersList').innerHTML = orders.map(o => {
        if(o.status !== 'pending') return ''; // Hanya tampilkan pending
        
        return `
        <div class="order-item-admin">
            <h4>${o.productName}</h4>
            <p>Buyer: ${o.buyerName}</p>
            <img src="${o.proof}" style="max-width:100%;border-radius:8px;margin:10px 0">
            <div class="order-actions">
                <button class="btn-valid" onclick="verify('${o.id}', 'valid')">Valid</button>
                <button class="btn-invalid" onclick="verify('${o.id}', 'rejected')">Palsu</button>
            </div>
        </div>`;
    }).join('');
}

async function verify(id, status) {
    const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, status })
    });
    if(res.ok) {
        alert('Order diupdate!');
        loadOrders();
    }
}

// Settings
async function loadSettings() {
    const res = await fetch('/api/settings');
    const s = await res.json();
    document.getElementById('setRek').value = s.rek;
    document.getElementById('setQris').value = s.qris;
}

async function saveSettings() {
    const fd = {
        rek: document.getElementById('setRek').value,
        qris: document.getElementById('setQris').value,
        password: document.getElementById('setPass').value
    };
    await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fd)
    });
    alert('Settings saved!');
}

// Navigation
function showSection(id) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + id).classList.add('active');
    if(id === 'orders') loadOrders();
    if(id === 'products') loadProducts();
    if(id === 'settings') loadSettings();
}

function logout() { window.location.href = 'index.html'; }

// Auto load
loadProducts();
