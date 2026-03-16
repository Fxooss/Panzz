let currentProduct = null;
let taskProgress = [];

// THEME
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    updateThemeIcon();
}
function updateThemeIcon() { document.querySelector('.theme-toggle').innerText = document.body.classList.contains('light-mode') ? '☀️' : '🌙'; }
if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); updateThemeIcon(); }

// RENDER PRODUCTS
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
        card.innerHTML = `
            <div class="product-image">${p.img ? `<img src="${p.img}">` : '<div class="placeholder-text">Preview</div>'}</div>
            <div class="product-info">
                <div class="product-title">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
                <span class="price-badge ${isFree ? 'free-badge' : ''}">${isFree ? 'GRATIS' : p.price}</span>
            </div>`;
        grid.appendChild(card);
    });
}

// DETAIL
function openDetail(p) {
    currentProduct = p;
    document.getElementById('detailImg').innerHTML = p.img ? `<img src="${p.img}">` : '<div class="placeholder-text">Preview</div>';
    document.getElementById('detailTitle').innerText = p.name;
    document.getElementById('detailDesc').innerText = p.desc;
    document.getElementById('detailPrice').innerText = p.price;
    
    const act = document.getElementById('actionWrapper');
    if (p.isFree) {
        act.innerHTML = `<button class="btn-action btn-free" onclick="startTask()">🎁 Klaim Gratis</button>`;
    } else {
        act.innerHTML = `<button class="btn-action btn-rek" onclick="actionRek()">Norek</button><button class="btn-action btn-qr" onclick="actionQR()">QRIS</button>`;
    }
    document.getElementById('detailModal').classList.add('active');
}
function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }

// PAID ACTIONS
async function actionRek() {
    const set = await (await fetch('/api/settings')).json();
    navigator.clipboard.writeText(set.rek);
    alert('Rek disalin: ' + set.rek);
    closeDetailModal();
    openVerif();
}
async function actionQR() {
    const set = await (await fetch('/api/settings')).json();
    if(!set.qris) return alert('QR belum di set');
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
    const fd = new FormData();
    fd.append('proof', document.getElementById('proofInput').files[0]);
    fd.append('productId', currentProduct.id);
    fd.append('buyerName', document.getElementById('buyerNameInput').value);
    if(await (await fetch('/api/order', { method: 'POST', body: fd })).ok) { alert('Terkirim!'); closeVerifModal(); openDashboard(); }
}

// TASK SYSTEM (SUB2UNLOCK)
function startTask() {
    closeDetailModal();
    const links = currentProduct.telegramLinks || [];
    if (links.length === 0) return alert('Task belum diset');

    taskProgress = new Array(links.length).fill(false);
    renderTaskList(links);
    document.getElementById('btnClaim').disabled = true;
    document.getElementById('taskModal').classList.add('active');
}

function renderTaskList(links) {
    const container = document.getElementById('taskListContainer');
    container.innerHTML = links.map((link, i) => `
        <div class="task-item ${taskProgress[i] ? 'completed' : ''}" id="task-${i}">
            <div class="task-status-icon">${taskProgress[i] ? '✓' : (i+1)}</div>
            <div class="task-content">
                <div class="task-name">Task ${i+1}</div>
                <div class="task-hint">${taskProgress[i] ? 'Completed' : 'Kunjungi link'}</div>
            </div>
            <button class="btn-go" onclick="openTaskLink(${i}, '${link}')">Go</button>
        </div>
    `).join('');
}

function openTaskLink(index, url) {
    window.open(url, '_blank');
    // Simulasi Verifikasi 1 detik
    setTimeout(() => {
        taskProgress[index] = true;
        renderTaskList(currentProduct.telegramLinks);
        checkAllTasks();
    }, 1000);
}

function checkAllTasks() {
    const allDone = taskProgress.every(x => x);
    if (allDone) document.getElementById('btnClaim').disabled = false;
}

async function claimFree() {
    const buyer = prompt('Nama/Username:');
    if(!buyer) return;
    const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentProduct.id, buyerName: buyer, isFree: true })
    });
    if(res.ok) { alert('Sukses!'); closeTaskModal(); openDashboard(); }
}
function closeTaskModal() { document.getElementById('taskModal').classList.remove('active'); }

// DASHBOARD
async function openDashboard() {
    const orders = await (await fetch('/api/admin/orders')).json();
    const body = document.getElementById('dashBody');
    body.innerHTML = orders.reverse().map(o => {
        let status = `<span style="color:orange">Pending</span>`;
        let download = '';
        if(o.status === 'valid') { status = `<span style="color:var(--accent)">Valid ✅</span>`; download = `<a href="/api/products" onclick="alert('Download started')" class="btn btn-sec" style="margin-top:10px; text-decoration:none; font-size:12px">📥 Download</a>`; }
        else if(o.status === 'rejected') { status = `<span style="color:red">Rejected</span>`; }
        return `<div style="background:var(--bg-secondary); padding:15px; border-radius:12px; margin-bottom:10px"><div style="display:flex; justify-content:space-between; margin-bottom:5px"><strong>${o.productName}</strong>${status}</div><small style="color:var(--text-secondary)">${o.buyerName}</small>${download}</div>`;
    }).join('');
    document.getElementById('dashboardModal').classList.add('active');
}
function closeDashboard() { document.getElementById('dashboardModal').classList.remove('active'); }

// LOGIN
function promptSellerLogin() { document.getElementById('loginSidebar').classList.add('active'); }
function closeSidebar() { document.getElementById('loginSidebar').classList.remove('active'); }
async function verifySeller() {
    if ((await (await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('sellerPass').value }) })).status === 200) window.location.href = 'admin.html';
    else alert('Salah!');
}

// Init
renderProducts();
