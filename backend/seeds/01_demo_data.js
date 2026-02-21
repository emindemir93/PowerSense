const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const regions = ['Marmara', 'Ege', 'İç Anadolu', 'Akdeniz', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];
const paymentMethods = ['credit_card', 'bank_transfer', 'cash', 'online_payment'];
const statuses = ['completed', 'shipped', 'pending', 'cancelled', 'returned'];
const statusWeights = [60, 20, 10, 5, 5]; // % probability

function weightedRandom(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.seed = async (knex) => {
  const existingUsers = await knex('users').count('* as count').first();
  if (parseInt(existingUsers.count) > 0) {
    console.log('⏭️  Seed atlandı: Veriler zaten mevcut');
    return;
  }

  // ─── Users ─────────────────────────────────────────────────────────────────
  const adminPwd = await bcrypt.hash('Admin123!', 12);
  const analystPwd = await bcrypt.hash('Analyst123!', 12);
  const viewerPwd = await bcrypt.hash('Viewer123!', 12);

  const users = [
    { id: uuidv4(), name: 'Admin Kullanıcı', email: 'admin@qlicksense.com', password_hash: adminPwd, role: 'admin', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Analist Kullanıcı', email: 'analyst@qlicksense.com', password_hash: analystPwd, role: 'analyst', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Görüntüleyici', email: 'viewer@qlicksense.com', password_hash: viewerPwd, role: 'viewer', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Mehmet Demir', email: 'mehmet@qlicksense.com', password_hash: analystPwd, role: 'analyst', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Ayşe Kaya', email: 'ayse@qlicksense.com', password_hash: viewerPwd, role: 'viewer', is_active: false, created_at: new Date(), updated_at: new Date() },
  ];
  await knex('users').insert(users);

  // ─── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { id: uuidv4(), name: 'Elektronik', color: '#00d4ff', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Mobilya', color: '#7c3aed', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Giyim', color: '#10b981', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Gıda', color: '#f59e0b', created_at: new Date(), updated_at: new Date() },
    { id: uuidv4(), name: 'Otomotiv', color: '#ef4444', created_at: new Date(), updated_at: new Date() },
  ];
  await knex('categories').insert(categories);

  const catMap = {};
  categories.forEach(c => catMap[c.name] = c.id);

  // ─── Products ──────────────────────────────────────────────────────────────
  const products = [
    { id: uuidv4(), name: 'MacBook Pro 16"', sku: 'ELEC-001', category_id: catMap['Elektronik'], price: 89999, stock: 50 },
    { id: uuidv4(), name: 'Samsung 65" 4K TV', sku: 'ELEC-002', category_id: catMap['Elektronik'], price: 34999, stock: 80 },
    { id: uuidv4(), name: 'iPhone 15 Pro', sku: 'ELEC-003', category_id: catMap['Elektronik'], price: 59999, stock: 120 },
    { id: uuidv4(), name: 'iPad Air 5. Nesil', sku: 'ELEC-004', category_id: catMap['Elektronik'], price: 24999, stock: 90 },
    { id: uuidv4(), name: 'PlayStation 5', sku: 'ELEC-005', category_id: catMap['Elektronik'], price: 19999, stock: 60 },
    { id: uuidv4(), name: 'AirPods Pro', sku: 'ELEC-006', category_id: catMap['Elektronik'], price: 8999, stock: 200 },
    { id: uuidv4(), name: 'Koltuk Takımı L', sku: 'MOB-001', category_id: catMap['Mobilya'], price: 45000, stock: 30 },
    { id: uuidv4(), name: 'Yatak Odası Seti', sku: 'MOB-002', category_id: catMap['Mobilya'], price: 62000, stock: 20 },
    { id: uuidv4(), name: 'Yemek Masası 6 Kişilik', sku: 'MOB-003', category_id: catMap['Mobilya'], price: 18500, stock: 45 },
    { id: uuidv4(), name: 'Ofis Koltuğu Ergonomik', sku: 'MOB-004', category_id: catMap['Mobilya'], price: 9800, stock: 75 },
    { id: uuidv4(), name: 'Erkek Takım Elbise', sku: 'GIY-001', category_id: catMap['Giyim'], price: 3500, stock: 150 },
    { id: uuidv4(), name: 'Bayan Trençkot', sku: 'GIY-002', category_id: catMap['Giyim'], price: 2800, stock: 120 },
    { id: uuidv4(), name: 'Spor Ayakkabı', sku: 'GIY-003', category_id: catMap['Giyim'], price: 1200, stock: 300 },
    { id: uuidv4(), name: 'Organik Zeytinyağı 5L', sku: 'GIDA-001', category_id: catMap['Gıda'], price: 450, stock: 500 },
    { id: uuidv4(), name: 'Kahve Çekirdek 1kg', sku: 'GIDA-002', category_id: catMap['Gıda'], price: 380, stock: 400 },
    { id: uuidv4(), name: 'Araba Lastiği Set', sku: 'OTO-001', category_id: catMap['Otomotiv'], price: 12000, stock: 100 },
    { id: uuidv4(), name: 'Motor Yağı 4L', sku: 'OTO-002', category_id: catMap['Otomotiv'], price: 800, stock: 600 },
    { id: uuidv4(), name: 'Araç Kamerası', sku: 'OTO-003', category_id: catMap['Otomotiv'], price: 2500, stock: 150 },
  ];

  const productRecords = products.map(p => ({ ...p, is_active: true, created_at: new Date(), updated_at: new Date() }));
  await knex('products').insert(productRecords);

  // ─── Customers ─────────────────────────────────────────────────────────────
  const customerNames = [
    'Tümer A.Ş.','Koçer Ltd.','Akgün Ticaret','Star Mağazaları','Demiroğlu Holding',
    'Nil Tekstil','Beta Yazılım','Anadolu Gıda','Güneş İnşaat','Mega Dağıtım',
    'Kartal Ticaret','Deniz Mobilya','Çetin A.Ş.','Yıldız Market','Tepe Teknoloji',
    'Atlas Holding','Pınar Gıda','Evren Ltd.','Doğan Ticaret','Küre Elektronik',
    'Şahin A.Ş.','Bulut Tekstil','Narın Gıda','Mega Mobilya','Fırat Ltd.',
    'Sarp Holding','Cenk Yazılım','Arı Mobilya','Tuna Gıda','Mavi Holding',
    'Akar Elektronik','Doruk Ticaret','Çınar Mobilya','Nur Tekstil','Ege Gıda',
    'Türkiz A.Ş.','Kavak Holding','Bulvar Mobilya','Sim Giyim','Vega Tech',
    'Kaplan Ticaret','Koza Mobilya','Lale Tekstil','Güven Holding','Baran Elektronik',
    'Ozan Gıda','Marti A.Ş.','Zen Giyim','Petek Teknoloji','Deniz Otomotiv',
  ];

  const customers = customerNames.map((name, i) => ({
    id: uuidv4(),
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}${i}@example.com`,
    phone: `05${randomInt(10, 59)}${randomInt(1000000, 9999999)}`,
    city: ['İstanbul','İzmir','Ankara','Bursa','Antalya','Trabzon','Diyarbakır'][i % 7],
    region: regions[i % regions.length],
    type: i % 3 === 0 ? 'individual' : 'corporate',
    is_active: i % 8 !== 0,
    created_at: randomDate(new Date('2022-01-01'), new Date()),
    updated_at: new Date(),
  }));

  await knex('customers').insert(customers);

  // ─── Orders ────────────────────────────────────────────────────────────────
  const orders = [];
  const orderItems = [];

  for (let i = 0; i < 500; i++) {
    const customer = customers[randomInt(0, customers.length - 1)];
    const orderId = uuidv4();
    const orderDate = randomDate(new Date('2022-01-01'), new Date('2024-02-19'));
    const numItems = randomInt(1, 4);
    let totalAmount = 0;
    const items = [];

    for (let j = 0; j < numItems; j++) {
      const product = products[randomInt(0, products.length - 1)];
      const qty = randomInt(1, 5);
      const unitPrice = parseFloat(product.price);
      const lineTotal = qty * unitPrice;
      totalAmount += lineTotal;
      items.push({
        id: uuidv4(),
        order_id: orderId,
        product_id: product.id,
        quantity: qty,
        unit_price: unitPrice,
        total_price: lineTotal,
      });
    }

    const discount = Math.random() < 0.2 ? totalAmount * 0.1 : 0;
    const tax = (totalAmount - discount) * 0.18;

    orders.push({
      id: orderId,
      order_number: `SIP-${orderDate.getFullYear()}-${String(i + 100).padStart(4, '0')}`,
      customer_id: customer.id,
      status: weightedRandom(statuses, statusWeights),
      total_amount: parseFloat((totalAmount - discount + tax).toFixed(2)),
      discount_amount: parseFloat(discount.toFixed(2)),
      tax_amount: parseFloat(tax.toFixed(2)),
      region: customer.region,
      payment_method: paymentMethods[randomInt(0, paymentMethods.length - 1)],
      order_date: orderDate,
      created_at: orderDate,
      updated_at: new Date(),
    });

    items.forEach(item => orderItems.push(item));
  }

  // Insert in batches
  for (let i = 0; i < orders.length; i += 50) {
    await knex('orders').insert(orders.slice(i, i + 50));
  }
  for (let i = 0; i < orderItems.length; i += 100) {
    await knex('order_items').insert(orderItems.slice(i, i + 100));
  }

  console.log(`✅ Seed tamamlandı: ${users.length} kullanıcı, ${categories.length} kategori, ${products.length} ürün, ${customers.length} müşteri, ${orders.length} sipariş, ${orderItems.length} sipariş kalemi`);
};
