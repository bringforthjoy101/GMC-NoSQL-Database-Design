// Refactored Schema Setup for E-Commerce NoSQL Database (MongoDB)
// Includes sharding, replication config, and analytics collections
// Run: node scripts/setup-refactored.js

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ecommerce_refactored';

async function setup() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`Setting up refactored schema in "${DB_NAME}"...`);

  // Enable sharding on the database (requires mongos connection)
  try {
    await db.admin().command({ enableSharding: DB_NAME });
    console.log('  ✓ Sharding enabled on database');
  } catch (e) {
    console.log('  ⚠ Sharding command skipped (requires mongos). Run on sharded cluster for full setup.');
  }

  // Create collections with validation
  await db.createCollection('products', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'price', 'category', 'sku'],
        properties: {
          name: { bsonType: 'string' },
          description: { bsonType: 'string' },
          price: { bsonType: 'double', minimum: 0 },
          category: { bsonType: 'string' },
          subcategory: { bsonType: 'string' },
          tags: { bsonType: 'array', items: { bsonType: 'string' } },
          sku: { bsonType: 'string' },
          stock: { bsonType: 'int', minimum: 0 },
          imageUrl: { bsonType: 'string' },
          attributes: { bsonType: 'object' },
          ratings: { bsonType: 'object' },
          salesMetrics: {
            bsonType: 'object',
            properties: {
              totalSold: { bsonType: 'int' },
              last7DaysSold: { bsonType: 'int' },
              last30DaysSold: { bsonType: 'int' },
              revenueTotal: { bsonType: 'double' },
              revenueLast30Days: { bsonType: 'double' }
            }
          },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });
  console.log('  ✓ products collection created (with salesMetrics)');

  await db.createCollection('users', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'firstName', 'lastName'],
        properties: {
          email: { bsonType: 'string' },
          firstName: { bsonType: 'string' },
          lastName: { bsonType: 'string' },
          phone: { bsonType: 'string' },
          addresses: { bsonType: 'array' },
          paymentMethods: { bsonType: 'array' },
          preferences: { bsonType: 'object' },
          orderSummary: {
            bsonType: 'object',
            properties: {
              totalOrders: { bsonType: 'int' },
              totalSpent: { bsonType: 'double' },
              lastOrderDate: { bsonType: 'date' },
              averageOrderValue: { bsonType: 'double' }
            }
          },
          loyaltyTier: { enum: ['bronze', 'silver', 'gold', 'platinum'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });
  console.log('  ✓ users collection created (with orderSummary, loyaltyTier)');

  await db.createCollection('orders', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['orderId', 'userId', 'items', 'totals', 'status'],
        properties: {
          orderId: { bsonType: 'string' },
          userId: { bsonType: 'objectId' },
          customerSnapshot: { bsonType: 'object' },
          items: { bsonType: 'array' },
          totals: { bsonType: 'object' },
          shippingAddress: { bsonType: 'object' },
          status: { enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
          statusHistory: { bsonType: 'array' },
          payment: { bsonType: 'object' },
          analyticsSnapshot: { bsonType: 'object' },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' }
        }
      }
    }
  });
  console.log('  ✓ orders collection created (with analyticsSnapshot, denormalized category)');

  // Analytics collections
  await db.createCollection('dailySales');
  console.log('  ✓ dailySales analytics collection created');

  await db.createCollection('productDailyMetrics');
  console.log('  ✓ productDailyMetrics analytics collection created');

  await db.createCollection('categoryMonthlyMetrics');
  console.log('  ✓ categoryMonthlyMetrics analytics collection created');

  // Create indexes (initial + new analytics indexes)
  const products = db.collection('products');
  await products.createIndex({ category: 1, price: -1 }, { name: 'idx_category_price' });
  await products.createIndex({ sku: 1 }, { unique: true, name: 'idx_sku_unique' });
  await products.createIndex({ name: 'text', description: 'text' }, { name: 'idx_text_search' });
  await products.createIndex({ tags: 1 }, { name: 'idx_tags' });
  await products.createIndex({ createdAt: -1 }, { name: 'idx_created' });
  await products.createIndex({ 'salesMetrics.last30DaysSold': -1 }, { name: 'idx_trending' });
  await products.createIndex({ 'salesMetrics.revenueLast30Days': -1 }, { name: 'idx_revenue_trending' });
  console.log('  ✓ product indexes created (including analytics indexes)');

  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' });
  await users.createIndex({ firstName: 1, lastName: 1 }, { name: 'idx_name' });
  await users.createIndex({ loyaltyTier: 1 }, { name: 'idx_loyalty' });
  await users.createIndex({ 'orderSummary.totalSpent': -1 }, { name: 'idx_top_spenders' });
  console.log('  ✓ user indexes created (including loyalty & spend indexes)');

  const orders = db.collection('orders');
  await orders.createIndex({ orderId: 1 }, { unique: true, name: 'idx_orderId_unique' });
  await orders.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_user_date' });
  await orders.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_status_date' });
  await orders.createIndex({ createdAt: -1 }, { name: 'idx_created' });
  await orders.createIndex({ 'items.productId': 1 }, { name: 'idx_product_sales' });
  await orders.createIndex({ 'items.category': 1, createdAt: -1 }, { name: 'idx_category_sales' });
  await orders.createIndex({ 'analyticsSnapshot.dayOfWeek': 1, 'totals.total': -1 }, { name: 'idx_day_revenue' });
  console.log('  ✓ order indexes created (including category & analytics indexes)');

  const dailySales = db.collection('dailySales');
  await dailySales.createIndex({ date: -1 }, { unique: true, name: 'idx_date_unique' });
  await dailySales.createIndex({ totalRevenue: -1 }, { name: 'idx_revenue' });

  const productDailyMetrics = db.collection('productDailyMetrics');
  await productDailyMetrics.createIndex({ productId: 1, date: -1 }, { unique: true, name: 'idx_product_date' });
  await productDailyMetrics.createIndex({ date: -1, unitsSold: -1 }, { name: 'idx_daily_trending' });
  await productDailyMetrics.createIndex({ date: -1, revenue: -1 }, { name: 'idx_daily_revenue' });

  const categoryMonthlyMetrics = db.collection('categoryMonthlyMetrics');
  await categoryMonthlyMetrics.createIndex({ category: 1, year: -1, month: -1 }, { unique: true, name: 'idx_category_month' });
  await categoryMonthlyMetrics.createIndex({ year: -1, month: -1, totalRevenue: -1 }, { name: 'idx_month_revenue' });
  console.log('  ✓ analytics indexes created');

  // Enable sharding on collections (requires mongos)
  try {
    await db.admin().command({ shardCollection: `${DB_NAME}.products`, key: { category: 'hashed' } });
    console.log('  ✓ products sharded by category (hashed)');
  } catch (e) {
    console.log('  ⚠ Products sharding skipped (requires sharded cluster)');
  }

  try {
    await db.admin().command({ shardCollection: `${DB_NAME}.orders`, key: { createdAt: 1 } });
    console.log('  ✓ orders sharded by createdAt (ranged)');
  } catch (e) {
    console.log('  ⚠ Orders sharding skipped (requires sharded cluster)');
  }

  try {
    await db.admin().command({ shardCollection: `${DB_NAME}.productDailyMetrics`, key: { productId: 'hashed' } });
    console.log('  ✓ productDailyMetrics sharded by productId (hashed)');
  } catch (e) {
    console.log('  ⚠ Analytics sharding skipped (requires sharded cluster)');
  }

  console.log('\nRefactored schema setup complete!');
  console.log('\nReplication configuration (manual setup required):');
  console.log('  - 3-node replica set across availability zones');
  console.log('  - Users: readPreference=secondaryPreferred, writeConcern=majority');
  console.log('  - Orders: readPreference=primaryPreferred, writeConcern=majority');
  console.log('  - Analytics: readPreference=secondaryPreferred (eventual consistency acceptable)');

  await client.close();
}

setup().catch(err => { console.error('Setup failed:', err); process.exit(1); });