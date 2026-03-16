const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// === DATABASE ===
const DB_FILE = 'panzzx_db.json';
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      products: [],
      orders: [],
      settings: { rek: '1234567890', qris: '', password: 'PANZZ' }
    }, null, 2));
  }
}
function getDB() { initDB(); return JSON.parse(fs.readFileSync(DB_FILE)); }
function saveDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// === UPLOADS ===
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

// === API ===

app.get('/api/products', (req, res) => {
  const db = getDB();
  res.json(db.products.map(p => ({ ...p, file: p.file ? `/uploads/${path.basename(p.file)}` : null })));
});

app.get('/api/settings', (req, res) => {
  res.json({ rek: getDB().settings.rek, qris: getDB().settings.qris });
});

app.post('/api/order', upload.single('proof'), (req, res) => {
  const db = getDB();
  const { productId, buyerName, isFree } = req.body;
  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Produk hilang' });

  const order = {
    id: uuidv4(),
    productId, productName: product.name, buyerName: buyerName || 'Guest',
    proof: req.file ? '/uploads/' + req.file.filename : (isFree ? 'FREE_TASK' : null),
    status: isFree ? 'valid' : 'pending',
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  saveDB(db);
  res.json({ success: true, orderId: order.id });
});

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === getDB().settings.password) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get('/api/admin/orders', (req, res) => res.json(getDB().orders));

app.post('/api/admin/verify', (req, res) => {
  const db = getDB();
  const { orderId, status } = req.body;
  const order = db.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order hilang' });
  order.status = status;
  saveDB(db);
  res.json({ success: true });
});

app.post('/api/admin/products', upload.single('file'), (req, res) => {
  const db = getDB();
  const { name, price, desc, img, telegramLinks } = req.body;
  const isFree = (price === '0' || price.toLowerCase().includes('gratis'));
  let links = [];
  try { links = JSON.parse(telegramLinks || '[]').filter(l => l.trim() !== ''); } catch (e) {}

  const newProd = {
    id: uuidv4(), name, price, desc, img: img || '',
    file: req.file ? req.file.path : null,
    telegramLinks: isFree ? links : [], isFree
  };
  db.products.push(newProd);
  saveDB(db);
  res.json({ success: true, product: newProd });
});

app.post('/api/admin/settings', (req, res) => {
  const db = getDB();
  const { rek, qris, password } = req.body;
  if (rek) db.settings.rek = rek;
  if (qris) db.settings.qris = qris;
  if (password) db.settings.password = password;
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', (req, res) => {
  const db = getDB();
  db.products = db.products.filter(p => p.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 Panzzx V5 running on ${PORT}`));
