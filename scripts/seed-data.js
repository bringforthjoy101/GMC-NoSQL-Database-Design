// Sample Data Seeding Script
// Run: node scripts/seed-data.js

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ecommerce_initial';

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateProducts(count) {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Automotive'];
  const tags = ['sale', 'new', 'trending', 'featured', 'clearance', 'premium', 'eco-friendly', 'limited'];
  const products = [];

  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    products.push({
      _id: new ObjectId(),
      name: `${cat} Product ${i + 1}`,
      description: `High-quality ${cat.toLowerCase()} item for everyday use. Durable and affordable.`,
      price: parseFloat((Math.random() * 500 + 10).toFixed(2)),
      category: cat,
      tags: [tags[i % tags.length], tags[(i + 3) % tags.length]],
      sku: `SKU-${String(i + 1).padStart(6, '0')}`,
      stock: Math.floor(Math.random() * 500),
      imageUrl: `/images/product-${i + 1}.jpg`,
      attributes: {
        color: ['red', 'blue', 'black', 'white', 'green'][i % 5],
        size: ['S', 'M', 'L', 'XL'][i % 4],
        weight: parseFloat((Math.random() * 5 + 0.1).toFixed(2)),
        brand: `Brand${String.fromCharCode(65 + (i % 26))}`
      },
      ratings: {
        average: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        count: Math.floor(Math.random() * 500)
      },
      createdAt: randomDate(new Date('2024-01-01'), new Date('2025-01-01')),
      updatedAt: new Date()
    });
  }
  return products;
}

function generateUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      _id: new ObjectId(),
      email: `user${i + 1}@example.com`,
      firstName: `First${i + 1}`,
      lastName: `Last${i + 1}`,
      phone: `+1-555-${String(i + 1).padStart(4, '0')}`,
      addresses: [{
        type: i % 2 === 0 ? 'home' : 'work',
        street: `${i + 100} Main St`,
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
        isDefault: true
      }],
      paymentMethods: [{
        type: 'card',
        last4: String(1000 + i).slice(-4),
        expiryMonth: '12',
        expiryYear: '2027',
        isDefault: true
      }],
      preferences: {
        currency: 'USD',
        language: 'en',
        newsletter: i % 3 === 0
      },
      createdAt: randomDate(new Date('2024-01-01'), new Date('2025-01-01')),
      updatedAt: new Date()
    });
  }
  return users;
}

function generateOrders(count, userIds, productIds) {
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const orders = [];

  for (let i = 0; i < count; i++) {
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const price = parseFloat((Math.random() * 200 + 5).toFixed(2));
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({
        productId: productIds[Math.floor(Math.random() * productIds.length)],
        productName: `Product ${j + 1}`,
        sku: `SKU-${String(j + 1).padStart(6, '0')}`,
        price,
        quantity: qty,
        subtotal: parseFloat((price * qty).toFixed(2))
      });
    }

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const shipping = subtotal > 50 ? 0 : 9.99;
    const total = parseFloat((subtotal + tax + shipping).toFixed(2));

    const status = statuses[i % statuses.length];

    orders.push({
      _id: new ObjectId(),
      orderId: `ORD-${String(i + 1).padStart(8, '0')}`,
      userId: userIds[i % userIds.length],
      customerSnapshot: {
        email: `user${(i % userIds.length) + 1}@example.com`,
        firstName: `First${(i % userIds.length) + 1}`,
        lastName: `Last${(i % userIds.length) + 1}`,
        phone: `+1-555-${String((i % userIds.length) + 1).padStart(4, '0')}`
      },
      items,
      totals: { subtotal, tax, shipping, discount: 0, total },
      shippingAddress: {
        street: `${i + 100} Main St`,
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US'
      },
      status,
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Order placed'
      }],
      payment: {
        method: 'card',
        transactionId: `TXN-${String(i + 1).padStart(10, '0')}`,
        paidAt: new Date()
      },
      createdAt: randomDate(new Date('2024-06-01'), new Date('2025-01-01')),
      updatedAt: new Date()
    });
  }
  return orders;
}

async function seed() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`Seeding data into "${DB_NAME}"...`);

  const products = generateProducts(500);
  const users = generateUsers(100);
  const productIds = products.map(p => p._id);
  const userIds = users.map(u => u._id);
  const orders = generateOrders(1000, userIds, productIds);

  const pResult = await db.collection('products').insertMany(products);
  console.log(`  ✓ ${pResult.insertedCount} products inserted`);

  const uResult = await db.collection('users').insertMany(users);
  console.log(`  ✓ ${uResult.insertedCount} users inserted`);

  const oResult = await db.collection('orders').insertMany(orders);
  console.log(`  ✓ ${oResult.insertedCount} orders inserted`);

  console.log('\nSeeding complete!');
  await client.close();
}

seed().catch(err => { console.error('Seeding failed:', err); process.exit(1); });