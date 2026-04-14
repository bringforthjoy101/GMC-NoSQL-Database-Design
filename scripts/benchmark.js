// Performance Benchmark Queries
// Run: node scripts/benchmark.js

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ecommerce_initial';

async function benchmark(label, fn, iterations = 5) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const med = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  console.log(`  ${label}: avg=${avg.toFixed(2)}ms, median=${med.toFixed(2)}ms`);
  return { avg, median: med };
}

async function runBenchmarks() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('Running benchmarks...\n');

  // === PRODUCT QUERIES ===
  console.log('--- Product Queries ---');
  await benchmark('Find by category (indexed)', async () => {
    await db.collection('products').find({ category: 'Electronics' }).limit(20).toArray();
  });

  await benchmark('Full-text search (indexed)', async () => {
    await db.collection('products').find({ $text: { $search: 'high quality' } }).toArray();
  });

  await benchmark('Find by SKU (unique index)', async () => {
    await db.collection('products').findOne({ sku: 'SKU-000250' });
  });

  await benchmark('Find by tags (indexed)', async () => {
    await db.collection('products').find({ tags: 'trending' }).toArray();
  });

  await benchmark('Sort by price (indexed compound)', async () => {
    await db.collection('products').find({ category: 'Electronics' }).sort({ price: -1 }).limit(20).toArray();
  });

  // === ORDER QUERIES ===
  console.log('\n--- Order Queries ---');
  await benchmark('Find by userId (indexed)', async () => {
    await db.collection('orders').find({ userId: db.collection('users').findOne({}, { projection: { _id: 1 } }) }).sort({ createdAt: -1 }).limit(10).toArray();
  });

  await benchmark('Find by status (indexed)', async () => {
    await db.collection('orders').find({ status: 'shipped' }).sort({ createdAt: -1 }).limit(20).toArray();
  });

  await benchmark('Aggregate: revenue by category', async () => {
    await db.collection('orders').aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.category', totalRevenue: { $sum: '$items.subtotal' }, orderCount: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } }
    ]).toArray();
  });

  await benchmark('Aggregate: daily sales', async () => {
    await db.collection('orders').aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totals.total' }, orders: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]).toArray();
  });

  // === WRITE BENCHMARKS ===
  console.log('\n--- Write Benchmarks ---');
  await benchmark('Insert 100 orders', async () => {
    const orders = [];
    for (let i = 0; i < 100; i++) {
      orders.push({
        orderId: `BENCH-${Date.now()}-${i}`,
        userId: new (require('mongodb').ObjectId)(),
        items: [{ productId: new (require('mongodb').ObjectId)(), productName: 'Test', sku: 'SKU-TEST', price: 10, quantity: 1, subtotal: 10 }],
        totals: { subtotal: 10, tax: 0.8, shipping: 0, discount: 0, total: 10.8 },
        status: 'pending',
        statusHistory: [{ status: 'pending', timestamp: new Date(), note: 'Benchmark test' }],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await db.collection('orders').insertMany(orders);
  });

  await benchmark('Update 50 order statuses', async () => {
    const orderIds = (await db.collection('orders').find({}, { projection: { _id: 1 } }).limit(50).toArray()).map(o => o._id);
    await db.collection('orders').updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: 'processing', updatedAt: new Date() } }
    );
  });

  // Cleanup benchmark data
  await db.collection('orders').deleteMany({ orderId: { $regex: /^BENCH-/ } });
  console.log('\n  ✓ Benchmark data cleaned up');

  console.log('\nBenchmark complete!');
  await client.close();
}

runBenchmarks().catch(err => { console.error('Benchmark failed:', err); process.exit(1); });