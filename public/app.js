let currentProduct = null;

// Render Produk
async function renderProducts() {
    const res = await fetch('/api/products');
    const products = await res.json();
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openDetail(p);
        
        const imgHtml = p.img 
            ? `<img src="${p.img}" alt="${p.name}">` 
            : `<div class="placeholder-text">Classic Example</div>`;

        card.innerHTML = `
            <div class="product-image">${imgHtml}</div>
            <div class="product-info">
                <div class="product-title">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
            </div>`;
        grid.appendChild(card);
    });
}

function openDetail(p) {
    currentProduct = p;
    document.getElementById('detailImg').innerHTML = p.img ? `<img src="${p.img}">` : `<div class="placeholder-text">Classic Example</div>`;
    document.getElementById('detailTitle').innerText = p.name;
    document.getElementById('detailDesc').innerText = p.desc;
    document.getElementById('detailPrice').innerText = p.price;
    document.getElementById('detailModal').classList.add('active');
}
function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }

// Actions
async function actionRek() {
    const res = await fetch('/api/settings');
    const set = await res.json();
    navigator.clipboard.writeText(set.rek);
    alert('Nomor Rekening disalin: ' + set.rek);
    closeDetailModal();
    openVerif();
}

async function actionQR() {
    const res = await fetch('/api/settings');
    const set = await res.json();
    if(!set.qris) return alert('Seller belum set QRIS');
    window.open(set.qris, '_blank');
    closeDetailModal();
    openVerif();
}

// Verif Flow
function openVerif() {
    if(!currentProduct) return;
    document.getElementById('verifProdName').innerText = currentProduct.name;
    document.getElementById('verifModal').classList.add('active');
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'flex';
}
function closeVerif() { document.getElementById('verifModal').classList.remove('active'); }

const proofInput = document.getElementById('proofInput');
document.getElementById('uploadArea').onclick = () => proofInput.click();
proofInput.onchange = (e) => {
    const file = e.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('previewImg').style.display = 'block';
            document.getElementById('uploadArea').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

async function submitProof() {
    const buyerName = document.getElementById('buyerNameInput').value;
    const file = proofInput.files[0];
    if(!file) return alert('Upload bukti dulu');

    const fd = new FormData();
    fd.append('proof', file);
    fd.append('productId', currentProduct.id);
    fd.append('buyerName', buyerName);

    const res = await fetch('/api/order', { method: 'POST', body: fd });
    const result = await res.json();
    
    if(result.success) {
        alert('Bukti terkirim! Tunggu verifikasi.');
        closeVerif();
        openDashboard();
    } else {
        alert('Gagal kirim bukti.');
    }
}

// Dashboard
async function openDashboard() {
    const res = await fetch('/api/admin/orders'); // Pakai API yang sama (tanpa auth dulu buat simpel)
    const orders = await res.json();
    const body = document.getElementById('dashBody');
    
    // Filter hanya milik user ini (simulasi simple, karna gak ada login buyer)
    body.innerHTML = orders.reverse().map(o => {
        let status = `<span class="status-pending">Pending</span>`;
        let download = '';
        if(o.status === 'valid'){
            status = `<span class="status-valid">Valid</span>`;
            // Cari file produk
            download = `<a href="/api/products" onclick="alert('Cek email/file manager')" class="download-btn">📥 Download</a>`; // Placeholder
        } else if(o.status === 'rejected') {
            status = `<span class="status-invalid">Ditolak</span>`;
        }

        return `<div class="order-card">
            <div><strong>${o.productName}</strong><br><small>${o.buyerName}</small>${download}</div>
            ${status}
        </div>`;
    }).join('');

    document.getElementById('dashboardModal').classList.add('active');
}
function closeDashboard() { document.getElementById('dashboardModal').classList.remove('active'); }

// Login
function promptSellerLogin() { document.getElementById('loginSidebar').classList.add('active'); }
function closeSidebar() { document.getElementById('loginSidebar').classList.remove('active'); }
async function verifySeller() {
    const pass = document.getElementById('sellerPass').value;
    const res = await fetch('/api/admin/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ password: pass }) 
    });
    if(res.ok) window.location.href = 'admin.html';
    else alert('Password salah!');
}

// Init
renderProducts();
