let currentProduct = null;
let taskTimer = null;

// THEME TOGGLE
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isDark = !document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = !document.body.classList.contains('light-mode');
    document.querySelector('.theme-toggle').innerText = isDark ? '🌙' : '☀️';
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') document.body.classList.add('light-mode');
    updateThemeIcon();
    renderProducts();
});

// PRODUCTS
async function renderProducts() {
    const res = await fetch('/api/products');
    const products = await res.json();
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openDetail(p);
        
        const isFree = (p.price === '0' || p.price.toLowerCase().includes('gratis'));
        const imgHtml = p.img 
            ? `<img src="${p.img}" alt="${p.name}">` 
            : `<div class="placeholder-text">Preview Image</div>`;
        const priceClass = isFree ? 'free-badge' : '';

        card.innerHTML = `
            <div class="product-image">${imgHtml}</div>
            <div class="product-info">
                <div class="product-title">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
                <span class="price-badge ${priceClass}">${isFree ? 'GRATIS' : p.price}</span>
            </div>`;
        grid.appendChild(card);
    });
}

function openDetail(p) {
    currentProduct = p;
    document.getElementById('detailImg').innerHTML = p.img ? `<img src="${p.img}">` : `<div class="placeholder-text">Preview Image</div>`;
    document.getElementById('detailTitle').innerText = p.name;
    document.getElementById('detailDesc').innerText = p.desc;
    document.getElementById('detailPrice').innerText = p.price;
    
    const actionWrapper = document.getElementById('actionWrapper');
    const isFree = (p.price === '0' || p.price.toLowerCase().includes('gratis'));

    if(isFree) {
        actionWrapper.innerHTML = `<button class="btn-action btn-free" onclick="startFreeTask()">🎯 Get for FREE</button>`;
    } else {
        actionWrapper.innerHTML = `
            <button class="btn-action btn-rek" onclick="actionRek()">Norek</button>
            <button class="btn-action btn-qr" onclick="actionQR()">QRIS</button>
        `;
    }
    
    document.getElementById('detailModal').classList.add('active');
}
function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }

// FREE TASK LOGIC
function startFreeTask() {
    closeDetailModal();
    // Reset UI
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('verifyTaskBtn').disabled = true;
    document.getElementById('timerText').innerText = "Wait 4 seconds...";
    document.getElementById('taskJoinBtn').href = currentProduct.telegramLink || '#';
    document.getElementById('taskModal').classList.add('active');

    // Start Timer Animation
    let timeLeft = 4;
    const interval = setInterval(() => {
        timeLeft--;
        document.getElementById('progressBar').style.width = ((4 - timeLeft) / 4 * 100) + '%';
        document.getElementById('timerText').innerText = `Wait ${timeLeft} seconds...`;
        
        if(timeLeft <= 0) {
            clearInterval(interval);
            document.getElementById('timerText').innerText = "Verification Ready!";
            document.getElementById('verifyTaskBtn').disabled = false;
        }
    }, 1000);
}

async function claimFreeProduct() {
    const buyerName = prompt("Masukkan nama/username untuk klaim:");
    if(!buyerName) return;

    const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            productId: currentProduct.id, 
            buyerName: buyerName, 
            isFree: true 
        })
    });

    if(res.ok) {
        alert('✅ Klaim berhasil! Cek dashboard untuk download.');
        document.getElementById('taskModal').classList.remove('active');
        openDashboard();
    } else {
        alert('Gagal klaim.');
    }
}

// PAID ACTIONS
async function actionRek() {
    const res = await fetch('/api/settings');
    const set = await res.json();
    navigator.clipboard.writeText(set.rek);
    alert('Nomor disalin: ' + set.rek);
    closeDetailModal();
    openVerif();
}

async function actionQR() {
    const res = await fetch('/api/settings');
    const set = await res.json();
    if(!set.qris) return alert('QR belum diset');
    window.open(set.qris, '_blank');
    closeDetailModal();
    openVerif();
}

// VERIF PAID
function openVerif() {
    document.getElementById('verifProdName').innerText = currentProduct.name;
    document.getElementById('verifModal').classList.add('active');
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
}
function closeVerifModal() { document.getElementById('verifModal').classList.remove('active'); }

document.getElementById('uploadArea').onclick = () => document.getElementById('proofInput').click();
document.getElementById('proofInput').onchange = (e) => {
    const file = e.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('previewImg').src = ev.target.result;
            document.getElementById('previewImg').style.display = 'block';
            document.getElementById('uploadArea').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

async function submitProof() {
    const buyerName = document.getElementById('buyerNameInput').value;
    const file = document.getElementById('proofInput').files[0];
    if(!file) return alert('Upload bukti dulu');

    const fd = new FormData();
    fd.append('proof', file);
    fd.append('productId', currentProduct.id);
    fd.append('buyerName', buyerName);

    const res = await fetch('/api/order', { method: 'POST', body: fd });
    if(res.ok) {
        alert('Bukti terkirim!');
        closeVerifModal();
        openDashboard();
    }
}

// DASHBOARD
async function openDashboard() {
    const res = await fetch('/api/admin/orders');
    const orders = await res.json();
    const body = document.getElementById('dashBody');
    
    body.innerHTML = orders.reverse().map(o => {
        let status = `<span style="color:orange">Pending</span>`;
        let download = '';
        
        if(o.status === 'valid') {
            status = `<span style="color:var(--accent)">Valid ✅</span>`;
            // Find product file
            download = `<a href="/api/products" onclick="alert('Download started')" class="btn-action btn-rek" style="margin-top:10px; text-decoration:none">📥 Download</a>`;
        } else if(o.status === 'rejected') {
            status = `<span style="color:red">Rejected</span>`;
        }

        return `<div style="background:var(--bg-secondary); padding:15px; border-radius:12px; margin-bottom:10px">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                <strong>${o.productName}</strong>
                ${status}
            </div>
            <small style="color:var(--text-secondary)">${o.buyerName}</small>
            ${download}
        </div>`;
    }).join('');

    document.getElementById('dashboardModal').classList.add('active');
}
function closeDashboard() { document.getElementById('dashboardModal').classList.remove('active'); }

// LOGIN
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
