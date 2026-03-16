const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// === DATABASE JSON ===
const DB_FILE = 'panzzx_db.json';
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      products: [],
      orders: [],
      settings: {
        rek: '1234567890 (Dana - Panzzx)',
        qris: '', // URL QRIS
        password: 'PANZZ' // Default Password
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  }
}
function getDB() { initDB(); return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// === UPLOADS SETUP ===
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));

// === API ROUTES ===

// 1. Get Products (Public)
app.get('/api/products', (req, res) => {
  const db = getDB();
  // Jangan kirim file path ke public, kirim URL saja
  const publicProds = db.products.map(p => ({
    ...p,
    file: p.file ? `/uploads/${path.basename(p.file)}` : null
  }));
  res.json(publicProds);
});

// 2. Get Settings (Rek/Qris) - Public
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json({ rek: db.settings.rek, qris: db.settings.qris });
});

// 3. Buyer: Submit Order
app.post('/api/order', upload.single('proof'), (req, res) => {
  const db = getDB();
  const { productId, buyerName } = req.body;
  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  const order = {
    id: uuidv4(),
    productId,
    productName: product.name,
    buyerName: buyerName || 'Anonymous',
    proof: '/uploads/' + req.file.filename,
    status: 'pending', // pending, valid, rejected
    createdAt: new Date().toISOString()
  };
  
  db.orders.push(order);
  saveDB(db);
  res.json({ success: true, orderId: order.id });
});

// 4. Seller: Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const db = getDB();
  if (password === db.settings.password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Password salah' });
  }
});

// 5. Seller: Get Orders
app.get('/api/admin/orders', (req, res) => {
  const db = getDB();
  res.json(db.orders);
});

// 6. Seller: Verify Order
app.post('/api/admin/verify', (req, res) => {
  const db = getDB();
  const { orderId, status } = req.body; // status: 'valid' or 'rejected'
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });
  
  order.status = status;
  saveDB(db);
  res.json({ success: true });
});

// 7. Seller: Add Product
app.post('/api/admin/products', upload.single('file'), (req, res) => {
  const db = getDB();
  const { name, price, desc, img } = req.body;
  
  const newProd = {
    id: uuidv4(),
    name,
    price,
    desc,
    img: img || '', // URL gambar
    file: req.file ? req.file.path : null
  };
  
  db.products.push(newProd);
  saveDB(db);
  res.json({ success: true, product: newProd });
});

// 8. Seller: Update Settings
app.post('/api/admin/settings', (req, res) => {
  const db = getDB();
  const { rek, qris, password } = req.body;
  if (rek) db.settings.rek = rek;
  if (qris) db.settings.qris = qris;
  if (password) db.settings.password = password;
  saveDB(db);
  res.json({ success: true });
});

// 9. Seller: Delete Product
app.delete('/api/admin/products/:id', (req, res) => {
    const db = getDB();
    db.products = db.products.filter(p => p.id !== req.params.id);
    saveDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 PanzzxAutoOrder running on port ${PORT}`));
